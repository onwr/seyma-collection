import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { HomeFooter } from "@/components/home/HomeFooter"
import { HomeHeader } from "@/components/home/HomeHeader"
import { prisma } from "@/lib/prisma"
import { CategoryListingClient } from "@/components/category/CategoryListingClient"
import { serializePrisma } from "@/lib/serialize"

type Props = {
  params: Promise<{ slug: string[] }>
  searchParams: Promise<{
    sort?: "price-asc" | "price-desc" | "name-asc" | "name-desc" | "newest"
    inStock?: "1"
    onSale?: "1"
    view?: "grid2" | "grid4"
    page?: string
  }>
}

const PAGE_SIZE = 16

/** Kategori listesi DB’den gelsin; build/ISR tamponu “eski site” hissi vermesin. */
export const dynamic = "force-dynamic"

/** Slug global olarak benzersiz; çok segmentli URL'de üst segment ile eşleşmeyi doğrularız. */
async function loadCategoryForPath(slug: string[]) {
  const currentSlug = slug[slug.length - 1]
  if (!currentSlug) return null

  const row = await prisma.category.findUnique({
    where: { slug: currentSlug },
    include: {
      parent: { include: { children: true } },
      children: true,
    },
  })

  if (!row) return null

  if (slug.length > 1) {
    const parentSlug = slug[slug.length - 2]
    const parentRow = await prisma.category.findUnique({ where: { slug: parentSlug } })
    if (!parentRow || row.parentId !== parentRow.id) {
      return null
    }
  }

  return row
}

function slugToTitle(slug: string) {
  if (!slug) return ""
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

/** Çok sayfalı listelerde 1 … orta … son şeklinde kısa sayfa listesi. */
function getVisiblePageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 1) return [1]
  if (total <= 9) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const delta = 2
  const left = Math.max(2, current - delta)
  const right = Math.min(total - 1, current + delta)
  const out: (number | "ellipsis")[] = [1]
  if (left > 2) out.push("ellipsis")
  for (let p = left; p <= right; p++) {
    out.push(p)
  }
  if (right < total - 1) out.push("ellipsis")
  out.push(total)
  return out
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const currentSlug = slug[slug.length - 1]
  const category = await loadCategoryForPath(slug)
  const title = category?.name ?? slugToTitle(currentSlug)
  return {
    title: `${title} - Little Mom's Store`,
    description: `${title} kategorisindeki en yeni ve en kaliteli ürünler.`,
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params
  const currentSlug = slug[slug.length - 1]
  const fullPath = slug.join("/")

  const query = await searchParams
  const page = Math.max(Number(query.page ?? "1"), 1)
  const sort = query.sort ?? "newest"
  const inStock = query.inStock === "1"
  const onSale = query.onSale === "1"
  const view = query.view ?? "grid4"
  const skip = (page - 1) * PAGE_SIZE

  const category = await loadCategoryForPath(slug)
  if (!category) {
    notFound()
  }

  // Dropdown'da gösterilecek kategoriler:
  // Eğer alt kategoriysek, kardeşlerimizi (parent.children) göster.
  // Eğer ana kategoriysek, kendi çocuklarımızı (children) göster.
  const dropdownCategories = category?.parent
    ? category.parent.children
    : (category?.children ?? [])

  const isSubCategory = category.parentId !== null
  const where: any = {
    OR: isSubCategory
      ? [
          { subCategoryId: category.id },
          { categories: { some: { categoryId: category.id } } },
        ]
      : [
          { categoryId: category.id },
          { categories: { some: { categoryId: category.id } } },
        ],
    isActive: true,
    ...(inStock ? {
      variants: {
        some: { stock: { gt: 0 }, isActive: true }
      }
    } : {}),
    ...(onSale ? {
      compareAtPrice: { not: null }
    } : {})
  }

  const orderBy: any =
    sort === "price-asc" ? [{ basePrice: "asc" }] :
      sort === "price-desc" ? [{ basePrice: "desc" }] :
        sort === "name-asc" ? [{ name: "asc" }] :
          sort === "name-desc" ? [{ name: "desc" }] :
            [{ createdAt: "desc" }]

  let [dbProducts, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        variants: inStock
          ? {
              where: { stock: { gt: 0 }, isActive: true },
              orderBy: { id: "asc" },
              take: 1,
            }
          : { take: 1 },
      },
    }),
    prisma.product.count({ where })
  ])

  const products: any[] = dbProducts
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const createFilterHref = (paramsObj: { sort?: string, inStock?: boolean, onSale?: boolean, view?: string, page?: string }) => {
    const newParams = new URLSearchParams()
    const currentSort = paramsObj.sort !== undefined ? paramsObj.sort : sort
    const currentInStock = paramsObj.inStock !== undefined ? paramsObj.inStock : inStock
    const currentOnSale = paramsObj.onSale !== undefined ? paramsObj.onSale : onSale
    const currentView = paramsObj.view !== undefined ? paramsObj.view : view
    const currentPage = paramsObj.page !== undefined ? paramsObj.page : (page > 1 ? page.toString() : undefined)

    if (currentSort !== "newest") newParams.set("sort", currentSort)
    if (currentInStock) newParams.set("inStock", "1")
    if (currentOnSale) newParams.set("onSale", "1")
    if (currentView !== "grid4") newParams.set("view", currentView)
    if (currentPage) newParams.set("page", currentPage)

    const qs = newParams.toString()
    return `/categories/${fullPath}${qs ? "?" + qs : ""}`
  }

  return (
    <>
      <HomeHeader />

      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        <nav className="mb-6 flex items-center gap-2 text-[13px] text-zinc-500">
          <Link href="/" className="flex items-center gap-1 hover:text-[#6f8f73]">
            Anasayfa
          </Link>
          <span>&gt;</span>
          {category?.parent && (
            <>
              <Link href={`/categories/${category.parent.slug}`} className="hover:text-[#6f8f73]">
                {category.parent.name}
              </Link>
              <span>&gt;</span>
            </>
          )}
          <span className="font-semibold text-[#6f8f73] uppercase">
            {category?.name ?? slugToTitle(currentSlug)}
          </span>
        </nav>

        {dropdownCategories.length > 0 && (
          <div className="mb-8 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex items-center gap-2 whitespace-nowrap">
              {dropdownCategories.map(cat => {
                const href = category?.parent
                  ? `/categories/${category.parent.slug}/${cat.slug}`
                  : `/categories/${currentSlug}/${cat.slug}`;
                const isActive = cat.slug === currentSlug;
                return (
                  <Link
                    key={cat.id}
                    href={href}
                    className={`h-10 px-6 flex items-center rounded-full text-sm font-medium transition-all ${isActive ? "bg-[#6f8f73] text-white shadow-lg shadow-[#6f8f73]/20" : "bg-white border border-zinc-200 text-zinc-600 hover:border-[#6f8f73] hover:text-[#6f8f73]"}`}
                  >
                    {cat.name}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        <div className="mb-8 space-y-4">

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-4">
            <div className="flex flex-wrap gap-2">
              <Link
                href={createFilterHref({ sort: "price-asc" })}
                className={`h-9 px-4 flex items-center rounded-md border text-xs font-medium transition ${sort === "price-asc" ? "bg-[#f4f7f4] border-[#bcd2bf] text-[#6f8f73]" : "bg-white border-zinc-200 text-zinc-600 hover:border-[#bcd2bf] hover:text-[#6f8f73]"}`}
              >
                Fiyata Göre (Artan)
              </Link>
              <Link
                href={createFilterHref({ sort: "price-desc" })}
                className={`h-9 px-4 flex items-center rounded-md border text-xs font-medium transition ${sort === "price-desc" ? "bg-[#f4f7f4] border-[#bcd2bf] text-[#6f8f73]" : "bg-white border-zinc-200 text-zinc-600 hover:border-[#bcd2bf] hover:text-[#6f8f73]"}`}
              >
                Fiyata Göre (Azalan)
              </Link>
              <Link
                href={createFilterHref({ sort: "name-asc" })}
                className={`h-9 px-4 flex items-center rounded-md border text-xs font-medium transition ${sort === "name-asc" ? "bg-[#f4f7f4] border-[#bcd2bf] text-[#6f8f73]" : "bg-white border-zinc-200 text-zinc-600 hover:border-[#bcd2bf] hover:text-[#6f8f73]"}`}
              >
                Ürün Adına Göre (A&gt;Z)
              </Link>
              <Link
                href={createFilterHref({ sort: "name-desc" })}
                className={`h-9 px-4 flex items-center rounded-md border text-xs font-medium transition ${sort === "name-desc" ? "bg-[#f4f7f4] border-[#bcd2bf] text-[#6f8f73]" : "bg-white border-zinc-200 text-zinc-600 hover:border-[#bcd2bf] hover:text-[#6f8f73]"}`}
              >
                Ürün Adına Göre (Z&lt;A)
              </Link>
              <Link
                href={createFilterHref({ inStock: !inStock })}
                className={`h-9 px-4 flex items-center rounded-md border text-xs font-medium transition ${inStock ? "bg-[#f4f7f4] border-[#bcd2bf] text-[#6f8f73]" : "bg-white border-zinc-200 text-zinc-600 hover:border-[#bcd2bf] hover:text-[#6f8f73]"}`}
              >
                Stoktakiler
              </Link>
              <Link
                href={createFilterHref({ onSale: !onSale })}
                className={`h-9 px-4 flex items-center rounded-md border text-xs font-medium transition ${onSale ? "bg-[#fdf2f2] border-red-200 text-red-500" : "bg-white border-zinc-200 text-zinc-600 hover:border-red-200 hover:text-red-500"}`}
              >
                İndirimdekiler
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Link href={createFilterHref({ view: "grid2" })} title="2'li Görünüm" className="flex gap-1 p-2 group">
                <div className={`w-1.5 h-1.5 rounded-full transition-colors ${view === "grid2" ? "bg-[#6f8f73]" : "bg-zinc-300 group-hover:bg-zinc-400"}`} />
                <div className={`w-1.5 h-1.5 rounded-full transition-colors ${view === "grid2" ? "bg-[#6f8f73]" : "bg-zinc-300 group-hover:bg-zinc-400"}`} />
              </Link>
              <Link href={createFilterHref({ view: "grid4" })} title="4'lü Görünüm" className="flex gap-1 p-2 group">
                <div className={`w-1 h-1 rounded-full transition-colors ${view === "grid4" ? "bg-[#6f8f73]" : "bg-zinc-300 group-hover:bg-zinc-400"}`} />
                <div className={`w-1 h-1 rounded-full transition-colors ${view === "grid4" ? "bg-[#6f8f73]" : "bg-zinc-300 group-hover:bg-zinc-400"}`} />
                <div className={`w-1 h-1 rounded-full transition-colors ${view === "grid4" ? "bg-[#6f8f73]" : "bg-zinc-300 group-hover:bg-zinc-400"}`} />
                <div className={`w-1 h-1 rounded-full transition-colors ${view === "grid4" ? "bg-[#6f8f73]" : "bg-zinc-300 group-hover:bg-zinc-400"}`} />
              </Link>
            </div>
          </div>
        </div>

        <CategoryListingClient products={serializePrisma(products)} view={view as any} />

        {totalPages > 1 && (
          <nav
            className="mt-16 flex flex-wrap items-center justify-center gap-1 sm:gap-2"
            aria-label="Sayfa navigasyonu"
          >
            {page > 1 ? (
              <Link
                href={createFilterHref({ page: (page - 1).toString() })}
                className="flex h-10 min-w-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-600 transition hover:border-[#6f8f73] hover:text-[#6f8f73]"
              >
                Önceki
              </Link>
            ) : (
              <span className="flex h-10 min-w-10 cursor-not-allowed items-center justify-center rounded-md border border-zinc-100 bg-zinc-50 px-3 text-sm font-medium text-zinc-300">
                Önceki
              </span>
            )}
            {getVisiblePageNumbers(page, totalPages).map((item, idx) =>
              item === "ellipsis" ? (
                <span
                  key={`e-${idx}`}
                  className="flex h-10 w-10 items-center justify-center text-sm text-zinc-400"
                  aria-hidden
                >
                  …
                </span>
              ) : (
                <Link
                  key={item}
                  href={createFilterHref({ page: item.toString() })}
                  aria-current={page === item ? "page" : undefined}
                  className={`flex h-10 w-10 items-center justify-center rounded-md border text-sm font-medium transition ${page === item ? "border-[#6f8f73] bg-[#6f8f73] text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-[#6f8f73] hover:text-[#6f8f73]"}`}
                >
                  {item}
                </Link>
              )
            )}
            {page < totalPages ? (
              <Link
                href={createFilterHref({ page: (page + 1).toString() })}
                className="flex h-10 min-w-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-600 transition hover:border-[#6f8f73] hover:text-[#6f8f73]"
              >
                Sonraki
              </Link>
            ) : (
              <span className="flex h-10 min-w-10 cursor-not-allowed items-center justify-center rounded-md border border-zinc-100 bg-zinc-50 px-3 text-sm font-medium text-zinc-300">
                Sonraki
              </span>
            )}
          </nav>
        )}
      </main>

      <HomeFooter />
    </>
  )
}
