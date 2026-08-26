/** Sepet ve checkout ile aynı kargo kuralı (tek kaynak). */

export interface PriceSummary {
  subtotal: number
  shipping: number
  discount: number
  grandTotal: number
}

export function calculatePriceSummary(
  subtotal: number, 
  discountAmount: number = 0, 
  threshold: number = 750, 
  shippingCost: number = 49.9
): PriceSummary {
  if (subtotal === 0) {
    return { subtotal: 0, shipping: 0, discount: 0, grandTotal: 0 }
  }
  
  const shipping = subtotal >= threshold ? 0 : shippingCost
  const grandTotal = Math.max(0, subtotal + shipping - discountAmount)
  
  return {
    subtotal,
    shipping,
    discount: discountAmount,
    grandTotal
  }
}

/** Para birimi tutarını ondalık stringe (Prisma Decimal / MySQL). */
export function moneyString(value: number): string {
  return value.toFixed(2)
}
