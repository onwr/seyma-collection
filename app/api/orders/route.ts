import { NextResponse } from "next/server"
import { after } from "next/server"
import {
  PaymentMethod,
  PaymentStatus,
  StockMovementType,
} from "@/generated/prisma/client"
import { getUserIdFromCookies } from "@/lib/authSession"
import { toNumber } from "@/lib/cart"
import { checkoutBodySchema } from "@/lib/checkoutSchema"
import { resolveCartIdentity } from "@/lib/cartSession"
import { getIdempotentResponse, setIdempotentResponse } from "@/lib/checkoutIdempotency"
import { getClientIp, rateLimitCheckout } from "@/lib/checkoutRateLimit"
import {
  calculatePriceSummary,
  moneyString,
} from "@/lib/checkoutTotals"
import { generateOrderNoCandidate } from "@/lib/orderNo"
import { prisma } from "@/lib/prisma"
import { getShippingSettings } from "@/lib/shippingSettings"
import { getPaytrToken } from "@/lib/paytr"
import { orderPlacedEmailContent } from "@/lib/emails/orderPlaced"
import { sendMail } from "@/lib/smtpSettings"


function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  )
}

type ComputedLine = {
  cartItemId: number
  productId: number
  variantId: number | null
  productName: string
  variantName: string
  sku: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
}

export async function GET() {
  try {
    const userId = await getUserIdFromCookies()
    if (!userId) {
      return NextResponse.json({ message: "Giris gerekli." }, { status: 401 })
    }

    const rows = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        orderNo: true,
        createdAt: true,
        status: true,
        paymentStatus: true,
        grandTotal: true,
        _count: { select: { items: true } },
      },
    })

    return NextResponse.json({
      orders: rows.map((o) => ({
        orderNo: o.orderNo,
        createdAt: o.createdAt.toISOString(),
        status: o.status,
        paymentStatus: o.paymentStatus,
        grandTotal: moneyString(toNumber(o.grandTotal)),
        itemCount: o._count.items,
      })),
    })
  } catch (error) {
    console.error("GET /api/orders error:", error)
    return NextResponse.json(
      { message: "Siparisler yuklenirken hata olustu." },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    if (!rateLimitCheckout(ip)) {
      return NextResponse.json(
        { message: "Cok fazla istek. Lutfen kisa bir sure sonra tekrar deneyin." },
        { status: 429 }
      )
    }

    const idempotencyKey = request.headers.get("idempotency-key")?.trim()
    if (idempotencyKey) {
      if (idempotencyKey.length < 8 || idempotencyKey.length > 128) {
        return NextResponse.json(
          { message: "Idempotency-Key gecersiz (8-128 karakter)." },
          { status: 400 }
        )
      }
      const cached = getIdempotentResponse(idempotencyKey)
      if (cached) {
        return new NextResponse(cached, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }
    }

    const identity = await resolveCartIdentity()
    if (identity.kind === "none") {
      return NextResponse.json(
        { message: "Sepetiniz bos veya oturum bulunamadi." },
        { status: 400 }
      )
    }
    if (identity.kind !== "user") {
      return NextResponse.json(
        { message: "Siparis vermek icin uye girisi yapmalisiniz." },
        { status: 401 }
      )
    }

    const json = (await request.json()) as unknown
    const parsed = checkoutBodySchema.safeParse(json)
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Gecersiz form verisi."
      return NextResponse.json({ message: msg }, { status: 400 })
    }
    const body = parsed.data

    const userId = identity.userId
    const user = await prisma.user.findUnique({ where: { id: userId } })

    const cart = await prisma.cart.findUnique({
      where: { userId: identity.userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                basePrice: true,
                isActive: true,
                variants: { select: { id: true } },
              },
            },
            variant: {
              select: { id: true, name: true, sku: true, price: true, stock: true },
            },
          },
        },
      },
    })

    if (!cart?.items.length) {
      return NextResponse.json({ message: "Sepetiniz bos." }, { status: 400 })
    }

    const computed: ComputedLine[] = []

    for (const row of cart.items) {
      const product = row.product
      if (!product.isActive) {
        return NextResponse.json(
          { message: `Urun artik satista degil: ${product.name}` },
          { status: 400 }
        )
      }

      const variantCount = product.variants.length
      if (row.variantId) {
        if (!row.variant || row.variant.id !== row.variantId) {
          return NextResponse.json(
            { message: "Sepet satirinda gecersiz varyant." },
            { status: 400 }
          )
        }
        if (row.quantity > row.variant.stock) {
          return NextResponse.json(
            { message: `Yetersiz stok: ${product.name}` },
            { status: 400 }
          )
        }
        const unitPrice = toNumber(row.variant.price)
        computed.push({
          cartItemId: row.id,
          productId: product.id,
          variantId: row.variantId,
          productName: product.name,
          variantName: row.variant.name,
          sku: row.variant.sku,
          quantity: row.quantity,
          unitPrice,
          lineTotal: unitPrice * row.quantity,
        })
      } else {
        if (variantCount > 0) {
          return NextResponse.json(
            { message: "Varyantli urun icin sepet guncellenemedi. Lutfen sepeti yenileyin." },
            { status: 400 }
          )
        }
        const unitPrice = toNumber(product.basePrice)
        computed.push({
          cartItemId: row.id,
          productId: product.id,
          variantId: null,
          productName: product.name,
          variantName: "Standart",
          sku: null,
          quantity: row.quantity,
          unitPrice,
          lineTotal: unitPrice * row.quantity,
        })
      }
    }

    const subtotal = computed.reduce((s, l) => s + l.lineTotal, 0)

    const { threshold, cost } = await getShippingSettings(prisma)

    // Kupon doğrulama (Eğer varsa)
    let discountAmount = 0
    if (body.couponCode) {
        const coupon = await prisma.coupon.findFirst({
            where: { code: body.couponCode.toUpperCase(), isActive: true }
        })
        if (coupon) {
            const val = Number(coupon.value)
            if (coupon.type === "PERCENTAGE") {
                discountAmount = (subtotal * val) / 100
                if (coupon.maxDiscount && discountAmount > Number(coupon.maxDiscount)) {
                    discountAmount = Number(coupon.maxDiscount)
                }
            } else {
                discountAmount = val
            }
        }
    }

    const totals = calculatePriceSummary(subtotal, discountAmount, threshold, cost)
    const shippingCost = totals.shipping
    const grandTotal = totals.grandTotal
    const discountTotal = totals.discount

    type AddrSnap = {
      fullName: string
      phone: string
      line1: string
      line2: string | null
      district: string
      city: string
      postalCode: string
      country: string
    }

    let ship: AddrSnap = {
      fullName: body.shippingFullName.trim(),
      phone: body.shippingPhone.trim(),
      line1: body.shippingLine1.trim(),
      line2: body.shippingLine2?.trim() || null,
      district: body.shippingDistrict.trim(),
      city: body.shippingCity.trim(),
      postalCode: body.shippingPostalCode.trim(),
      country: body.shippingCountry.trim(),
    }

    let shippingAddressIdForOrder: number | null = null
    let billingAddressIdForOrder: number | null = null

    if (userId && body.shippingAddressId != null) {
      const a = await prisma.address.findFirst({
        where: { id: body.shippingAddressId, userId },
      })
      if (!a) {
        return NextResponse.json(
          { message: "Teslimat adresi bulunamadi veya size ait degil." },
          { status: 400 }
        )
      }
      shippingAddressIdForOrder = a.id
      ship = {
        fullName: a.fullName,
        phone: a.phone,
        line1: a.line1,
        line2: a.line2 ?? null,
        district: a.district,
        city: a.city,
        postalCode: a.postalCode,
        country: a.country,
      }
    }

    let bill: AddrSnap
    if (body.billingSameAsShipping) {
      bill = { ...ship }
      if (userId && shippingAddressIdForOrder != null) {
        billingAddressIdForOrder = shippingAddressIdForOrder
      }
    } else if (userId && body.billingAddressId != null) {
      const b = await prisma.address.findFirst({
        where: { id: body.billingAddressId, userId },
      })
      if (!b) {
        return NextResponse.json(
          { message: "Fatura adresi bulunamadi veya size ait degil." },
          { status: 400 }
        )
      }
      billingAddressIdForOrder = b.id
      bill = {
        fullName: b.fullName,
        phone: b.phone,
        line1: b.line1,
        line2: b.line2 ?? null,
        district: b.district,
        city: b.city,
        postalCode: b.postalCode,
        country: b.country,
      }
    } else {
      bill = {
        fullName: body.billingFullName!.trim(),
        phone: body.billingPhone!.trim(),
        line1: body.billingLine1!.trim(),
        line2: body.billingLine2?.trim() || null,
        district: body.billingDistrict!.trim(),
        city: body.billingCity!.trim(),
        postalCode: body.billingPostalCode!.trim(),
        country: (body.billingCountry ?? "TR").trim(),
      }
    }

    const billing = {
      billingFullName: bill.fullName,
      billingPhone: bill.phone,
      billingLine1: bill.line1,
      billingLine2: bill.line2,
      billingDistrict: bill.district,
      billingCity: bill.city,
      billingPostalCode: bill.postalCode,
      billingCountry: bill.country,
    }

    const paymentMethod = 
      body.paymentMethod === "CASH_ON_DELIVERY"
        ? PaymentMethod.CASH_ON_DELIVERY
        : body.paymentMethod === "CREDIT_CARD"
        ? PaymentMethod.CARD
        : PaymentMethod.BANK_TRANSFER

    const noteTrim = body.note?.trim() || null

    const result = await prisma.$transaction(
      async (tx) => {
        let orderNo = generateOrderNoCandidate()
        let orderId: number | null = null

        for (let attempt = 0; attempt < 10; attempt++) {
          try {
            const order = await tx.order.create({
              data: {
                userId,
                orderNo,
                subtotal: moneyString(subtotal),
                shippingCost: moneyString(shippingCost),
                discountTotal: moneyString(discountTotal),
                grandTotal: moneyString(grandTotal),
                note: noteTrim,
                guestEmail: null,
                guestPhone: null,
                shippingFullName: ship.fullName,
                shippingPhone: ship.phone,
                shippingLine1: ship.line1,
                shippingLine2: ship.line2,
                shippingDistrict: ship.district,
                shippingCity: ship.city,
                shippingPostalCode: ship.postalCode,
                shippingCountry: ship.country,
                billingSameAsShipping: body.billingSameAsShipping,
                billingFullName: billing.billingFullName,
                billingPhone: billing.billingPhone,
                billingLine1: billing.billingLine1,
                billingLine2: billing.billingLine2,
                billingDistrict: billing.billingDistrict,
                billingCity: billing.billingCity,
                billingPostalCode: billing.billingPostalCode,
                billingCountry: billing.billingCountry,
                shippingAddressId: shippingAddressIdForOrder,
                billingAddressId: billingAddressIdForOrder,
                paymentStatus: PaymentStatus.PENDING,
              },
              select: { id: true },
            })
            orderId = order.id
            break
          } catch (e) {
            if (isUniqueViolation(e) && attempt < 9) {
              orderNo = generateOrderNoCandidate()
              continue
            }
            throw e
          }
        }

        if (orderId === null) {
          throw new Error("ORDER_NO_FAILED")
        }

        for (const line of computed) {
          await tx.orderItem.create({
            data: {
              orderId,
              productId: line.productId,
              variantId: line.variantId,
              name: `${line.productName} — ${line.variantName}`,
              sku: line.sku,
              unitPrice: moneyString(line.unitPrice),
              quantity: line.quantity,
              lineTotal: moneyString(line.lineTotal),
            },
          })
        }

        for (const line of computed) {
          if (line.variantId) {
            const updated = await tx.productVariant.updateMany({
              where: {
                id: line.variantId,
                productId: line.productId,
                stock: { gte: line.quantity },
              },
              data: {
                stock: { decrement: line.quantity },
              },
            })
            if (updated.count !== 1) {
              throw new Error("STOCK_RACE")
            }
            await tx.stockMovement.create({
              data: {
                productId: line.productId,
                variantId: line.variantId,
                type: StockMovementType.OUT,
                quantity: line.quantity,
                source: "CHECKOUT",
                note: `orderId:${orderId}`,
                salesChannel: "ONLINE",
              },
            })
          }
        }

        await tx.payment.create({
          data: {
            orderId,
            method: paymentMethod,
            status: PaymentStatus.PENDING,
            amount: moneyString(grandTotal),
          },
        })

        // await tx.cartItem.deleteMany({ where: { cartId: cart.id } }) // BURADAN KALDIRDIK

        return { orderId, orderNo }
      },
      { timeout: 20000 }
    )

    // PayTR Entegrasyonu (Eğer Kredi Kartı ise)
    let paytrToken = ""
    if (paymentMethod === PaymentMethod.CARD) {
        const basket: [string, string, number][] = computed.map(item => [
            item.productName + (item.variantName !== "Standart" ? ` (${item.variantName})` : ""),
            moneyString(item.unitPrice),
            item.quantity
        ])
        
        // Kargo satırı ekle
        if (shippingCost > 0) {
            basket.push(["Kargo Ücreti", moneyString(shippingCost), 1])
        }

        try {
            const pt = await getPaytrToken({
                merchantOid: result.orderNo,
                email: user?.email || "",
                paymentAmount: Math.round(grandTotal * 100), // Kuruş
                userBasket: basket,
                userName: ship.fullName,
                userAddress: `${ship.line1} ${ship.district}/${ship.city}`,
                userPhone: ship.phone,
                userIp: ip,
            })
            paytrToken = pt.token
        } catch (err: unknown) {
            console.error("PayTR Token Hatası:", err)
            const message =
              err instanceof Error ? err.message : "Ödeme tokeni alınamadı."
            return NextResponse.json({ message }, { status: 500 })
        }
    }

    const responsePayload = {
      message: "Siparis alindi.",
      orderNo: result.orderNo,
      grandTotal: moneyString(grandTotal),
      paymentStatus: "PENDING" as const,
      paymentMethod: body.paymentMethod,
      paytrToken: paytrToken || null
    }

    // Sipariş ve ödeme hazırlığı başarılıysa sepeti temizle
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })

    const res = NextResponse.json(responsePayload, { status: 201 })

    if (idempotencyKey) {
      setIdempotentResponse(idempotencyKey, JSON.stringify(responsePayload))
    }

    const recipientEmail = user?.email?.trim() || null
    const siteUrlBase =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.littlemomstore.com"
    if (recipientEmail) {
      const orderNoForMail = result.orderNo
      const grandTotalStr = moneyString(grandTotal)
      const pm = paymentMethod
      after(() => {
        void (async () => {
          try {
            const { subject, text, html } = orderPlacedEmailContent({
              siteUrl: siteUrlBase,
              orderNo: orderNoForMail,
              grandTotal: grandTotalStr,
              paymentMethod: pm,
            })
            await sendMail(prisma, { to: recipientEmail, subject, text, html })
          } catch (err) {
            console.error("order placed email:", err)
          }
        })()
      })
    }

    return res
  } catch (error) {
    console.error("POST /api/orders error:", error)
    if (error instanceof Error && error.message === "STOCK_RACE") {
      return NextResponse.json(
        { message: "Stok guncellendi; lutfen sepeti kontrol edip tekrar deneyin." },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { message: "Siparis olusturulurken beklenmeyen bir hata olustu." },
      { status: 500 }
    )
  }
}
