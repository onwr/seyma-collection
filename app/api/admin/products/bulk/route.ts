import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"
import type { Prisma } from "@/generated/prisma/client"

function normalizeProductIds(ids: unknown): number[] {
  if (!Array.isArray(ids)) return []
  const nums = ids.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0)
  return [...new Set(nums)]
}

function roundMoney(n: number): number {
  return Math.round(Math.max(0, n) * 100) / 100
}

function applyPriceChange(current: number, mode: "percent" | "fixed", amount: number): number {
  if (mode === "percent") {
    if (amount <= -100) return 0
    return roundMoney(current * (1 + amount / 100))
  }
  return roundMoney(current + amount)
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    const body = await request.json()
    const { action, value } = body
    const ids = normalizeProductIds(body.ids)

    if (ids.length === 0) {
      return NextResponse.json({ message: "Ürün seçilmedi." }, { status: 400 })
    }

    if (action === "status_update") {
      await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { isActive: value === "ACTIVE" },
      })
      await logAdminActivity(prisma, session, {
        action: AdminActivityAction.PRODUCT_BULK,
        resourceType: "Product",
        metadata: { bulkAction: "status_update", count: ids.length, value },
        request,
      })
      return NextResponse.json({ message: `${ids.length} ürün durumu güncellendi.` })
    }

    if (action === "delete") {
      // Chunk the deletion to avoid timeout/deadlock with large sets
      const chunkSize = 50; // Biraz daha küçültelim
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        
        // Önce bağımlı ve kısıtlayıcı tabloları temizleyelim
        await prisma.cartItem.deleteMany({
          where: { productId: { in: chunk } }
        });
        
        await prisma.stockMovement.deleteMany({
          where: { productId: { in: chunk } }
        });

        await prisma.orderItem.deleteMany({
          where: { productId: { in: chunk } }
        });

        // Favoriler ve Yorumlar tabloları varsa onları da silelim
        try {
          // Prisma şemasında tanımlı olup olmadıklarına emin olmak için (eski versiyon ihtimaline karşı) catch ekliyoruz
          // @ts-ignore
          if (prisma.favorite) await prisma.favorite.deleteMany({ where: { productId: { in: chunk } } });
          // @ts-ignore
          if (prisma.review) await prisma.review.deleteMany({ where: { productId: { in: chunk } } });
        } catch (e) {
          console.log("Ignored favorite/review deletion");
        }

        // Ürün varyantlarındaki sepet, stok ve sipariş kayıtlarını da temizleyelim (Restrict oldukları için)
        await prisma.cartItem.deleteMany({
          where: { variant: { productId: { in: chunk } } }
        });

        await prisma.stockMovement.deleteMany({
          where: { variant: { productId: { in: chunk } } }
        });

        await prisma.orderItem.deleteMany({
          where: { variant: { productId: { in: chunk } } }
        });

        // Şimdi ürünleri silebiliriz (Resimler ve Varyantlar Cascade olduğu için otomatik silinir)
        await prisma.product.deleteMany({
          where: { id: { in: chunk } },
        });
      }
      
      await logAdminActivity(prisma, session, {
        action: AdminActivityAction.PRODUCT_BULK,
        resourceType: "Product",
        metadata: { bulkAction: "delete", count: ids.length },
        request,
      });
      return NextResponse.json({ message: `${ids.length} ürün başarıyla silindi.` })
    }

    if (action === "category_update") {
      const categoryId =
        value === null || value === "" || value === undefined
          ? null
          : Number(value)
      if (categoryId !== null && !Number.isInteger(categoryId)) {
        return NextResponse.json({ message: "Geçersiz kategori." }, { status: 400 })
      }
      await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { categoryId },
      })
      await logAdminActivity(prisma, session, {
        action: AdminActivityAction.PRODUCT_BULK,
        resourceType: "Product",
        metadata: { bulkAction: "category_update", count: ids.length, categoryId },
        request,
      })
      return NextResponse.json({ message: `${ids.length} ürünün ana kategorisi güncellendi.` })
    }

    if (action === "subcategory_update") {
      const subCategoryId =
        value === null || value === "" || value === undefined
          ? null
          : Number(value)
      if (subCategoryId !== null && !Number.isInteger(subCategoryId)) {
        return NextResponse.json({ message: "Geçersiz alt kategori." }, { status: 400 })
      }
      await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { subCategoryId },
      })
      await logAdminActivity(prisma, session, {
        action: AdminActivityAction.PRODUCT_BULK,
        resourceType: "Product",
        metadata: { bulkAction: "subcategory_update", count: ids.length, subCategoryId },
        request,
      })
      return NextResponse.json({ message: `${ids.length} ürünün alt kategorisi güncellendi.` })
    }

    if (action === "assign_categories") {
      const v = value as {
        categoryId?: number | null
        subCategoryId?: number | null
        extraCategoryId?: number
        stockThreshold?: number | null
      }
      
      const updateData: Prisma.ProductUncheckedUpdateManyInput = {}
      if ("categoryId" in v) updateData.categoryId = v.categoryId === null ? null : Number(v.categoryId)
      if ("subCategoryId" in v) updateData.subCategoryId = v.subCategoryId === null ? null : Number(v.subCategoryId)

      const baseWhere: any = { id: { in: ids } }
      if (v.stockThreshold != null) {
        // Toplam stoğu kontrol etmek için sum kullanamıyoruz updateMany'de, o yüzden variants üzerinden some bakıyoruz
        // Genelde bir varyantın stoğu düşükse ürün kritiktir.
        baseWhere.variants = { some: { stock: { lt: Number(v.stockThreshold) } } }
      }

      let updatedCount = ids.length

      if (Object.keys(updateData).length > 0) {
        const result = await prisma.product.updateMany({
          where: baseWhere,
          data: updateData,
        })
        updatedCount = result.count
      }

      // Ek kategori ataması (Many-to-Many)
      if (v.extraCategoryId) {
        const targetCatId = Number(v.extraCategoryId)
        // Koşula uyan ürünleri bul
        const productsToLink = await prisma.product.findMany({
          where: baseWhere,
          select: { id: true }
        })
        
        for (const p of productsToLink) {
          await prisma.productCategory.upsert({
            where: { productId_categoryId: { productId: p.id, categoryId: targetCatId } },
            create: { productId: p.id, categoryId: targetCatId },
            update: {} // Zaten varsa bir şey yapma
          })
        }
        updatedCount = productsToLink.length
      }

      await logAdminActivity(prisma, session, {
        action: AdminActivityAction.PRODUCT_BULK,
        resourceType: "Product",
        metadata: { bulkAction: "assign_categories", count: updatedCount, fields: Object.keys(v) },
        request,
      })

      return NextResponse.json({
        message: `${updatedCount} ürünün kategori bilgisi güncellendi.`,
      })
    }

    if (action === "price_adjust") {
      const mode = value?.mode as string
      const amount = Number(value?.amount)
      if (mode !== "percent" && mode !== "fixed") {
        return NextResponse.json(
          { message: "Fiyat modu 'percent' veya 'fixed' olmalı." },
          { status: 400 }
        )
      }
      if (!Number.isFinite(amount)) {
        return NextResponse.json({ message: "Geçersiz tutar." }, { status: 400 })
      }

      const products = await prisma.product.findMany({
        where: { id: { in: ids } },
        include: { variants: true },
      })

      for (const p of products) {
        const nextBase = applyPriceChange(Number(p.basePrice), mode, amount)
        const nextCompare =
          p.compareAtPrice != null
            ? applyPriceChange(Number(p.compareAtPrice), mode, amount)
            : null

        await prisma.product.update({
          where: { id: p.id },
          data: {
            basePrice: nextBase,
            ...(nextCompare !== null ? { compareAtPrice: nextCompare } : {}),
          },
        })

        for (const v of p.variants) {
          const nextVar = applyPriceChange(Number(v.price), mode, amount)
          await prisma.productVariant.update({
            where: { id: v.id },
            data: { price: nextVar },
          })
        }
      }

      const label = mode === "percent" ? `%${amount}` : `₺${amount}`
      await logAdminActivity(prisma, session, {
        action: AdminActivityAction.PRODUCT_BULK,
        resourceType: "Product",
        metadata: { bulkAction: "price_adjust", count: products.length, mode, amount },
        request,
      })
      return NextResponse.json({
        message: `${products.length} ürünün fiyatı güncellendi (${label}).`,
      })
    }

    if (action === "tax_update") {
      const taxRate = Number(value)
      if (Number.isNaN(taxRate) || taxRate < 0) {
        return NextResponse.json({ message: "Geçersiz vergi oranı." }, { status: 400 })
      }
      
      await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { taxRate },
      })
      
      await logAdminActivity(prisma, session, {
        action: AdminActivityAction.PRODUCT_BULK,
        resourceType: "Product",
        metadata: { bulkAction: "tax_update", count: ids.length, taxRate },
        request,
      })
      
      return NextResponse.json({ message: `${ids.length} ürünün vergi oranı %${taxRate} olarak güncellendi.` })
    }

    if (action === "auto_barcode") {
      // Önce seçili ürünlerin mevcut barkod durumunu çek
      const allSelected = await prisma.product.findMany({
        where: { id: { in: ids } },
        select: { id: true, barcode: true },
      })

      // null veya boş string olan ürünleri filtrele
      const withoutBarcode = allSelected.filter(p => !p.barcode || p.barcode.trim() === "")

      if (withoutBarcode.length === 0) {
        return NextResponse.json({ message: "Seçili ürünlerin tamamında zaten barkod mevcut." })
      }

      // Geçerli EAN-13 barkod üret (869 ile başlar - Türkiye)
      const generateEan13 = () => {
        const prefix = "869"
        const mid = String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, "0")
        const digits = (prefix + mid).split("").map(Number)
        const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0)
        const check = (10 - (sum % 10)) % 10
        return prefix + mid + check
      }

      for (const p of withoutBarcode) {
        await prisma.product.update({
          where: { id: p.id },
          data: { barcode: generateEan13() },
        })
      }

      const skipped = allSelected.length - withoutBarcode.length

      await logAdminActivity(prisma, session, {
        action: AdminActivityAction.PRODUCT_BULK,
        resourceType: "Product",
        metadata: { bulkAction: "auto_barcode", assigned: withoutBarcode.length, skipped },
        request,
      })

      const msg = skipped > 0
        ? `${withoutBarcode.length} ürüne barkod atandı. ${skipped} ürünün zaten barkodu vardı, es geçildi.`
        : `${withoutBarcode.length} ürüne otomatik barkod atandı.`

      return NextResponse.json({ message: msg })
    }

    return NextResponse.json({ message: "Geçersiz işlem." }, { status: 400 })
  } catch (error) {
    console.error("Product bulk action error:", error)
    return NextResponse.json({ message: "Sunucu hatası." }, { status: 500 })
  }
}
