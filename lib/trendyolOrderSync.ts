// Trendyol → Site: yeni siparişlerde stok düşürme + sitenin kendi Sipariş (Order) kaydını
// oluşturma, iptal/iade olursa stok geri yükleme ve sipariş durumunu güncelleme.
// İşlenen her Trendyol siparişi `TrendyolOrderSync` tablosuna kaydedilir (idempotency + audit).
import type { PrismaClient } from "@/generated/prisma/client"
import { StockMovementType, SalesChannel, OrderStatus, PaymentStatus, PaymentMethod } from "@/generated/prisma/client"
import { fetchAllOrders, TrendyolOrderPackage, TrendyolOrderLine } from "@/lib/trendyol"
import { moneyString } from "@/lib/checkoutTotals"

const LAST_ORDER_SYNC_KEY = "TRENDYOL_LAST_ORDER_SYNC_AT"
const CANCEL_LIKE_STATUSES = new Set(["Cancelled", "Returned", "UnSupplied"])
// İlk çalıştırmada geriye dönük büyük bir tarama yapmamak için varsayılan bakış penceresi.
const FIRST_RUN_LOOKBACK_MS = 24 * 60 * 60 * 1000

async function getLastSyncAt(prisma: PrismaClient): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key: LAST_ORDER_SYNC_KEY } })
  if (row?.value) {
    const n = Number(row.value)
    if (Number.isFinite(n) && n > 0) return n
  }
  return Date.now() - FIRST_RUN_LOOKBACK_MS
}

async function setLastSyncAt(prisma: PrismaClient, ms: number): Promise<void> {
  await prisma.setting.upsert({
    where: { key: LAST_ORDER_SYNC_KEY },
    update: { value: String(ms) },
    create: { key: LAST_ORDER_SYNC_KEY, value: String(ms), type: "number" },
  })
}

// Trendyol'un paket statülerini sitenin kendi OrderStatus'una eşler.
function mapTrendyolStatus(status: string): OrderStatus {
  switch (status) {
    case "Shipped":
    case "AtCollectionPoint":
      return OrderStatus.SHIPPED
    case "Delivered":
      return OrderStatus.DELIVERED
    case "Cancelled":
    case "UnSupplied":
      return OrderStatus.CANCELLED
    case "Returned":
      return OrderStatus.REFUNDED
    default:
      // Awaiting / Created / Picking / Invoiced — Trendyol ödemeyi zaten aldı, hazırlık aşamasında.
      return OrderStatus.PROCESSING
  }
}

function trendyolOrderNo(orderNumber: string): string {
  return `TY-${orderNumber}`
}

export interface OrderSyncSummary {
  packagesSeen: number
  stockDecremented: number
  stockRestored: number
  ordersCreated: number
  skippedNoMatch: { orderNumber: string; barcode: string }[]
  errors: { orderNumber: string; message: string }[]
}

interface MatchedLine {
  line: TrendyolOrderLine
  productId: number
  variantId: number
}

async function createOrderFromPackage(
  tx: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0],
  pkg: TrendyolOrderPackage,
  matchedLines: MatchedLine[]
): Promise<void> {
  if (matchedLines.length === 0) return

  const grandTotal = pkg.totalPrice ?? pkg.packageTotalPrice ?? 0
  const discountTotal = pkg.totalDiscount ?? 0
  const subtotal = grandTotal + discountTotal

  const ship = pkg.shipmentAddress
  const bill = pkg.invoiceAddress

  const order = await tx.order.create({
    data: {
      orderNo: trendyolOrderNo(pkg.orderNumber),
      status: mapTrendyolStatus(pkg.status),
      paymentStatus: PaymentStatus.PAID,
      subtotal: moneyString(subtotal),
      shippingCost: moneyString(0),
      discountTotal: moneyString(discountTotal),
      grandTotal: moneyString(grandTotal),
      note: `Trendyol siparişi (${pkg.orderNumber})`,
      guestEmail: pkg.customerEmail || null,
      guestPhone: ship?.phone || "",
      shippingFullName: ship?.fullName || `${pkg.customerFirstName ?? ""} ${pkg.customerLastName ?? ""}`.trim() || "Trendyol Müşterisi",
      shippingPhone: ship?.phone || "",
      shippingLine1: ship?.fullAddress || ship?.address1 || "—",
      shippingLine2: ship?.address2 || null,
      shippingDistrict: ship?.district || "—",
      shippingCity: ship?.city || "—",
      shippingPostalCode: ship?.postalCode || "",
      shippingCountry: ship?.countryCode || "TR",
      billingSameAsShipping: false,
      billingFullName: bill?.fullName || null,
      billingPhone: bill?.phone || null,
      billingLine1: bill?.fullAddress || bill?.address1 || null,
      billingLine2: bill?.address2 || null,
      billingDistrict: bill?.district || null,
      billingCity: bill?.city || null,
      billingPostalCode: bill?.postalCode || null,
      billingCountry: bill?.countryCode || null,
      items: {
        create: matchedLines.map(({ line, productId, variantId }) => {
          const quantity = line.quantity
          const unitPrice = line.price ?? (line.amount && quantity ? line.amount / quantity : 0)
          const lineTotal = line.amount ?? unitPrice * quantity
          return {
            productId,
            variantId,
            name: line.productName || "Trendyol Ürünü",
            sku: line.merchantSku || line.stockCode || line.barcode,
            unitPrice: moneyString(unitPrice),
            quantity,
            lineTotal: moneyString(lineTotal),
          }
        }),
      },
      payments: {
        create: {
          method: PaymentMethod.MARKETPLACE,
          status: PaymentStatus.PAID,
          amount: moneyString(grandTotal),
          provider: "Trendyol",
          providerPaymentId: pkg.orderNumber,
          paidAt: new Date(pkg.orderDate),
        },
      },
    },
  })

  const trackingNo = pkg.cargoTrackingNumber ? String(pkg.cargoTrackingNumber) : null
  if (trackingNo) {
    await tx.shipment.create({
      data: {
        orderId: order.id,
        cargoCompany: pkg.cargoProviderName || "Trendyol Express",
        trackingNo,
      },
    })
  }
}

async function processPackage(
  prisma: PrismaClient,
  pkg: TrendyolOrderPackage,
  summary: OrderSyncSummary
): Promise<void> {
  const existing = await prisma.trendyolOrderSync.findUnique({ where: { orderNumber: pkg.orderNumber } })
  const isCancelLike = CANCEL_LIKE_STATUSES.has(pkg.status)

  if (!existing) {
    if (isCancelLike) {
      // Hiç stok düşülmemiş bir sipariş zaten iptalliyse yapacak bir şey yok, sadece kaydet.
      await prisma.trendyolOrderSync.create({
        data: { orderNumber: pkg.orderNumber, shipmentPackageId: String(pkg.shipmentPackageId), lastStatus: pkg.status, stockDecremented: false },
      })
      return
    }

    let created = false
    await prisma.$transaction(async (tx) => {
      const matchedLines: MatchedLine[] = []
      for (const line of pkg.lines) {
        const variant = await tx.productVariant.findUnique({ where: { barcode: line.barcode } })
        if (!variant) {
          summary.skippedNoMatch.push({ orderNumber: pkg.orderNumber, barcode: line.barcode })
          continue
        }
        const updated = await tx.productVariant.updateMany({
          where: { id: variant.id, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        })
        // Stok yetersizse (gte koşulu tutmadıysa) yine de 0'a çekip devam ediyoruz —
        // Trendyol'da satış zaten gerçekleşti, negatif stok göstermemek için taban sıfır.
        if (updated.count === 0) {
          await tx.productVariant.update({ where: { id: variant.id }, data: { stock: 0 } })
        }
        await tx.stockMovement.create({
          data: {
            productId: variant.productId,
            variantId: variant.id,
            type: StockMovementType.OUT,
            quantity: line.quantity,
            source: "TRENDYOL",
            note: `orderNumber:${pkg.orderNumber}`,
            salesChannel: SalesChannel.MARKETPLACE,
          },
        })
        matchedLines.push({ line, productId: variant.productId, variantId: variant.id })
      }

      await createOrderFromPackage(tx, pkg, matchedLines)
      created = matchedLines.length > 0

      await tx.trendyolOrderSync.create({
        data: { orderNumber: pkg.orderNumber, shipmentPackageId: String(pkg.shipmentPackageId), lastStatus: pkg.status, stockDecremented: true },
      })
    })
    summary.stockDecremented++
    if (created) summary.ordersCreated++
    return
  }

  // Daha önce görülmüş: sadece daha önce stok düşülmüş VE şimdi iptal/iade olmuşsa geri yükle.
  if (existing.stockDecremented && isCancelLike) {
    await prisma.$transaction(async (tx) => {
      for (const line of pkg.lines) {
        const variant = await tx.productVariant.findUnique({ where: { barcode: line.barcode } })
        if (!variant) {
          summary.skippedNoMatch.push({ orderNumber: pkg.orderNumber, barcode: line.barcode })
          continue
        }
        await tx.productVariant.update({ where: { id: variant.id }, data: { stock: { increment: line.quantity } } })
        await tx.stockMovement.create({
          data: {
            productId: variant.productId,
            variantId: variant.id,
            type: StockMovementType.RETURN,
            quantity: line.quantity,
            source: "TRENDYOL",
            note: `iptal orderNumber:${pkg.orderNumber}`,
            salesChannel: SalesChannel.MARKETPLACE,
          },
        })
      }
      await tx.order.updateMany({
        where: { orderNo: trendyolOrderNo(pkg.orderNumber) },
        data: { status: mapTrendyolStatus(pkg.status), paymentStatus: PaymentStatus.REFUNDED },
      })
      await tx.trendyolOrderSync.update({
        where: { orderNumber: pkg.orderNumber },
        data: { lastStatus: pkg.status, stockDecremented: false },
      })
    })
    summary.stockRestored++
    return
  }

  // Durum değişmiş ama stok etkileyen bir geçiş değil (ör. Picking -> Shipped) — siparişi ve kaydı güncelle.
  if (existing.lastStatus !== pkg.status) {
    await prisma.$transaction(async (tx) => {
      await tx.order.updateMany({
        where: { orderNo: trendyolOrderNo(pkg.orderNumber) },
        data: { status: mapTrendyolStatus(pkg.status) },
      })
      await tx.trendyolOrderSync.update({ where: { orderNumber: pkg.orderNumber }, data: { lastStatus: pkg.status } })
    })
  }
}

export async function syncTrendyolOrders(prisma: PrismaClient): Promise<OrderSyncSummary> {
  const summary: OrderSyncSummary = {
    packagesSeen: 0,
    stockDecremented: 0,
    stockRestored: 0,
    ordersCreated: 0,
    skippedNoMatch: [],
    errors: [],
  }
  const startDate = await getLastSyncAt(prisma)
  const endDate = Date.now()

  const packages = await fetchAllOrders({ startDate, endDate })
  summary.packagesSeen = packages.length

  for (const pkg of packages) {
    try {
      await processPackage(prisma, pkg, summary)
    } catch (err) {
      summary.errors.push({ orderNumber: pkg.orderNumber, message: err instanceof Error ? err.message : String(err) })
    }
  }

  await setLastSyncAt(prisma, endDate)
  return summary
}
