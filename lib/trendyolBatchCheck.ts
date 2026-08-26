// Trendyol'a gönderilen stok/fiyat güncellemelerinin (price-and-inventory) gerçek sonucunu
// kontrol eder. Trendyol isteği asenkron işlediği için push anında başarılı mı bilmiyoruz —
// birkaç dakika sonra bu fonksiyon batchRequestId'leri sorgulayıp başarısız kalemleri
// (pm2 log'una düşecek şekilde) yüksek sesle raporluyor.
import type { PrismaClient } from "@/generated/prisma/client"
import { checkBatchStatus, getProductByBarcode } from "@/lib/trendyol"

// Trendyol'un işlemesi için en az bu kadar bekle, hemen sorup "IN_PROGRESS" görüp
// tekrar tekrar denemeyelim.
const MIN_AGE_MS = 2 * 60 * 1000
const MAX_PER_RUN = 50
// `failures` sütunu MySQL TEXT (65.535 bayt sınırı) — büyük partilerde (ör. 950 hatalı kalem)
// tüm Türkçe hata mesajlarını saklamaya çalışmak bu sınırı aşıp update'in hata fırlatmasına
// yol açıyordu, bu da döngüyü tamamen durdurup sıradaki tüm gönderimlerin kontrolünü
// engelliyordu. Teşhis/arayüz için birkaç örnek yeterli, tamamını saklamaya gerek yok.
const MAX_STORED_FAILURES = 50
// Bir turda en fazla bu kadar ÜRÜN için Trendyol'a canlı productMainId sorgusu at — eski
// Excel yüklemesinden kalan binlerce çakışma tek turda değil, birkaç cron turuna yayılarak
// (her turda küçük bir grup) kendiliğinden düzelsin.
const MAX_RECONCILE_PRODUCTS_PER_RUN = 100

/** Trendyol'un "bu barkod/ürün zaten kayıtlı" hata mesajlarını yakalar — bizim ürettiğimiz
 *  productMainId'nin, ürünün Trendyol'da GERÇEKTE kayıtlı olduğu değerle eşleşmediğinin işareti. */
function isDuplicateProductFailure(reasons: string[]): boolean {
  return reasons.some((r) => r.includes("barkodlu") && (r.includes("mevcut") || r.includes("oluşturulamaz")))
}

/** Ürün oluşturma/güncelleme gönderimlerinde "zaten mevcut" hatası alan ürünler için:
 *  Trendyol'dan (bu ürünün herhangi bir varyantının barkoduyla) GERÇEK productMainId'yi sorgular
 *  ve kalıcı olarak `Product.trendyolProductMainId`'ye yazar (kayıt/tutarlılık amaçlı — Excel
 *  akışı da artık aynı değeri kullanır).
 *
 *  ÖNEMLİ: productMainId tam eşleşse BİLE Trendyol'un ürün oluşturma uç noktası (v2/products POST)
 *  zaten var olan bir barkodu "güncelleme" olarak değil "oluşturulamaz" hatası olarak reddediyor
 *  — canlı ortamda doğrulandı (bkz. "Ekru çapraz fiyonk detaylı etek", productMainId tam eşleşmesine
 *  rağmen tekrar aynı hatayı verdi). Yani bu ürün zaten Trendyol'da yayında; tekrar "oluşturmayı"
 *  denemenin anlamı yok ve hep başarısız olacak — bu yüzden `trendyolListedAt`'e DOKUNMUYORUZ
 *  (otomatik "yeni ürün" taraması bunu bir daha denemesin). Bundan sonraki senkron, zaten çalışan
 *  stok/fiyat kanalından (pushStockChanges) devam eder. */
async function reconcileProductMainIds(
  prisma: PrismaClient,
  row: { batchRequestId: string; kind: string; items: string | null },
  failures: { barcode?: string; reasons: string[] }[],
  budget: { remaining: number }
): Promise<void> {
  if (row.kind !== "PRODUCT" || budget.remaining <= 0) return

  const duplicateBarcodes = failures
    .filter((f) => f.barcode && isDuplicateProductFailure(f.reasons))
    .map((f) => f.barcode!)
  if (duplicateBarcodes.length === 0) return

  let itemsMap: { barcode: string; variantId?: number }[] = []
  try {
    itemsMap = row.items ? JSON.parse(row.items) : []
  } catch {
    return
  }
  const variantIdByBarcode = new Map(itemsMap.map((it) => [it.barcode, it.variantId]))
  const variantIds = duplicateBarcodes
    .map((b) => variantIdByBarcode.get(b))
    .filter((id): id is number => typeof id === "number")
  if (variantIds.length === 0) return

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: { productId: true, product: { select: { trendyolProductMainId: true } } },
  })
  const productIds = Array.from(
    new Set(variants.filter((v) => !v.product.trendyolProductMainId).map((v) => v.productId))
  )

  for (const productId of productIds) {
    if (budget.remaining <= 0) break
    budget.remaining--
    try {
      const siblingVariants = await prisma.productVariant.findMany({
        where: { productId, barcode: { not: null } },
        select: { barcode: true },
      })
      let foundMainId: string | null = null
      for (const sv of siblingVariants) {
        if (!sv.barcode) continue
        const found = await getProductByBarcode(sv.barcode)
        if (found) {
          foundMainId = found.productMainId
          break
        }
      }
      if (foundMainId) {
        await prisma.product.update({ where: { id: productId }, data: { trendyolProductMainId: foundMainId } })
        console.log(
          `Trendyol productMainId uzlaştırıldı: ürün ${productId} -> "${foundMainId}" (ürün zaten Trendyol'da yayında, yeniden "oluşturma" denenmeyecek)`
        )
      } else {
        console.warn(
          `Trendyol productMainId uzlaştırılamadı: ürün ${productId} — hiçbir varyantı Trendyol'da barkodla bulunamadı.`
        )
      }
    } catch (err) {
      console.error(`Trendyol productMainId uzlaştırma hatası (ürün ${productId}):`, err)
    }
  }
}

export interface BatchCheckSummary {
  checkedCount: number
  completedCount: number
  failedItemTotal: number
  failures: { batchRequestId: string; barcode?: string; reasons: string[] }[]
}

export async function checkPendingBatches(prisma: PrismaClient): Promise<BatchCheckSummary> {
  const summary: BatchCheckSummary = { checkedCount: 0, completedCount: 0, failedItemTotal: 0, failures: [] }
  const reconcileBudget = { remaining: MAX_RECONCILE_PRODUCTS_PER_RUN }

  const pending = await prisma.trendyolBatchCheck.findMany({
    where: { checkedAt: null, createdAt: { lt: new Date(Date.now() - MIN_AGE_MS) } },
    take: MAX_PER_RUN,
    orderBy: { createdAt: "asc" },
  })

  for (const row of pending) {
    let result
    try {
      result = await checkBatchStatus(row.batchRequestId)
    } catch (err) {
      console.error(`Trendyol batch durum sorgusu başarısız (${row.batchRequestId}):`, err)
      continue
    }
    summary.checkedCount++

    // Gerçek API cevabında üst seviye bir "status" alanı yok (dokümantasyon yanıltıcıydı) —
    // tamamlanma durumunu `items` dizisinin dolu ve `itemCount` ile tutarlı olmasından anlıyoruz.
    const items = result.items || []
    const isResolved = items.length > 0 && items.length === (result.itemCount ?? items.length)
    if (!isResolved) {
      // Hâlâ işleniyor (ya da beklenmedik biçimde boş döndü), bir sonraki çalıştırmada tekrar bakılacak.
      continue
    }

    summary.completedCount++
    // Trendyol dokümantasyonu başarı/hata durumunu kesin bir "status" string'i yerine
    // boş olmayan `failureReasons` dizisiyle işaretliyor — buna güveniyoruz.
    const failedItems = (result.items || []).filter((i) => i.failureReasons && i.failureReasons.length > 0)
    const failures = failedItems.map((i) => ({
      barcode: i.requestItem?.barcode,
      reasons: i.failureReasons || [],
    }))

    if (failures.length > 0) {
      summary.failedItemTotal += failures.length
      for (const f of failures) {
        summary.failures.push({ batchRequestId: row.batchRequestId, barcode: f.barcode, reasons: f.reasons })
      }
      const label = row.kind === "PRODUCT" ? "ürün gönderimi" : "stok/fiyat güncellemesi"
      console.error(
        `Trendyol ${label} ${failures.length} kalemde başarısız (batch ${row.batchRequestId}):`,
        JSON.stringify(failures).slice(0, 2000)
      )
    }

    if (failures.length > 0) {
      await reconcileProductMainIds(prisma, row, failures, reconcileBudget)
    }

    const storedFailures = failures.length > MAX_STORED_FAILURES ? failures.slice(0, MAX_STORED_FAILURES) : failures

    try {
      await prisma.trendyolBatchCheck.update({
        where: { id: row.id },
        data: {
          checkedAt: new Date(),
          itemCount: result.itemCount,
          failedItemCount: result.failedItemCount ?? failures.length,
          failures: storedFailures.length > 0 ? JSON.stringify(storedFailures) : null,
        },
      })
    } catch (err) {
      // Bu satırın kaydı ne sebeple olursa olsun başarısız olsa da diğer bekleyen satırların
      // kontrolü engellenmesin — tek bir sorunlu kayıt tüm kuyruğu kilitlemesin.
      console.error(`Trendyol batch sonucu kaydedilemedi (batch ${row.batchRequestId}):`, err)
    }
  }

  return summary
}
