import { NextResponse } from "next/server"
import { resolveCartIdentity } from "@/lib/cartSession"
import { prisma } from "@/lib/prisma"

type UpdateCartItemBody = {
  quantity?: number
}

function canAccessCart(
  cart: { userId: number | null; guestToken: string | null },
  identity: Awaited<ReturnType<typeof resolveCartIdentity>>
): boolean {
  if (identity.kind === "user") {
    return cart.userId === identity.userId
  }
  if (identity.kind === "guest" && cart.guestToken) {
    return cart.guestToken === identity.guestToken
  }
  return false
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const identity = await resolveCartIdentity()
    if (identity.kind !== "user") {
      return NextResponse.json(
        { message: "Sepet islemi icin giris yapmalisiniz." },
        { status: 401 }
      )
    }

    const { itemId } = await params
    const parsedItemId = Number(itemId)
    if (Number.isNaN(parsedItemId)) {
      return NextResponse.json({ message: "Gecersiz itemId." }, { status: 400 })
    }

    const body = (await request.json()) as UpdateCartItemBody
    const quantity = Math.max(1, Math.floor(Number(body.quantity ?? 1)))

    const cartItem = await prisma.cartItem.findUnique({
      where: { id: parsedItemId },
      include: {
        cart: { select: { userId: true, guestToken: true } },
        variant: { select: { stock: true } },
      },
    })

    if (!cartItem || !canAccessCart(cartItem.cart, identity)) {
      return NextResponse.json({ message: "Sepet satiri bulunamadi." }, { status: 404 })
    }

    if (cartItem.variant && quantity > cartItem.variant.stock) {
      return NextResponse.json(
        { message: `Stok yetersiz. En fazla ${cartItem.variant.stock} adet secilebilir.` },
        { status: 400 }
      )
    }

    const updated = await prisma.cartItem.update({
      where: { id: parsedItemId },
      data: { quantity },
      select: { id: true, quantity: true },
    })

    return NextResponse.json({ message: "Sepet adedi guncellendi.", item: updated })
  } catch (error) {
    console.error("Cart update item error:", error)
    return NextResponse.json(
      { message: "Sepet adedi guncellenirken beklenmeyen bir hata olustu." },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const identity = await resolveCartIdentity()
    if (identity.kind !== "user") {
      return NextResponse.json(
        { message: "Sepet islemi icin giris yapmalisiniz." },
        { status: 401 }
      )
    }

    const { itemId } = await params
    const parsedItemId = Number(itemId)
    if (Number.isNaN(parsedItemId)) {
      return NextResponse.json({ message: "Gecersiz itemId." }, { status: 400 })
    }

    const cartItem = await prisma.cartItem.findUnique({
      where: { id: parsedItemId },
      include: { cart: { select: { userId: true, guestToken: true } } },
    })

    if (!cartItem || !canAccessCart(cartItem.cart, identity)) {
      return NextResponse.json({ message: "Sepet satiri bulunamadi." }, { status: 404 })
    }

    await prisma.cartItem.delete({ where: { id: parsedItemId } })
    return NextResponse.json({ message: "Urun sepetten kaldirildi." })
  } catch (error) {
    console.error("Cart remove item error:", error)
    return NextResponse.json(
      { message: "Sepet satiri silinirken beklenmeyen bir hata olustu." },
      { status: 500 }
    )
  }
}
