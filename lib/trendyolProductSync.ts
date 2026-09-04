// Site → Trendyol: ürün/varyantları Trendyol'un Ürün Oluşturma/Güncelleme API'sine gönderir
// (Excel akışına ihtiyaç kalmadan). Aynı barkod/productMainId ile tekrar gönderim Trendyol
// tarafında güncelleme olarak işlendiği için bu, "yeni ürün gönder" ile "mevcut ürünü güncelle"yi
// tek mekanizmada birleştiriyor — daha önce Excel'de başarısız kalmış ürünleri de
// (artık doğru varsayılan değerlerle) kendiliğinden düzeltebilir.
import type { PrismaClient } from "@/generated/prisma/client"
import { createOrUpdateProducts, getProductByBarcode, TrendyolProductItem } from "@/lib/trendyol"
import { EXPORT_PRODUCT_SELECT, ExportProduct, buildRow, COLOR_FALLBACK, generateBarcode } from "@/lib/trendyolExport"
import {
  BRAND_ID,
  FALLBACK_CATEGORY_ID,
  FIXED_ATTRIBUTES,
  CATEGORY_ATTRIBUTE_EXCLUSIONS,
  BEDEN_ATTR_ID,
  WEB_COLOR_ATTR_ID,
  RENK_ATTR_ID,
  getBedenValueId,
  getWebColorValueId,
} from "@/lib/trendyolAttributeValues"

// Beden/Web Color resmi listesiyle eşleşmeyen (bu yüzden hiç gönderilemeyen) varyantların GÜNCEL
// listesi — admin panelinde görünür olsun diye her otomatik taramada üzerine yazılır (bu varyantlar
// çözülene kadar `trendyolListedAt` hep null kaldığından, her turda yeniden aday olup listeye girerler).
const SKIPPED_ITEMS_KEY = "TRENDYOL_SKIPPED_ITEMS"
// Bir turda en fazla bu kadar aday ürün işlenir — her yeni/bilinmeyen ürün için Trendyol'a canlı
// bir "zaten var mı" sorgusu atıldığından (bkz. checkAlreadyExists), sınırsız bırakılırsa büyük
// bir geriye dönük tarama (binlerce eski ürün) cron turunu dakikalarca uzatabilir.
const MAX_CANDIDATES_PER_RUN = 200

function commissionMultiplier(): number {
  const raw = Number(process.env.TRENDYOL_COMMISSION_PERCENT ?? "0")
  const pct = Number.isFinite(raw) && raw >= 0 ? raw : 0
  return 1 + pct / 100
}

type ProductWithVariants = ExportProduct

interface BuiltItem {
  variantId: number
  item: TrendyolProductItem
}

interface SkippedItem {
  productId: number
  variantSku: string
  field: string
}

/** Tek bir varyant için Trendyol ürün-oluşturma payload'ını kurar. Beden/Web Color ID'si
 *  bulunamazsa `skip` döner (o varyant Trendyol'un resmi listesindeki hiçbir değerle eşleşmiyor
 *  demektir — admin panelinde uyarı olarak gösterilir). */
async function buildProductItem(
  prisma: PrismaClient,
  p: ProductWithVariants,
  v: ProductWithVariants["variants"][number],
  multiplier: number
): Promise<{ built: BuiltItem } | { skip: SkippedItem }> {
  const row = buildRow(p, v, multiplier)

  // Ürünün GERÇEK Trendyol kategorisi — yerel kategoriye eşlenmemişse (ör. Trendyol dışı,
  // elle eklenmiş bir ürün) "Elbise"ye düşer, ama bu durumda gönderim muhtemelen kategoriye
  // özgü zorunlu alan eksikliğinden reddedilecektir; sessizce yanlış kategoriye yazmaz.
  const categoryId = p.category?.trendyolCategoryId ?? FALLBACK_CATEGORY_ID

  const bedenValueId = await getBedenValueId(prisma, categoryId, row.beden)
  if (!bedenValueId) {
    return { skip: { productId: p.id, variantSku: row.variantSku, field: `Beden ("${row.beden}")` } }
  }

  const webColorCanonical = row.webColor || COLOR_FALLBACK
  const webColorValueId = await getWebColorValueId(prisma, categoryId, webColorCanonical)
  if (!webColorValueId) {
    return {
      skip: { productId: p.id, variantSku: row.variantSku, field: `Web Color ("${webColorCanonical}")` },
    }
  }

  const barcode = v.barcode || generateBarcode(v.id)
  const excluded = new Set(CATEGORY_ATTRIBUTE_EXCLUSIONS[categoryId] ?? [])
  const fixedAttributesForCategory = FIXED_ATTRIBUTES.filter((a) => !excluded.has(a.attributeId))

  return {
    built: {
      variantId: v.id,
      item: {
        barcode,
        title: row.urunAdi.slice(0, 100),
        productMainId: row.modelKodu,
        brandId: BRAND_ID,
        categoryId,
        quantity: row.stokAdedi,
        stockCode: row.stokKodu,
        description: row.aciklama.slice(0, 30000),
        listPrice: row.piyasaFiyat,
        salePrice: row.satisFiyat,
        vatRate: row.kdv,
        images: row.images.slice(0, 8).map((url) => ({ url })),
        attributes: [
          ...fixedAttributesForCategory,
          { attributeId: BEDEN_ATTR_ID, attributeValueId: bedenValueId },
          { attributeId: WEB_COLOR_ATTR_ID, attributeValueId: webColorValueId },
          { attributeId: RENK_ATTR_ID, customAttributeValue: row.renk },
        ],
      },
    },
  }
}

/** Barkodu Trendyol'da zaten kayıtlı olan (ama bizim sistemimizde henüz productMainId'si
 *  bilinmeyen) ürünleri göndermeden ÖNCE tespit eder. Canlı olarak doğrulandı: barkodu zaten
 *  kayıtlı bir ürün için "oluşturma" isteği — doğru veriyle bile, ürün henüz onaylanmamış
 *  "revize bekliyor" durumunda bile — HER ZAMAN reddediliyor ve Trendyol'un onay kuyruğuna
 *  asla çözülemeyecek kalıcı yeni bir kayıt ekliyor. Bu yüzden göndermeden önce kontrol edip,
 *  zaten varsa hiç göndermeden sadece kaydını tutuyoruz (self-heal'le aynı sonuç, ama
 *  kuyruğu kirletmeden). */
async function checkAlreadyExists(product: ProductWithVariants): Promise<string | null> {
  for (const v of product.variants) {
    const barcode = v.barcode || generateBarcode(v.id)
    const found = await getProductByBarcode(barcode)
    if (found) return found.productMainId
  }
  return null
}

async function backfillMissingBarcodes(prisma: PrismaClient, products: ProductWithVariants[]): Promise<void> {
  const toBackfill = products.flatMap((p) => p.variants.filter((v) => !v.barcode).map((v) => v.id))
  if (toBackfill.length === 0) return
  await Promise.all(
    toBackfill.map((id) => prisma.productVariant.update({ where: { id }, data: { barcode: generateBarcode(id) } }))
  )
}

async function submitItems(
  prisma: PrismaClient,
  builtItems: BuiltItem[]
): Promise<{ pushedCount: number; batchRequestIds: string[] }> {
  if (builtItems.length === 0) return { pushedCount: 0, batchRequestIds: [] }

  const items = builtItems.map((b) => b.item)
  const variantIdByBarcode = new Map(builtItems.map((b) => [b.item.barcode, b.variantId]))

  const results = await createOrUpdateProducts(items)

  if (results.length > 0) {
    await prisma.trendyolBatchCheck.createMany({
      data: results.map((r) => ({
        batchRequestId: r.batchRequestId,
        kind: "PRODUCT",
        items: JSON.stringify(
          r.items.map((it) => ({ barcode: it.barcode, variantId: variantIdByBarcode.get(it.barcode) }))
        ),
      })),
      skipDuplicates: true,
    })
  }

  // İyimser işaretleme: gönderim kabul edildi, gerçek sonuç birkaç dakika sonra
  // checkPendingBatches() ile netleşir (admin panelinde "PRODUCT" tipinde görünür).
  const variantIds = builtItems.map((b) => b.variantId)
  await prisma.productVariant.updateMany({
    where: { id: { in: variantIds } },
    data: { trendyolListedAt: new Date() },
  })

  return { pushedCount: items.length, batchRequestIds: results.map((r) => r.batchRequestId) }
}

export interface ProductSyncSummary {
  candidateCount: number
  pushedCount: number
  skippedNoValueId: SkippedItem[]
  batchRequestIds: string[]
  pushedVariantIds: number[]
  /** Gönderilmeden önce Trendyol'da zaten kayıtlı bulunduysa (gönderime hiç gerek kalmadı). */
  alreadyListedMainId?: string
}

/** Otomatik tarama: hiç Trendyol'a gönderilmemiş (trendyolListedAt null) aktif varyantları bulur. */
export async function pushNewProducts(prisma: PrismaClient): Promise<ProductSyncSummary> {
  const multiplier = commissionMultiplier()
  const summary: ProductSyncSummary = {
    candidateCount: 0,
    pushedCount: 0,
    skippedNoValueId: [],
    batchRequestIds: [],
    pushedVariantIds: [],
  }

  const products = (await prisma.product.findMany({
    where: { isActive: true, variants: { some: { isActive: true, trendyolListedAt: null } } },
    select: EXPORT_PRODUCT_SELECT,
    take: MAX_CANDIDATES_PER_RUN,
  })) as unknown as ExportProduct[]

  await backfillMissingBarcodes(prisma, products)

  const builtItems: BuiltItem[] = []
  for (const p of products) {
    if (!p.trendyolProductMainId) {
      const existingMainId = await checkAlreadyExists(p)
      if (existingMainId) {
        await prisma.product.update({ where: { id: p.id }, data: { trendyolProductMainId: existingMainId } })
        await prisma.productVariant.updateMany({
          where: { productId: p.id, trendyolListedAt: null },
          data: { trendyolListedAt: new Date() },
        })
        console.log(
          `Trendyol: ürün ${p.id} zaten kayıtlı (${existingMainId}) — göndermeden atlandı, kuyruk kirletilmedi.`
        )
        continue
      }
    }
    for (const v of p.variants) {
      if (v.trendyolListedAt) continue
      summary.candidateCount++
      const result = await buildProductItem(prisma, p, v, multiplier)
      if ("skip" in result) {
        summary.skippedNoValueId.push(result.skip)
      } else {
        builtItems.push(result.built)
      }
    }
  }

  summary.pushedVariantIds = builtItems.map((b) => b.variantId)
  const { pushedCount, batchRequestIds } = await submitItems(prisma, builtItems)
  summary.pushedCount = pushedCount
  summary.batchRequestIds = batchRequestIds

  await prisma.setting.upsert({
    where: { key: SKIPPED_ITEMS_KEY },
    update: { value: JSON.stringify(summary.skippedNoValueId) },
    create: { key: SKIPPED_ITEMS_KEY, value: JSON.stringify(summary.skippedNoValueId), type: "json" },
  })

  return summary
}

/** Elle tetikleme: tek bir ürünün TÜM aktif varyantlarını (daha önce gönderilmiş olsa bile)
 *  yeniden gönderir/günceller — admin panelindeki "Trendyol'a Gönder/Güncelle" butonu için. */
export async function pushProductById(prisma: PrismaClient, productId: number): Promise<ProductSyncSummary> {
  const multiplier = commissionMultiplier()
  const summary: ProductSyncSummary = {
    candidateCount: 0,
    pushedCount: 0,
    skippedNoValueId: [],
    batchRequestIds: [],
    pushedVariantIds: [],
  }

  const product = (await prisma.product.findUnique({
    where: { id: productId },
    select: EXPORT_PRODUCT_SELECT,
  })) as unknown as ExportProduct | null
  if (!product) return summary

  await backfillMissingBarcodes(prisma, [product])

  if (!product.trendyolProductMainId) {
    const existingMainId = await checkAlreadyExists(product)
    if (existingMainId) {
      await prisma.product.update({ where: { id: productId }, data: { trendyolProductMainId: existingMainId } })
      await prisma.productVariant.updateMany({
        where: { productId, trendyolListedAt: null },
        data: { trendyolListedAt: new Date() },
      })
      summary.alreadyListedMainId = existingMainId
      return summary
    }
  }

  const builtItems: BuiltItem[] = []
  for (const v of product.variants) {
    summary.candidateCount++
    const result = await buildProductItem(prisma, product, v, multiplier)
    if ("skip" in result) {
      summary.skippedNoValueId.push(result.skip)
    } else {
      builtItems.push(result.built)
    }
  }

  summary.pushedVariantIds = builtItems.map((b) => b.variantId)
  const { pushedCount, batchRequestIds } = await submitItems(prisma, builtItems)
  summary.pushedCount = pushedCount
  summary.batchRequestIds = batchRequestIds
  return summary
}
