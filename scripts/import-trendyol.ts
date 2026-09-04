/**
 * Trendyol → Prisma ürün aktarımı (kategorilerle birlikte)
 *
 * Ortam: `.env` içinde `DATABASE_URL`, `TRENDYOL_SUPPLIER_ID`, `TRENDYOL_API_KEY`, `TRENDYOL_API_SECRET`
 *
 * Kullanım (proje kökünden):
 *   npm run import:trendyol
 *   npm run import:trendyol -- --dry-run --limit=10
 *
 * Trendyol'un ürün listeleme API'si "satır = barkod/varyant" döner; aynı `productMainId`'ye
 * sahip satırlar tek bir ürünün bedeni/varyantı olarak gruplanır. Yeniden çalıştırma
 * `trendyolProductMainId` (Product) ve `barcode` (ProductVariant) alanları üzerinden eşleştirme
 * yapıp mevcut kaydı günceller — aynı ürünü tekrar tekrar oluşturmaz.
 *
 * Güvenlik: API anahtarlarını asla repoya veya sohbete yapıştırmayın; sadece yerel .env kullanın.
 */

import * as path from "node:path"
import * as dotenv from "dotenv"
import slugify from "slugify"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import { PrismaClient } from "../generated/prisma/client"
import type { Prisma } from "../generated/prisma/client"

dotenv.config({ path: path.join(process.cwd(), ".env") })

const BASE_URL = "https://apigw.trendyol.com/integration"

type TyImage = { url: string }
type TyAttribute = {
  attributeId: number
  attributeName: string
  attributeValue: string
  attributeValueId?: number
}
type TyProductRow = {
  id: string
  productMainId: string
  barcode: string
  title: string
  description: string
  brand: string
  brandId: number
  categoryName: string
  pimCategoryId: number
  images: TyImage[]
  listPrice: number
  salePrice: number
  quantity: number
  stockCode: string
  vatRate: number
  approved: boolean
  archived: boolean
  blacklisted: boolean
  rejected: boolean
  attributes: TyAttribute[]
}
type TyProductsResponse = {
  page: number
  size: number
  totalElements: number
  totalPages: number
  content: TyProductRow[]
}

function parseArgs() {
  const argv = process.argv.slice(2)
  const dryRun = argv.includes("--dry-run")
  let limit = Number.POSITIVE_INFINITY
  const li = argv.indexOf("--limit")
  if (li !== -1) {
    const n = parseInt(argv[li + 1] ?? "", 10)
    if (Number.isFinite(n) && n > 0) limit = n
  }
  return { dryRun, limit }
}

function authHeaders(): Record<string, string> {
  const supplierId = process.env.TRENDYOL_SUPPLIER_ID?.trim()
  const apiKey = process.env.TRENDYOL_API_KEY?.trim()
  const apiSecret = process.env.TRENDYOL_API_SECRET?.trim()
  if (!supplierId || !apiKey || !apiSecret) {
    throw new Error("Eksik ortam: TRENDYOL_SUPPLIER_ID, TRENDYOL_API_KEY, TRENDYOL_API_SECRET (.env)")
  }
  const token = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")
  return {
    Authorization: `Basic ${token}`,
    "User-Agent": `${supplierId} - Self Integration`,
    "Content-Type": "application/json",
  }
}

async function fetchAllTrendyolProducts(): Promise<TyProductRow[]> {
  const supplierId = process.env.TRENDYOL_SUPPLIER_ID!.trim()
  const out: TyProductRow[] = []
  let page = 0
  const size = 200
  for (;;) {
    const res = await fetch(
      `${BASE_URL}/product/sellers/${supplierId}/products?page=${page}&size=${size}`,
      { headers: authHeaders() }
    )
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`Trendyol API hatası (${res.status}): ${text.slice(0, 300)}`)
    }
    const data = (await res.json()) as TyProductsResponse
    out.push(...data.content)
    if (page >= data.totalPages - 1 || data.content.length === 0) break
    page += 1
  }
  return out
}

function cleanDescription(raw: string | null | undefined): string | null {
  if (!raw) return null
  const cleaned = raw
    .replace(/<[^>]+>/g, " ")
    .replace(/;\s*-\s*/g, "\n- ")
    .replace(/\s+\n/g, "\n")
    .trim()
  return cleaned || null
}

function stockCodeOrBarcode(row: TyProductRow): string {
  const sc = row.stockCode?.trim()
  return sc && sc.length > 0 ? sc : row.barcode
}

async function resolveProductSlug(
  prisma: PrismaClient,
  title: string,
  productMainId: string,
  ownProductId?: number
): Promise<string> {
  const base = slugify(title, { lower: true, strict: true }) || slugify(productMainId, { lower: true, strict: true })
  let candidate = base
  let n = 0
  for (;;) {
    const other = await prisma.product.findUnique({ where: { slug: candidate } })
    if (!other) return candidate
    if (ownProductId != null && other.id === ownProductId) return candidate
    if (other.trendyolProductMainId === productMainId) return candidate
    n += 1
    candidate = `${base}-ty-${n}`
  }
}

// Kategori adı -> yerel Category.id
const categoryCache = new Map<string, number>()

async function resolveCategory(
  prisma: PrismaClient | null,
  categoryName: string,
  trendyolCategoryId: number | null
): Promise<number | null> {
  const name = categoryName?.trim()
  if (!name) return null
  if (categoryCache.has(name)) return categoryCache.get(name)!
  if (!prisma) return null
  const slug = slugify(name, { lower: true, strict: true }) || `kategori-${categoryCache.size + 1}`
  const row = await prisma.category.upsert({
    where: { slug },
    create: { name, slug, trendyolCategoryId },
    update: { name, ...(trendyolCategoryId ? { trendyolCategoryId } : {}) },
  })
  categoryCache.set(name, row.id)
  return row.id
}

async function importOneProduct(
  prisma: PrismaClient | null,
  productMainId: string,
  rows: TyProductRow[],
  opts: { dryRun: boolean }
): Promise<{ ok: boolean; message: string }> {
  if (!opts.dryRun && !prisma) throw new Error("Veritabanı bağlantısı gerekli (dry-run değil).")

  const usableRows = rows.filter((r) => !r.blacklisted && !r.rejected)
  if (usableRows.length === 0) {
    return { ok: false, message: `atlandı (reddedilmiş/kara listede): ${productMainId}` }
  }

  const first = usableRows[0]
  const title = first.title
  const categoryId = await resolveCategory(prisma, first.categoryName, first.pimCategoryId ?? null)

  const description = cleanDescription(first.description)
  const shortDescription = null

  const imagesSource = usableRows.reduce(
    (best, r) => (r.images?.length > best.images.length ? r : best),
    usableRows[0]
  ).images
  const imageInputs = (imagesSource ?? [])
    .filter((img) => img?.url)
    .map((img, i) => ({ url: img.url, alt: title, sortOrder: i, isCover: i === 0 }))

  const prices = usableRows.map((r) => Number(r.salePrice) || Number(r.listPrice) || 0).filter((p) => p > 0)
  const basePrice = prices.length ? Math.min(...prices) : 0

  const variantsToCreate = usableRows.map((row) => {
    const bedenAttr = row.attributes?.find((a) => a.attributeName === "Beden")
    const name =
      bedenAttr?.attributeValue ? `Beden: ${bedenAttr.attributeValue}` : usableRows.length > 1 ? `Varyant: ${row.barcode}` : "Standart"
    const sku = stockCodeOrBarcode(row)
    const price = Number(row.salePrice) || Number(row.listPrice) || 0
    const compareAtPrice = row.listPrice > price ? row.listPrice : null
    return {
      name,
      sku,
      barcode: row.barcode,
      price,
      compareAtPrice,
      stock: Math.max(0, Math.floor(row.quantity || 0)),
      isActive: row.approved && !row.archived,
    }
  })

  if (opts.dryRun) {
    return {
      ok: true,
      message: `[dry-run] ${productMainId} ${title} | Kat: ${first.categoryName} | Varyant: ${variantsToCreate.length} | slug≈${slugify(title, { lower: true, strict: true })}`,
    }
  }

  const existing = await prisma!.product.findUnique({ where: { trendyolProductMainId: productMainId } })
  const resolvedSlug = await resolveProductSlug(prisma!, title, productMainId, existing?.id)

  const dataCore: Prisma.ProductUncheckedUpdateInput = {
    name: title,
    slug: resolvedSlug,
    trendyolProductMainId: productMainId,
    description,
    shortDescription,
    basePrice,
    categoryId,
    isActive: variantsToCreate.some((v) => v.isActive),
    metaTitle: title.slice(0, 191),
  }

  await prisma!.$transaction(async (tx) => {
    const p = existing
      ? await tx.product.update({ where: { id: existing.id }, data: dataCore })
      : await tx.product.create({
          data: {
            name: title,
            slug: resolvedSlug,
            trendyolProductMainId: productMainId,
            description,
            shortDescription,
            basePrice,
            categoryId,
            isActive: variantsToCreate.some((v) => v.isActive),
            metaTitle: title.slice(0, 191),
          },
        })

    await tx.productImage.deleteMany({ where: { productId: p.id } })
    if (imageInputs.length > 0) {
      await tx.productImage.createMany({
        data: imageInputs.map((im) => ({
          productId: p.id,
          url: im.url,
          alt: im.alt,
          sortOrder: im.sortOrder,
          isCover: im.isCover,
        })),
      })
    }

    for (const v of variantsToCreate) {
      const skuOwner = await tx.productVariant.findUnique({ where: { sku: v.sku } })
      if (skuOwner && skuOwner.barcode !== v.barcode) {
        // Trendyol tarafında stockCode başka bir barkodla çakışıyor — barkodu ekleyerek ayrıştır.
        v.sku = `${v.sku}-${v.barcode.slice(-6)}`
      }

      const existingVariant = await tx.productVariant.findUnique({ where: { barcode: v.barcode } })
      if (existingVariant && existingVariant.productId === p.id) {
        await tx.productVariant.update({
          where: { id: existingVariant.id },
          data: {
            name: v.name,
            sku: v.sku,
            price: v.price,
            compareAtPrice: v.compareAtPrice,
            stock: v.stock,
            isActive: v.isActive,
            // Bu varyant Trendyol'dan geldi, yani zaten orada listeli — "yeni ürün gönder"
            // taraması bunu tekrar "hiç gönderilmemiş" sanıp Trendyol'a geri göndermesin.
            trendyolListedAt: existingVariant.trendyolListedAt ?? new Date(),
          },
        })
      } else if (existingVariant) {
        // Barkod başka bir ürüne bağlıysa (üründe değişiklik olmuş olabilir) o kaydı taşı.
        await tx.productVariant.update({
          where: { id: existingVariant.id },
          data: {
            productId: p.id,
            name: v.name,
            sku: v.sku,
            price: v.price,
            compareAtPrice: v.compareAtPrice,
            stock: v.stock,
            isActive: v.isActive,
          },
        })
      } else {
        await tx.productVariant.create({
          data: {
            productId: p.id,
            name: v.name,
            sku: v.sku,
            barcode: v.barcode,
            price: v.price,
            compareAtPrice: v.compareAtPrice,
            stock: v.stock,
            isActive: v.isActive,
            trendyolListedAt: new Date(),
          },
        })
      }
    }
  })

  return { ok: true, message: `kaydedildi: ${productMainId} ${title} (${resolvedSlug}) — ${variantsToCreate.length} varyant` }
}

async function main() {
  const { dryRun, limit } = parseArgs()

  const dbUrl = process.env.DATABASE_URL?.trim()
  if (!dryRun && !dbUrl) {
    console.error("DATABASE_URL tanımlı değil (dry-run değilse zorunlu).")
    process.exit(1)
  }

  console.log("Trendyol ürünleri çekiliyor…")
  const rows = await fetchAllTrendyolProducts()
  console.log(`Toplam ${rows.length} satır (barkod/varyant) bulundu.`)

  const groups = new Map<string, TyProductRow[]>()
  for (const row of rows) {
    const list = groups.get(row.productMainId) ?? []
    list.push(row)
    groups.set(row.productMainId, list)
  }
  console.log(`${groups.size} benzersiz ürün (productMainId) tespit edildi.`)

  let prisma: PrismaClient | null = null
  if (!dryRun) {
    const adapter = new PrismaMariaDb(dbUrl!)
    prisma = new PrismaClient({ adapter })
  }

  const entries = Array.from(groups.entries()).slice(0, Number.isFinite(limit) ? limit : groups.size)
  console.log(`İşlenecek: ${entries.length}${dryRun ? " (dry-run)" : ""}`)

  let ok = 0
  let fail = 0
  for (const [productMainId, productRows] of entries) {
    try {
      const r = await importOneProduct(prisma, productMainId, productRows, { dryRun })
      if (r.ok) {
        ok += 1
        console.log(r.message)
      } else {
        fail += 1
        console.warn(r.message)
      }
    } catch (e) {
      fail += 1
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`Hata ${productMainId}:`, msg)
    }
  }

  if (prisma) await prisma.$disconnect()

  console.log(`Bitti. Başarılı: ${ok}, atlanan/hata: ${fail}. Kategori sayısı: ${categoryCache.size}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
