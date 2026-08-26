import type { Prisma } from "@/generated/prisma/client"

/** Admin ürün listesi ve toplu seçim için ortak filtre (stok chip’leri dahil). */
export type ProductListFilterInput = {
  search?: string | null
  categoryId?: string | null
  active?: string | null
  featured?: string | null
  stockFilter?: string | null
}

export function buildProductListWhere(input: ProductListFilterInput): Prisma.ProductWhereInput {
  const search = input.search?.trim()
  const where: Prisma.ProductWhereInput = {}
  const andFilters: Prisma.ProductWhereInput[] = []

  if (input.active === "true" || input.active === "false") {
    where.isActive = input.active === "true"
  } else {
    // Varsayılan olarak sadece aktif ürünleri göster (Kamuya açık API'ler için)
    where.isActive = true
  }

  if (input.featured === "true" || input.featured === "false") {
    where.isFeatured = input.featured === "true"
  }

  if (search) {
    andFilters.push({
      OR: [
        { name: { contains: search } },
        { slug: { contains: search } },
        { sku: { contains: search } },
      ],
    })
  }

  if (input.categoryId) {
    const parsed = Number(input.categoryId)
    if (!Number.isNaN(parsed)) {
      andFilters.push({
        OR: [
          { categoryId: parsed },
          { subCategoryId: parsed },
          { categories: { some: { categoryId: parsed } } },
        ],
      })
    }
  }

  const chip = input.stockFilter?.toUpperCase()
  if (chip === "ACTIVE") {
    where.isActive = true
  } else if (chip === "PASSIVE") {
    where.isActive = false
  } else if (chip === "LOW") {
    andFilters.push(
      { variants: { some: { isActive: true, stock: { lte: 5 } } } },
      { variants: { some: { isActive: true, stock: { gt: 0 } } } }
    )
  } else if (chip === "OUT") {
    andFilters.push({
      NOT: {
        variants: { some: { isActive: true, stock: { gt: 0 } } },
      },
    })
  }

  if (andFilters.length > 0) {
    where.AND = andFilters
  }

  return where
}

const SORT_FIELDS = ["name", "basePrice", "createdAt"] as const
type SortField = (typeof SORT_FIELDS)[number]

export function buildProductListOrderBy(
  sort: string | null,
  dir: string | null
): Prisma.ProductOrderByWithRelationInput {
  const d = dir === "asc" ? "asc" : "desc"
  const field = sort && SORT_FIELDS.includes(sort as SortField) ? (sort as SortField) : "createdAt"
  return { [field]: d }
}
