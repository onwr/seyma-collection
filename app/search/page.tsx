import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { HomeHeader } from "@/components/home/HomeHeader"
import { HomeFooter } from "@/components/home/HomeFooter"
import { CategoryListingClient } from "@/components/category/CategoryListingClient"
import Link from "next/link"
import { serializePrisma } from "@/lib/serialize"

type Props = {
  searchParams: Promise<{ q?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams
  return {
    title: q ? `"${q}" İçin Arama Sonuçları` : "Arama",
    description: "Aradığınız ürünleri Little Mom's Store'da bulun."
  }
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams
  
  const products = q ? await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: q } },
        { description: { contains: q } },
        { slug: { contains: q } }
      ]
    },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      variants: { where: { isActive: true }, take: 1 }
    },
    take: 40
  }) : []

  return (
    <>
      <HomeHeader />
      
      <main className="mx-auto w-full max-w-screen-2xl px-4 py-12 md:px-8">
        <div className="mb-10 flex flex-col items-center gap-4 text-center">
           <h1 className="text-3xl font-black text-zinc-900 md:text-5xl">
             {q ? `"${q}"` : "Arama Sonuçları"}
           </h1>
           <p className="text-zinc-500 font-medium">
             {products.length > 0 
               ? `${products.length} ürün bulundu.` 
               : q ? "Aradığınız kriterlere uygun ürün bulunamadı." : "Lütfen bir arama terimi girin."}
           </p>
           <div className="h-1 w-20 bg-[#6f8f73] rounded-full" />
        </div>

        {products.length > 0 ? (
          <CategoryListingClient products={serializePrisma(products)} view="grid4" />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-200 rounded-3xl bg-zinc-50/50">
            <span className="text-6xl mb-4 opacity-20">🔍</span>
            <p className="text-zinc-400 font-bold uppercase tracking-widest">Arama sonucu yok</p>
            <Link href="/" className="mt-6 text-sm font-bold text-[#6f8f73] hover:underline">
              Anasayfaya Dön
            </Link>
          </div>
        )}
      </main>

      <HomeFooter />
    </>
  )
}
