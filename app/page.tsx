import { HomeCategories } from "@/components/home/HomeCategories"
import { HomeFooter } from "@/components/home/HomeFooter"
import { HomeHeader } from "@/components/home/HomeHeader"
import { HomeProductsSection } from "@/components/home/HomeProductsSection"
import { HomePromoBanner } from "@/components/home/HomePromoBanner"
import { HomeSlider } from "@/components/home/HomeSlider"
import { HomeTestimonials } from "@/components/home/HomeTestimonials"
import { HomeFaqSection } from "@/components/home/HomeFaqSection"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// Yönetim panelinden slider eklenmediği sürece gösterilecek statik yedek banner.
const STATIC_FALLBACK_SLIDE = {
  title: null,
  subtitle: null,
  buttonText: null,
  imageUrl: "/banner.png",
  mobileImageUrl: "/mobilbanner.png",
  linkUrl: null,
  isActive: true,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
}

const STATIC_FALLBACK_SLIDES = [0, 1, 2].map((index) => ({
  ...STATIC_FALLBACK_SLIDE,
  id: -(index + 1),
  sortOrder: index,
}))

export default async function HomePage() {
  // Verileri paralel olarak çek
  const [
    slidersDb,
    bannersDb,
    homeCategoriesDb,
    featuredProductsDb,
    faqsDb,
    approvedReviewsDb,
    homeSectionsDb
  ] = await Promise.all([
    prisma.slider.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.banner.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.category.findMany({
      where: { showOnHome: true },
      orderBy: { sortOrder: 'asc' }
    }),
    prisma.product.findMany({
      where: { isFeatured: true, isActive: true },
      include: {
        images: true,
        category: { select: { name: true } }
      },
      take: 12
    }),
    prisma.faq.findMany({ where: { isActive: true, showOnHome: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.review.findMany({
      where: { status: 'APPROVED' },
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        product: { select: { name: true } }
      }
    }),
    prisma.homeProductSection.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        category: true
      }
    })
  ])

  // Client Component'lere gönderilecek verileri serialize et (Decimal ve Date objeleri düzleştirilmeli)
  const sliders = slidersDb.length > 0
    ? slidersDb.map(s => ({ ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() }))
    : STATIC_FALLBACK_SLIDES
  const banners = bannersDb.map(b => ({ ...b, createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString() }))
  const homeCategories = homeCategoriesDb.map(c => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() }))

  const featuredProducts = featuredProductsDb.map(p => ({
    ...p,
    category: p.category ?? undefined,
    basePrice: Number(p.basePrice),
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : undefined,
    taxRate: Number(p.taxRate),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    images: p.images.map(img => ({ url: img.url, isCover: img.isCover }))
  }))

  const faqs = faqsDb.map(f => ({ ...f, createdAt: f.createdAt.toISOString(), updatedAt: f.updatedAt.toISOString() }))

  const approvedReviews = approvedReviewsDb.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString()
  }))

  const homeSections = await Promise.all(homeSectionsDb.map(async (section) => {
    let sectionProducts: any[] = []

    if (section.type === "CATEGORY" && section.categoryId) {
      const dbProds = await prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { categoryId: section.categoryId },
            { subCategoryId: section.categoryId },
            { categories: { some: { categoryId: section.categoryId } } }
          ]
        },
        orderBy: { createdAt: "desc" },
        take: 12,
        include: { images: true, category: { select: { name: true } } }
      })

      sectionProducts = dbProds.map(p => ({
        ...p,
        category: p.category ?? undefined,
        basePrice: Number(p.basePrice),
        compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : undefined,
        taxRate: Number(p.taxRate),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        images: p.images.map(img => ({ url: img.url, isCover: img.isCover }))
      }))
    } else if (section.type === "PRODUCT_LIST" && section.productsJson) {
      try {
        const ids = JSON.parse(section.productsJson) as number[]
        const dbProds = await prisma.product.findMany({
          where: { id: { in: ids }, isActive: true },
          include: { images: true, category: { select: { name: true } } }
        })
        const byId = new Map(dbProds.map((p) => [p.id, p]))
        sectionProducts = ids
          .map((id) => byId.get(id))
          .filter((p): p is NonNullable<typeof p> => Boolean(p))
          .map((p) => ({
            ...p,
            category: p.category ?? undefined,
            basePrice: Number(p.basePrice),
            compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : undefined,
            taxRate: Number(p.taxRate),
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
            images: p.images.map(img => ({ url: img.url, isCover: img.isCover }))
          }))
      } catch (e) { }
    }

    return {
      id: section.id,
      title: section.title,
      subtitle: section.subtitle,
      products: sectionProducts
    }
  }))

  return (
    <>
      <main className="mx-auto w-full flex-1">
        <HomeHeader />

        <div className="max-w-screen-2xl mx-auto">

          {/* Hero Slider */}
          <HomeSlider slides={sliders} />

          {/* Öne Çıkan Ürünler (Statik Yeni Ürünler) */}
          <HomeProductsSection title="Yeni Ürünler" products={featuredProducts} />

          {/* Dinamik Ürün Bölümleri (Panelden Yönetilen) */}
          {homeSections.map((section) => (
            <HomeProductsSection
              key={section.id}
              title={section.title}
              subtitle={section.subtitle || undefined}
              products={section.products}
            />
          ))}

          {/* Vitrin Kategorileri */}
          <HomeCategories categories={homeCategories} />

          {/* Promosyon Bannerları - Üst */}
          <HomePromoBanner banners={banners.filter(b => b.position === 'top-row')} />


          {/* Diğer Ürünler veya Bannerlar */}
          <HomePromoBanner banners={banners.filter(b => b.position === 'middle-row')} />

          {/* Alt Bannerlar */}
          <HomePromoBanner banners={banners.filter(b => b.position === 'bottom-row')} />

          {/* SSS */}
          <HomeFaqSection items={faqs} />
        </div>
      </main>
      <HomeFooter />
    </>
  )
}
