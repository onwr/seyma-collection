import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { saveFile } from "@/lib/storage"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      include: {
        images: {
          orderBy: { sortOrder: "asc" }
        },
        variants: true,
        category: true,
        subCategory: true,
        categories: { select: { categoryId: true } },
      }
    })

    if (!product) {
      return NextResponse.json({ message: "Ürün bulunamadı." }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error: any) {
    console.error("Product GET error:", error)
    return NextResponse.json({ message: "Ürün yüklenirken bir hata oluştu." }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
      subCategoryId,
      categoryIds,
      basePrice,
      compareAtPrice,
      sku,
      barcode,
      isActive,
      isFeatured,
      taxRate,
      isTaxIncluded,
      images,
      variants,
      metaTitle,
      metaDescription,
      slug,
      createdAt
    } = data

    const productId = Number(id)

    // SKU çakışması kontrolü
    if (sku) {
      const existingInProduct = await prisma.product.findFirst({
        where: { sku: String(sku), id: { not: productId } }
      })
      const existingInVariant = await prisma.productVariant.findFirst({
        where: { sku: String(sku), productId: { not: productId } }
      })
      if (existingInProduct || existingInVariant) {
        return NextResponse.json({ message: `"${sku}" stok kodu zaten başka bir üründe kullanılıyor.` }, { status: 400 })
      }
    }

    // Sadece gönderilen alanları güncellemek için bir updateData objesi oluştur
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (slug !== undefined) updateData.slug = slug
    if (description !== undefined) updateData.description = description
    if (shortDescription !== undefined) updateData.shortDescription = shortDescription
    if (categoryId !== undefined) updateData.categoryId = categoryId ? Number(categoryId) : null
    if (subCategoryId !== undefined) updateData.subCategoryId = subCategoryId ? Number(subCategoryId) : null
    if (basePrice !== undefined) updateData.basePrice = Number(basePrice)
    if (compareAtPrice !== undefined) updateData.compareAtPrice = compareAtPrice ? Number(compareAtPrice) : null
    if (sku !== undefined) updateData.sku = sku
    if (barcode !== undefined) updateData.barcode = barcode
    if (isActive !== undefined) updateData.isActive = isActive
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured
    if (taxRate !== undefined) updateData.taxRate = Number(taxRate)
    if (isTaxIncluded !== undefined) updateData.isTaxIncluded = isTaxIncluded
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription
    if (createdAt) updateData.createdAt = new Date(createdAt)

    // Görseller ve varyantlar varsa işlem yap
    if (images !== undefined || variants !== undefined || categoryIds !== undefined) {
      return await prisma.$transaction(async (tx) => {
        if (images !== undefined) {
          const processedImages = await Promise.all(
            (images || []).map((img: any) => {
              const url = typeof img === 'string' ? img : img.url
              return saveFile(url, "products")
            })
          )
          const validImageUrls = processedImages.filter(url => url !== null) as string[]

          await tx.productImage.deleteMany({ where: { productId: Number(id) } })
          updateData.images = {
            create: validImageUrls.map((url: string, index: number) => ({
              url,
              sortOrder: index,
              isCover: index === 0
            }))
          }
        }

        if (variants !== undefined) {
          // Varyantlar silinip yeniden oluşturuluyor (yeni ID alıyorlar) — Trendyol'a bildirilen
          // kalıcı barkodu VE "zaten gönderildi" işaretini (SKU eşleşmesine göre) kaybetmemek için
          // önce eskilerini kaydediyoruz. trendyolListedAt taşınmazsa, her düzenlemede (basit bir
          // stok güncellemesi bile) otomatik tarama ürünü "hiç gönderilmemiş" sanıp Trendyol'da
          // zaten var olan ürünü tekrar "oluşturmaya" çalışıyor — ki bu her zaman başarısız olur.
          const oldVariants = await tx.productVariant.findMany({
            where: { productId: Number(id) },
            select: { sku: true, barcode: true, trendyolListedAt: true },
          })
          const barcodeBySku = new Map(
            oldVariants.filter((v) => v.barcode).map((v) => [v.sku, v.barcode])
          )
          const listedAtBySku = new Map(
            oldVariants.filter((v) => v.trendyolListedAt).map((v) => [v.sku, v.trendyolListedAt])
          )

          await tx.productVariant.deleteMany({ where: { productId: Number(id) } })
          updateData.variants = {
            create: (variants || []).map((v: any) => {
              const newSku = v.sku || `${sku || slug || 'VAR'}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
              return {
                name: v.name || "Standart",
                sku: newSku,
                barcode: barcodeBySku.get(newSku) ?? null,
                trendyolListedAt: listedAtBySku.get(newSku) ?? null,
                price: Number(v.price || (basePrice || 0)),
                compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
                stock: Number(v.stock || 0),
                lowStockThreshold: Number(v.lowStockThreshold || 5),
                isActive: true
              }
            })
          }
        }

        if (categoryIds !== undefined) {
          const extraIds = Array.isArray(categoryIds) ? categoryIds : []
          const primary = categoryId !== undefined ? (categoryId ? Number(categoryId) : null) : undefined
          const sub = subCategoryId !== undefined ? (subCategoryId ? Number(subCategoryId) : null) : undefined

          const ids = Array.from(
            new Set(
              [
                ...(primary === undefined ? [] : [primary]),
                ...(sub === undefined ? [] : [sub]),
                ...extraIds,
              ]
                .map((n) => (n === null || n === undefined ? null : Number(n)))
                .filter((n): n is number => Number.isInteger(n))
            )
          )

          await tx.productCategory.deleteMany({ where: { productId: Number(id) } })
          if (ids.length) {
            await tx.productCategory.createMany({
              data: ids.map((cid) => ({ productId: Number(id), categoryId: cid })),
              skipDuplicates: true,
            })
          }
        }

        const updated = await tx.product.update({
          where: { id: Number(id) },
          data: updateData
        })
        await logAdminActivity(prisma, session, {
          action: AdminActivityAction.PRODUCT_UPDATE,
          resourceType: "Product",
          resourceId: String(id),
          metadata: { slug: updated.slug, name: updated.name, mediaOrVariants: true },
          request,
        })
        return NextResponse.json(updated)
      })
    }

    // Sadece basit alanlar güncellenecekse
    const updatedProduct = await prisma.product.update({
      where: { id: Number(id) },
      data: updateData
    })

    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.PRODUCT_UPDATE,
      resourceType: "Product",
      resourceId: String(id),
      metadata: { slug: updatedProduct.slug, name: updatedProduct.name },
      request,
    })
    return NextResponse.json(updatedProduct)
  } catch (error: any) {
    console.error("Product PUT error:", error)
    if (error.code === 'P2002') {
      return NextResponse.json({ message: "Bu SKU veya barkod zaten kullanılıyor." }, { status: 400 })
    }
    return NextResponse.json({ message: "Ürün güncellenirken bir hata oluştu: " + error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    await prisma.product.delete({
      where: { id: Number(id) }
    })

    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.PRODUCT_DELETE,
      resourceType: "Product",
      resourceId: String(id),
      request,
    })
    return NextResponse.json({ message: "Ürün silindi." })
  } catch (error: any) {
    console.error("Product DELETE error:", error)
    return NextResponse.json({ message: "Ürün silinirken bir hata oluştu." }, { status: 500 })
  }
}
