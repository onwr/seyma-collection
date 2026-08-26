import type { PrismaClient } from "@/generated/prisma/client"

/**
 * `cart_guest` çerezindeki misafir sepetini üye sepetine aktarır ve misafir `Cart` kaydını siler.
 */
export async function mergeGuestCartIntoUserCart(
  prisma: PrismaClient,
  userId: number,
  guestToken: string
): Promise<void> {
  if (!/^[a-f0-9]{64}$/i.test(guestToken)) {
    return
  }

  await prisma.$transaction(async (tx) => {
    const guestCart = await tx.cart.findUnique({
      where: { guestToken },
      include: {
        items: {
          include: {
            variant: { select: { id: true, stock: true } },
          },
        },
      },
    })

    if (!guestCart) {
      return
    }

    if (guestCart.items.length === 0) {
      await tx.cart.delete({ where: { id: guestCart.id } })
      return
    }

    const userCart = await tx.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { id: true },
    })

    for (const line of guestCart.items) {
      if (line.variantId && !line.variant) {
        continue
      }

      const maxStock = line.variant ? line.variant.stock : Number.MAX_SAFE_INTEGER
      if (maxStock <= 0) {
        continue
      }

      const existing = await tx.cartItem.findFirst({
        where: {
          cartId: userCart.id,
          productId: line.productId,
          variantId: line.variantId,
        },
        select: { id: true, quantity: true },
      })

      if (existing) {
        const nextQty = Math.min(existing.quantity + line.quantity, maxStock)
        if (nextQty < 1) continue
        await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: nextQty },
        })
      } else {
        const nextQty = Math.min(line.quantity, maxStock)
        if (nextQty < 1) continue
        await tx.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: line.productId,
            variantId: line.variantId,
            quantity: nextQty,
          },
        })
      }
    }

    await tx.cart.delete({ where: { id: guestCart.id } })
  })
}
