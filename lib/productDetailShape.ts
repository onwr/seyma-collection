export type ProductDetailInstallment = {
  months: number
  monthlyAmountText: string
}

export type ProductDetailVariant = {
  id: number
  label: string
  sku: string
  priceText: string
  compareAtPriceText?: string
  discountPct?: number
  stock: number
  stockText: string
  attributes: ProductVariantAttribute[]
}

export type ProductVariantAttribute = {
  key: string
  value: string
}

export type ProductDetailImage = {
  src: string
  alt: string
}

export type ProductAccordionItem = {
  id: "features" | "comments" | "payment"
  title: string
  content: string
}

export type ProductDetailViewModel = {
  productId: number
  slug: string
  categoryLabel: string
  extraCategories: { name: string; slug: string }[]
  title: string
  rating: number
  reviewCount: number
  priceText: string
  compareAtPriceText?: string
  discountPct?: number
  installmentsLabel: string
  phoneOrderLabel: string
  images: ProductDetailImage[]
  variants: ProductDetailVariant[]
  accordions: ProductAccordionItem[]
  installmentOptions: ProductDetailInstallment[]
  baseAttributes: ProductVariantAttribute[]
}

type ApiImage = {
  url: string
  alt?: string | null
}

type ApiVariant = {
  id: number
  name: string
  sku?: string | null
  price: number | string
  compareAtPrice?: number | string | null
  stock: number
  attributes?: Record<string, string> | null
}

type ApiProductLike = {
  id: number
  slug: string
  name: string
  category?: { name?: string | null } | null
  basePrice: number | string
  compareAtPrice?: number | string | null
  attributes?: Record<string, string> | null
  images?: ApiImage[]
  variants?: ApiVariant[]
}

function toPriceText(value: number | string) {
  const amount = typeof value === "number" ? value : Number(value)
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isNaN(amount) ? 0 : amount)
}

function toInstallmentText(value: number | string, month: number) {
  const amount = typeof value === "number" ? value : Number(value)
  const monthly = Number.isNaN(amount) ? 0 : amount / month
  return toPriceText(monthly)
}

function toStockText(stock: number) {
  if (stock <= 0) return "Stokta yok"
  if (stock <= 3) return `Son ${stock} ürün`
  return `${stock} adet stokta`
}

function toAttributeList(attributes?: Record<string, string> | null): ProductVariantAttribute[] {
  if (!attributes) return []
  return Object.entries(attributes).map(([key, value]) => ({ key, value }))
}

export function mapApiProductToDetailViewModel(
  apiProduct: ApiProductLike,
  opts?: { phoneOrderLabel?: string; extraCategories?: { name: string; slug: string }[] }
): ProductDetailViewModel {
  const basePrice = Number(apiProduct.basePrice)
  const compareAtPrice = apiProduct.compareAtPrice ? Number(apiProduct.compareAtPrice) : null

  // Admin panelde compareAtPrice "İndirimli Fiyat" olarak geçiyor.
  // Bu yüzden eğer compareAtPrice < basePrice ise, bu bir indirimdir.
  const hasDiscount = compareAtPrice !== null && compareAtPrice < basePrice
  const displayPrice = hasDiscount ? compareAtPrice : basePrice
  const oldPrice = hasDiscount ? basePrice : null
  
  const discountPct = hasDiscount 
    ? Math.round(((basePrice - compareAtPrice) / basePrice) * 100)
    : undefined

  const variants: ProductDetailVariant[] =
    apiProduct.variants?.map((item) => {
      const vBasePrice = Number(item.price)
      const vComparePrice = item.compareAtPrice ? Number(item.compareAtPrice) : null
      
      const vHasDiscount = vComparePrice !== null && vComparePrice < vBasePrice
      const vDisplayPrice = vHasDiscount ? vComparePrice : vBasePrice
      const vOldPrice = vHasDiscount ? vBasePrice : null
      const vDiscountPct = vHasDiscount 
        ? Math.round(((vBasePrice - vComparePrice) / vBasePrice) * 100)
        : undefined

      return {
        id: item.id,
        label: item.name,
        sku: item.sku ?? `LMS-${item.id}`,
        priceText: toPriceText(vDisplayPrice),
        compareAtPriceText: vOldPrice ? toPriceText(vOldPrice) : undefined,
        discountPct: vDiscountPct,
        stock: item.stock,
        stockText: toStockText(item.stock),
        attributes: toAttributeList(item.attributes),
      }
    }) ?? []

  const images =
    apiProduct.images?.map((item, index) => ({
      src: item.url,
      alt: item.alt ?? `${apiProduct.name} görsel ${index + 1}`,
    })) ?? []

  const installmentMonths = [3, 6, 9]
  const installmentOptions = installmentMonths.map((month) => ({
    months: month,
    monthlyAmountText: toInstallmentText(displayPrice, month),
  }))

  return {
    productId: apiProduct.id,
    slug: apiProduct.slug,
    categoryLabel: apiProduct.category?.name ?? "Kız Çocuk",
    extraCategories: opts?.extraCategories ?? [],
    title: apiProduct.name,
    rating: 0,
    reviewCount: 0,
    priceText: toPriceText(displayPrice),
    compareAtPriceText: oldPrice ? toPriceText(oldPrice) : undefined,
    discountPct,
    installmentsLabel: `${installmentOptions[0]?.monthlyAmountText ?? toPriceText(displayPrice)}'den başlayan taksitlerle`,
    phoneOrderLabel: opts?.phoneOrderLabel ?? "Telefonla Sipariş Ver",
    images,
    variants,
    accordions: [
      {
        id: "features",
        title: "Ürün Özellikleri",
        content: "Kumaş: %95 pamuk, %5 elastan\nYıkama: 30 derecede hassas program\nKalıp: Rahat kesim\nSezon: İlkbahar / Yaz",
      },
      {
        id: "comments",
        title: "Yorumlar (0)",
        content: "Bu ürün için henüz yorum yapılmadı.",
      },
      {
        id: "payment",
        title: "Ödeme Seçenekleri",
        content: installmentOptions
          .map((item) => `${item.months} taksit: ${item.monthlyAmountText}`)
          .join("\n"),
      },
    ],
    installmentOptions,
    baseAttributes: toAttributeList(apiProduct.attributes),
  }
}
