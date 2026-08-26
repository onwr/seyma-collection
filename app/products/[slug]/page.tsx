import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ProductDetailClient } from "@/components/product/ProductDetailClient"
import { HomeFooter } from "@/components/home/HomeFooter"
import { HomeHeader } from "@/components/home/HomeHeader"
import { prisma } from "@/lib/prisma"
import { serializePrisma } from "@/lib/serialize"
import { mapApiProductToDetailViewModel } from "@/lib/productDetailShape"

type Props = {
  params: Promise<{ slug: string }>
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.littlemomstore.com"

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await prisma.product.findUnique({
    where: { slug, isActive: true },
    select: { name: true }
  })

  if (!product) {
    return { title: "Ürün Bulunamadı" }
  }

  return {
    title: product.name,
    description: `${product.name} ürün detayları, beden seçenekleri ve taksitli ödeme seçenekleri.`,
    alternates: {
      canonical: `${siteUrl}/products/${slug}`,
    },
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params
  const product = await prisma.product.findUnique({
    where: { slug, isActive: true },
    include: {
      category: true,
      categories: { select: { category: { select: { id: true, name: true, slug: true } } } },
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true } }
    }
  })

  if (!product) {
    notFound()
  }

  const serializedProduct = serializePrisma(product)
  const extraCategories = (product.categories ?? [])
    .map((row) => row.category)
    .filter((c) => c && c.slug !== product.category?.slug)
  const productViewModel = mapApiProductToDetailViewModel(serializedProduct, {
    extraCategories: extraCategories.map((c) => ({ name: c.name, slug: c.slug })),
  })

  return (
    <>
      <main className="mx-auto w-full">
        <HomeHeader />

        <div className="max-w-screen-2xl mx-auto">
        <div className="my-6 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-zinc-500">
            <Link href="/" className="transition hover:text-[#6f8f73]">
              Anasayfa
            </Link>
            <span aria-hidden>›</span>
            <Link href={`/categories/${product.category?.slug}`} className="transition hover:text-[#6f8f73]">
              {product.category?.name}
            </Link>
            <span aria-hidden>›</span>
            <span className="font-medium text-zinc-800">{product.name}</span>
          </div>

          <Link href="/" className="text-zinc-500 transition hover:text-[#6f8f73]">
            &lt; &lt; Anasayfaya Dön
          </Link>
        </div>
        
        <ProductDetailClient product={productViewModel} />
        </div>
      </main>
      <HomeFooter />
    </>
  )
}
