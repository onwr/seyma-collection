import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { saveFile } from "@/lib/storage"
import slugify from "slugify"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const query = searchParams.get("q") || ""
    const categoryId = searchParams.get("categoryId")
    const skip = (page - 1) * limit

    const sort = searchParams.get("sort") || "createdAt"
    const dir = searchParams.get("dir") || "desc"

    const where: any = {}
    
    if (categoryId) {
      const parsed = parseInt(categoryId)
      if (!Number.isNaN(parsed)) {
        where.OR = [
          { categoryId: parsed },
          { subCategoryId: parsed },
          { categories: { some: { categoryId: parsed } } },
        ]
      }
    }

    if (query) {
      where.OR = [
        { name: { contains: query } },
        { sku: { contains: query } },
        { barcode: { contains: query } },
        { description: { contains: query } },
      ]
    }

    const orderBy: any = {}
    if (sort === "stock") {
      // Prismada relation aggregation sorting desteklenmediği durumlarda basit tutuyoruz,
      // ama basePrice, name, createdAt kullanılabilir.
      orderBy["createdAt"] = dir
    } else {
      orderBy[sort] = dir
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: {
            select: {
              name: true
            }
          },
          images: {
            where: { isCover: true },
            take: 1
          }
        }
      }),
      prisma.product.count({ where })
    ])

    return NextResponse.json({
      items: products,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error: any) {
    console.error("Products GET error:", error)
    return NextResponse.json({ message: "Hata oluştu." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    const data = await request.json()
    const { 
      name, 
      description, 
      shortDescription, 
      categoryId, 
      categoryIds,
      basePrice, 
      compareAtPrice, 
      sku, 
      barcode, 
      isActive, 
      isFeatured,
      taxRate,
      isTaxIncluded,
      metaTitle,
      metaDescription,
      images, 
      variants,
      subCategoryId
    } = data

    if (!name || basePrice === undefined) {
      return NextResponse.json({ message: "Ad ve temel fiyat zorunludur." }, { status: 400 })
    }

    // SKU çakışması kontrolü (hem ana ürün hem varyantlarda)
    if (sku) {
      const existingInProduct = await prisma.product.findFirst({ where: { sku: String(sku) } })
      const existingInVariant = await prisma.productVariant.findFirst({ where: { sku: String(sku) } })
      if (existingInProduct || existingInVariant) {
        return NextResponse.json({ message: `"${sku}" stok kodu (SKU) zaten başka bir üründe veya varyantta kullanılıyor.` }, { status: 400 })
      }
    }

    // Slug oluştur (Türkçe karakter desteği ile)
    let slug = slugify(name, { lower: true, strict: true, locale: 'tr' })
    
    // Slug çakışması kontrolü
    let existing = await prisma.product.findUnique({ where: { slug } })
    let counter = 1
    let originalSlug = slug
    while (existing) {
      slug = `${originalSlug}-${counter}`
      existing = await prisma.product.findUnique({ where: { slug } })
      counter++
    }

    // Görselleri CDN'e kaydet
    const finalImageUrls = await Promise.all(
       (images || []).map((img: any) => {
          const url = typeof img === 'string' ? img : img.url
          return saveFile(url, "products")
       })
    )
    const validImages = finalImageUrls.filter(url => url !== null) as string[]

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        shortDescription,
        categoryId: categoryId ? Number(categoryId) : null,
        subCategoryId: subCategoryId ? Number(subCategoryId) : null,
        basePrice: Number(basePrice),
        compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
        sku,
        barcode,
        isActive: isActive ?? true,
        isFeatured: isFeatured ?? false,
        taxRate: taxRate ? Number(taxRate) : 20,
        isTaxIncluded: isTaxIncluded ?? true,
        metaTitle,
        metaDescription,
        images: {
          create: validImages.map((url: string, index: number) => ({
            url,
            sortOrder: index,
            isCover: index === 0
          }))
        },
        variants: {
          create: (variants || []).map((v: any) => ({
            name: v.name || "Standart",
            sku: v.sku || `${sku || slug}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
            price: Number(v.price || basePrice),
            stock: Number(v.stock || 0),
            lowStockThreshold: Number(v.lowStockThreshold || 5),
            isActive: true
          }))
        }
      },
      include: {
        categories: { select: { categoryId: true } },
      },
    })

    // Çoklu kategori linkleri (primary + seçili)
    const extraIds = Array.isArray(categoryIds) ? categoryIds : []
    const ids = Array.from(
      new Set(
        [categoryId ? Number(categoryId) : null, subCategoryId ? Number(subCategoryId) : null, ...extraIds]
          .map((n) => (n === null || n === undefined ? null : Number(n)))
          .filter((n): n is number => Number.isInteger(n))
      )
    )
    if (ids.length) {
      await prisma.productCategory.createMany({
        data: ids.map((cid) => ({ productId: product.id, categoryId: cid })),
        skipDuplicates: true,
      })
    }

    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.PRODUCT_CREATE,
      resourceType: "Product",
      resourceId: String(product.id),
      metadata: { slug: product.slug, name: String(name ?? "").slice(0, 120) },
      request,
    })
    return NextResponse.json(product, { status: 201 })
  } catch (error: any) {
    console.error("Product creation error:", error)
    if (error.code === 'P2002') {
      return NextResponse.json({ message: "Bu SKU veya barkod zaten başka bir üründe kullanılıyor." }, { status: 400 })
    }
    return NextResponse.json({ message: "Ürün eklenirken bir hata oluştu: " + error.message }, { status: 500 })
  }
}
