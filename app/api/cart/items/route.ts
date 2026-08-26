import { NextResponse } from "next/server"
import { resolveCartIdentity } from "@/lib/cartSession"
import { prisma } from "@/lib/prisma"

type AddCartItemBody = {
  productId?: number
  variantId?: number | null
  quantity?: number
}

export async function POST(request: Request) {
  try {
    const identity = await resolveCartIdentity()
    if (identity.kind !== "user") {
      return NextResponse.json(
        { message: "Sepete eklemek icin uye olmaniz veya giris yapmaniz gerekir." },
        { status: 401 }
      )
    }

    const body = (await request.json()) as AddCartItemBody
    const productId = Number(body.productId)
    const requestedQty = Number(body.quantity ?? 1)
    const quantity = Number.isFinite(requestedQty) ? Math.max(1, Math.floor(requestedQty)) : 1
    const rawVariantId = body.variantId === undefined ? undefined : body.variantId

    if (Number.isNaN(productId) || productId <= 0) {
      return NextResponse.json({ message: "Gecersiz productId." }, { status: 400 })
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        isActive: true,
        variants: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          select: { id: true, stock: true },
        },
      },
    })

    if (!product || !product.isActive) {
      return NextResponse.json({ message: "Urun bulunamadi veya pasif." }, { status: 404 })
    }

    let variantId: number | null = null
    if (rawVariantId !== undefined && rawVariantId !== null) {
      variantId = Number(rawVariantId)
      const explicitVariant = product.variants.find((v) => v.id === variantId)
      if (!explicitVariant) {
        return NextResponse.json({ message: "Varyant urune ait degil." }, { status: 400 })
      }
    } else if (product.variants.length > 0) {
      variantId = product.variants[0].id
    }

    const selectedVariant = variantId ? product.variants.find((v) => v.id === variantId) ?? null : null
    if (selectedVariant && selectedVariant.stock <= 0) {
      return NextResponse.json({ message: "Secilen varyant stokta yok." }, { status: 400 })
    }

    const cart = await prisma.cart.upsert({
      where: { userId: identity.userId },
      update: {},
      create: { userId: identity.userId },
      select: { id: true },
    })

    const existing = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        variantId,
      },
      select: { id: true, quantity: true },
    })

    const nextQty = (existing?.quantity ?? 0) + quantity
    if (selectedVariant && nextQty > selectedVariant.stock) {
      return NextResponse.json(
        { message: `Stok yetersiz. En fazla ${selectedVariant.stock} adet ekleyebilirsiniz.` },
        { status: 400 }
      )
    }

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: nextQty },
      })
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId,
          quantity,
        },
      })
    }

    return NextResponse.json({ message: "Urun sepete eklendi." }, { status: 201 })
  } catch (error) {
    console.error("Cart add item error:", error)
    return NextResponse.json(
      { message: "Sepete eklenirken beklenmeyen bir hata olustu." },
      { status: 500 }
    )
  }
}
