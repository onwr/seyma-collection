// Site → Trendyol: stok/fiyat değişikliklerini Trendyol'a bildirme.
// Tekil bir "hook noktası" olmadığından (checkout, admin panel, mağaza POS — hepsi aynı
// ProductVariant.stock alanını farklı yerlerden güncelliyor), periyodik uzlaştırma kullanıyoruz:
// Prisma'nın otomatik `updatedAt` alanı her yazışta güncellendiği için, "son senkronizasyondan
// beri değişen varyantlar" sorgusu değişikliğin hangi koddan geldiğine bakmaksızın hepsini yakalar.
import type { PrismaClient } from "@/generated/prisma/client"
import { pushStockAndPrice, TrendyolStockItem } from "@/lib/trendyol"
import { generateBarcode } from "@/lib/trendyolExport"

const LAST_STOCK_SYNC_KEY = "TRENDYOL_LAST_STOCK_SYNC_AT"

function commissionMultiplier(): number {
  const raw = Number(process.env.TRENDYOL_COMMISSION_PERCENT ?? "0")
  const pct = Number.isFinite(raw) && raw >= 0 ? raw : 0
  return 1 + pct / 100
}

async function getLastSyncAt(prisma: PrismaClient): Promise<Date> {
  const row = await prisma.setting.findUnique({ where: { key: LAST_STOCK_SYNC_KEY } })
  if (row?.value) {
    const n = Number(row.value)
    if (Number.isFinite(n) && n > 0) return new Date(n)
  }
  // İlk çalıştırma: her şeyi bir kereliğine gönder (epoch'tan beri "değişmiş" sayılır).
  return new Date(0)
}

async function setLastSyncAt(prisma: PrismaClient, ms: number): Promise<void> {
  await prisma.setting.upsert({
    where: { key: LAST_STOCK_SYNC_KEY },
    update: { value: String(ms) },
    create: { key: LAST_STOCK_SYNC_KEY, value: String(ms), type: "number" },
  })
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export interface StockPushSummary {
  candidateCount: number
  pushedCount: number
  batchRequestIds: string[]
}

/** `excludeVariantIds`: aynı senkron turunda `pushNewProducts` tarafından yeni gönderilmiş
 *  varyantlar — ürün oluşturma isteği zaten doğru stok/fiyatı içeriyor ama Trendyol'da asenkron
 *  işlendiği için henüz gerçekten oluşmamış olabilir; hemen ardından stok/fiyat push'u denemek
 *  "ürün bulunamadı" hatasıyla başarısız oluyordu (bkz. checkPendingBatches sonuçları). */
export async function pushStockChanges(
  prisma: PrismaClient,
  excludeVariantIds: number[] = []
): Promise<StockPushSummary> {
  const since = await getLastSyncAt(prisma)
  const now = Date.now()
  const multiplier = commissionMultiplier()

  const variants = await prisma.productVariant.findMany({
    where: {
      updatedAt: { gt: since },
      // Trendyol'a hiç gönderilmemiş (trendyolListedAt null) bir varyant için stok/fiyat push'u
      // denemek her zaman "ürün bulunamadı" hatasıyla başarısız oluyor — barkod Trendyol'da henüz
      // yok. Sadece en az bir kez gönderilmiş/oluşturulmuş varyantları hedefliyoruz; henüz
      // gönderilmemiş olanlar zaten pushNewProducts'ın kapsamında (ve o zaten doğru stok/fiyatı
      // ürün oluşturma isteğinin içinde gönderiyor).
      trendyolListedAt: { not: null },
      ...(excludeVariantIds.length > 0 ? { id: { notIn: excludeVariantIds } } : {}),
    },
    select: {
      id: true,
      barcode: true,
      price: true,
      compareAtPrice: true,
      stock: true,
      isActive: true,
      product: { select: { compareAtPrice: true, isActive: true } },
    },
  })

  const summary: StockPushSummary = { candidateCount: variants.length, pushedCount: 0, batchRequestIds: [] }
  if (variants.length === 0) {
    await setLastSyncAt(prisma, now)
    return summary
  }

  // Eksik barkodları kalıcı hale getir (Excel export'ta olduğu gibi lazy backfill).
  // Bağımsız/idempotent yazılar olduğu için `$transaction` yerine `Promise.all` — büyük
  // partilerde Prisma'nın varsayılan transaction süresini aşma riskini ortadan kaldırır.
  const toBackfill = variants.filter((v) => !v.barcode)
  if (toBackfill.length > 0) {
    await Promise.all(
      toBackfill.map((v) =>
        prisma.productVariant.update({ where: { id: v.id }, data: { barcode: generateBarcode(v.id) } })
      )
    )
  }

  const variantIdByBarcode = new Map<string, number>()
  const items: TrendyolStockItem[] = variants.map((v) => {
    const barcode = v.barcode || generateBarcode(v.id)
    variantIdByBarcode.set(barcode, v.id)
    const priceBase = Number(v.price)
    const compareBase = Number(v.compareAtPrice ?? v.product.compareAtPrice ?? v.price)
    const quantity = v.isActive && v.product.isActive ? v.stock : 0
    return {
      barcode,
      quantity,
      salePrice: round2(priceBase * multiplier),
      listPrice: Math.max(round2(compareBase * multiplier), round2(priceBase * multiplier)),
    }
  })

  const results = await pushStockAndPrice(items)
  summary.pushedCount = items.length
  summary.batchRequestIds = results.map((r) => r.batchRequestId)

  // Trendyol asenkron işlediği için push anında başarılı mı bilmiyoruz — batchRequestId'leri
  // (ve o gönderime dahil olan kalemleri, admin panelinde göstermek için) kaydediyoruz,
  // birkaç dakika sonra checkPendingBatches() gerçek sonucu sorgulayacak.
  if (results.length > 0) {
    await prisma.trendyolBatchCheck.createMany({
      data: results.map((r) => ({
        batchRequestId: r.batchRequestId,
        items: JSON.stringify(
          r.items.map((it) => ({ barcode: it.barcode, variantId: variantIdByBarcode.get(it.barcode) }))
        ),
      })),
      skipDuplicates: true,
    })
  }

  await setLastSyncAt(prisma, now)
  return summary
}
