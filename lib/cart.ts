

type DecimalLike = number | string | { toNumber?: () => number; toString: () => string }

export type CartLine = {
  itemId: number
  productId: number
  productSlug: string
  productName: string
  imageUrl: string
  variantId: number | null
  variantName: string
  unitPrice: number
  quantity: number
  lineTotal: number
  stock: number | null
}

export type CartSummary = {
  itemCount: number
  subtotal: number
  shipping: number
  grandTotal: number
}

export type CartResponse = {
  cartId: number | null
  lines: CartLine[]
  summary: CartSummary
}

type CartItemRow = {
  id: number
  productId: number
  variantId: number | null
  quantity: number
  product: {
    id: number
    slug: string
    name: string
    basePrice: DecimalLike
    images: { url: string }[]
  }
  variant: {
    id: number
    name: string
    price: DecimalLike
    stock: number
  } | null
}

export function toNumber(value: DecimalLike): number {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value)
  if (value.toNumber) return value.toNumber()
  return Number(value.toString())
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function mapCartItemsToLines(rows: CartItemRow[]): CartLine[] {
  return rows.map((row) => {
    const unitPrice = row.variant ? toNumber(row.variant.price) : toNumber(row.product.basePrice)
    const quantity = row.quantity
    return {
      itemId: row.id,
      productId: row.productId,
      productSlug: row.product.slug,
      productName: row.product.name,
      imageUrl: row.product.images[0]?.url ?? "/urunler/urun1.jpg",
      variantId: row.variantId,
      variantName: row.variant?.name ?? "Standart",
      unitPrice,
      quantity,
      lineTotal: unitPrice * quantity,
      stock: row.variant?.stock ?? null,
    }
  })
}

export function calculateCartSummary(lines: CartLine[], threshold: number = 750, cost: number = 49.9): CartSummary {
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0)
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0)
  const shipping = subtotal >= threshold ? 0 : (subtotal === 0 ? 0 : cost)
  return {
    itemCount,
    subtotal,
    shipping,
    grandTotal: subtotal + shipping,
  }
}
