// Tam senkronizasyon turu: sipariş çek → stok/fiyat it → bekleyen sonuçları kontrol et.
// Hem crontab'ın tetiklediği /api/cron/trendyol-sync hem admin panelindeki "Şimdi Senkronize Et"
// butonu aynı bu fonksiyonu çağırır — mantık tek yerde.
import type { PrismaClient } from "@/generated/prisma/client"
import { syncTrendyolOrders, OrderSyncSummary } from "@/lib/trendyolOrderSync"
import { pushNewProducts, ProductSyncSummary } from "@/lib/trendyolProductSync"
import { pushStockChanges, StockPushSummary } from "@/lib/trendyolStockPush"
import { checkPendingBatches, BatchCheckSummary } from "@/lib/trendyolBatchCheck"

export interface TrendyolSyncResult {
  orders?: OrderSyncSummary
  ordersError?: string
  newProducts?: ProductSyncSummary
  newProductsError?: string
  stock?: StockPushSummary
  stockError?: string
  batchCheck?: BatchCheckSummary
  batchCheckError?: string
}

export async function runTrendyolSync(prisma: PrismaClient): Promise<TrendyolSyncResult> {
  const result: TrendyolSyncResult = {}

  try {
    result.orders = await syncTrendyolOrders(prisma)
  } catch (err) {
    console.error("Trendyol order sync error:", err)
    result.ordersError = err instanceof Error ? err.message : String(err)
  }

  try {
    result.newProducts = await pushNewProducts(prisma)
  } catch (err) {
    console.error("Trendyol product sync error:", err)
    result.newProductsError = err instanceof Error ? err.message : String(err)
  }

  try {
    result.stock = await pushStockChanges(prisma, result.newProducts?.pushedVariantIds ?? [])
  } catch (err) {
    console.error("Trendyol stock push error:", err)
    result.stockError = err instanceof Error ? err.message : String(err)
  }

  try {
    result.batchCheck = await checkPendingBatches(prisma)
  } catch (err) {
    console.error("Trendyol batch check error:", err)
    result.batchCheckError = err instanceof Error ? err.message : String(err)
  }

  console.log(
    "Trendyol sync özeti:",
    JSON.stringify({
      orders: result.orders,
      ordersError: result.ordersError,
      newProductsCandidateCount: result.newProducts?.candidateCount,
      newProductsPushedCount: result.newProducts?.pushedCount,
      newProductsError: result.newProductsError,
      stockCandidateCount: result.stock?.candidateCount,
      stockPushedCount: result.stock?.pushedCount,
      stockError: result.stockError,
      batchCheck: result.batchCheck,
      batchCheckError: result.batchCheckError,
    })
  )

  return result
}
