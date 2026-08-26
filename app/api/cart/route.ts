import { NextResponse } from "next/server"
import type { Prisma } from "@/generated/prisma/client"
import { calculateCartSummary, mapCartItemsToLines } from "@/lib/cart"
import { clearGuestCartCookieOnResponse, resolveCartIdentity } from "@/lib/cartSession"
import { prisma } from "@/lib/prisma"
import { getShippingSettings } from "@/lib/shippingSettings"

const cartInclude = {
  items: {
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          basePrice: true,
          images: {
            orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }],
            take: 1,
            select: { url: true },
          },
        },
      },
      variant: {
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
        },
      },
    },
  },
} satisfies Prisma.CartInclude

export async function GET() {
  try {
    const identity = await resolveCartIdentity()

    const { threshold, cost } = await getShippingSettings(prisma)

    if (identity.kind === "none" || identity.kind === "guest") {
      const lines = mapCartItemsToLines([])
      const summary = calculateCartSummary(lines, threshold, cost)
      const res = NextResponse.json({
        cartId: null,
        lines,
        summary,
        settings: { threshold, cost },
      })
      if (identity.kind === "guest") {
        clearGuestCartCookieOnResponse(res)
      }
      return res
    }

    const cart = await prisma.cart.findUnique({
      where: { userId: identity.userId },
      include: cartInclude,
    })

    const lines = mapCartItemsToLines(cart?.items ?? [])
    const summary = calculateCartSummary(lines, threshold, cost)

    return NextResponse.json({
      cartId: cart?.id ?? null,
      lines,
      summary,
      settings: { threshold, cost }
    })
  } catch (error) {
    console.error("Cart GET error:", error)
    return NextResponse.json(
      { message: "Sepet getirilirken beklenmeyen bir hata olustu." },
      { status: 500 }
    )
  }
}
