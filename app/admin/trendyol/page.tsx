import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { TrendyolSyncButton } from "@/components/admin/TrendyolSyncButton"
import { FaCheckCircle, FaExclamationTriangle, FaClock } from "react-icons/fa"

const LAST_ORDER_SYNC_KEY = "TRENDYOL_LAST_ORDER_SYNC_AT"
const LAST_STOCK_SYNC_KEY = "TRENDYOL_LAST_STOCK_SYNC_AT"
const SKIPPED_ITEMS_KEY = "TRENDYOL_SKIPPED_ITEMS"

type SkippedItem = { productId: number; variantSku: string; field: string }

function formatDate(value: Date | number | null | undefined): string {
  if (!value) return "—"
  const d = typeof value === "number" ? new Date(value) : value
  return d.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" })
}

type BatchItem = { barcode: string; variantId?: number }

export default async function AdminTrendyolPage() {
  const [settings, batchChecks, orderSyncs] = await Promise.all([
    prisma.setting.findMany({ where: { key: { in: [LAST_ORDER_SYNC_KEY, LAST_STOCK_SYNC_KEY, SKIPPED_ITEMS_KEY] } } }),
    prisma.trendyolBatchCheck.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.trendyolOrderSync.findMany({ orderBy: { processedAt: "desc" }, take: 30 }),
  ])

  const lastOrderSync = settings.find((s) => s.key === LAST_ORDER_SYNC_KEY)?.value
  const lastStockSync = settings.find((s) => s.key === LAST_STOCK_SYNC_KEY)?.value

  let skippedItems: SkippedItem[] = []
  try {
    skippedItems = JSON.parse(settings.find((s) => s.key === SKIPPED_ITEMS_KEY)?.value ?? "[]")
  } catch {
    skippedItems = []
  }
  const skippedProductIds = Array.from(new Set(skippedItems.map((s) => s.productId)))
  const skippedProducts = skippedProductIds.length
    ? await prisma.product.findMany({
        where: { id: { in: skippedProductIds } },
        select: { id: true, name: true, slug: true },
      })
    : []
  const skippedProductById = new Map(skippedProducts.map((p) => [p.id, p]))

  const totalFailed = batchChecks.reduce((sum, b) => sum + (b.failedItemCount ?? 0), 0)

  // Gönderimlere dahil olan ürünlerin adlarını göstermek için tüm varyant ID'lerini toplayıp
  // tek sorguda çözüyoruz.
  const itemsByBatchId = new Map<number, BatchItem[]>()
  const allVariantIds = new Set<number>()
  for (const b of batchChecks) {
    if (!b.items) continue
    try {
      const parsed: BatchItem[] = JSON.parse(b.items)
      itemsByBatchId.set(b.id, parsed)
      for (const it of parsed) if (it.variantId) allVariantIds.add(it.variantId)
    } catch {
      // yoksay
    }
  }

  const variantRows = allVariantIds.size
    ? await prisma.productVariant.findMany({
        where: { id: { in: Array.from(allVariantIds) } },
        select: { id: true, name: true, product: { select: { name: true } } },
      })
    : []
  const productNameByVariantId = new Map(
    variantRows.map((v) => [v.id, v.name && v.name !== "Standart" ? `${v.product.name} (${v.name})` : v.product.name])
  )

  return (
    <div className="space-y-6 pb-10">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[17px] font-medium text-zinc-800">Trendyol Entegrasyonu</h1>
          <p className="text-[12px] text-zinc-400">
            Stok/fiyat senkronizasyonu, yeni ürün gönderimi ve sipariş takibi — 5 dakikada bir otomatik çalışır.
          </p>
        </div>
        <TrendyolSyncButton />
      </div>

      {/* DURUM KARTLARI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-100 bg-white p-4">
          <div className="flex items-center gap-2 text-zinc-400">
            <FaClock className="h-3 w-3" />
            <span className="text-[11px] font-medium uppercase tracking-wide">Son Sipariş Kontrolü</span>
          </div>
          <p className="mt-2 text-[14px] font-semibold text-zinc-800">
            {lastOrderSync ? formatDate(Number(lastOrderSync)) : "Henüz çalışmadı"}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-white p-4">
          <div className="flex items-center gap-2 text-zinc-400">
            <FaClock className="h-3 w-3" />
            <span className="text-[11px] font-medium uppercase tracking-wide">Son Stok/Fiyat Gönderimi</span>
          </div>
          <p className="mt-2 text-[14px] font-semibold text-zinc-800">
            {lastStockSync ? formatDate(Number(lastStockSync)) : "Henüz çalışmadı"}
          </p>
        </div>
        <div className={`rounded-xl border p-4 ${totalFailed > 0 ? "border-rose-200 bg-rose-50" : "border-zinc-100 bg-white"}`}>
          <div className={`flex items-center gap-2 ${totalFailed > 0 ? "text-rose-500" : "text-zinc-400"}`}>
            {totalFailed > 0 ? <FaExclamationTriangle className="h-3 w-3" /> : <FaCheckCircle className="h-3 w-3" />}
            <span className="text-[11px] font-medium uppercase tracking-wide">Son 30 Gönderimde Hatalı Kalem</span>
          </div>
          <p className={`mt-2 text-[14px] font-semibold ${totalFailed > 0 ? "text-rose-600" : "text-zinc-800"}`}>
            {totalFailed}
          </p>
        </div>
        <div className={`rounded-xl border p-4 ${skippedItems.length > 0 ? "border-amber-200 bg-amber-50" : "border-zinc-100 bg-white"}`}>
          <div className={`flex items-center gap-2 ${skippedItems.length > 0 ? "text-amber-500" : "text-zinc-400"}`}>
            {skippedItems.length > 0 ? <FaExclamationTriangle className="h-3 w-3" /> : <FaCheckCircle className="h-3 w-3" />}
            <span className="text-[11px] font-medium uppercase tracking-wide">Atlanan Ürün (Beden/Renk Eşleşmedi)</span>
          </div>
          <p className={`mt-2 text-[14px] font-semibold ${skippedItems.length > 0 ? "text-amber-600" : "text-zinc-800"}`}>
            {skippedItems.length}
          </p>
        </div>
      </div>

      {/* GÖNDERİM GEÇMİŞİ */}
      <div className="rounded-xl border border-zinc-100 bg-white">
        <div className="border-b border-zinc-100 px-4 py-3">
          <h2 className="text-[13px] font-semibold text-zinc-800">Trendyol Gönderimleri</h2>
          <p className="text-[11px] text-zinc-400">
            Stok/fiyat güncellemeleri ve ürün oluşturma/güncelleme gönderimleri — Trendyol asenkron işlediği için sonuç, gönderimden birkaç dakika sonra netleşir.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-zinc-400">
                <th className="px-4 py-2 font-medium">Tür</th>
                <th className="px-4 py-2 font-medium">Gönderim ID</th>
                <th className="px-4 py-2 font-medium">Gönderildi</th>
                <th className="px-4 py-2 font-medium">Durum</th>
                <th className="px-4 py-2 font-medium">Sonuç</th>
              </tr>
            </thead>
            <tbody>
              {batchChecks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                    Henüz gönderim yok.
                  </td>
                </tr>
              )}
              {batchChecks.map((b) => {
                const failed = (b.failedItemCount ?? 0) > 0
                let failures: { barcode?: string; reasons: string[] }[] = []
                if (b.failures) {
                  try {
                    failures = JSON.parse(b.failures)
                  } catch {
                    failures = []
                  }
                }
                const items = itemsByBatchId.get(b.id) ?? []
                const barcodeToVariantId = new Map(items.map((it) => [it.barcode, it.variantId]))
                const productNames = items
                  .map((it) => (it.variantId ? productNameByVariantId.get(it.variantId) : undefined))
                  .filter((n): n is string => Boolean(n))

                return (
                  <tr key={b.id} className="border-b border-zinc-50 last:border-0">
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          b.kind === "PRODUCT" ? "bg-orange-50 text-orange-600" : "bg-sky-50 text-sky-600"
                        }`}
                      >
                        {b.kind === "PRODUCT" ? "Ürün" : "Stok/Fiyat"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-zinc-500">
                      {b.batchRequestId.slice(0, 20)}…
                    </td>
                    <td className="px-4 py-2.5 text-zinc-600">{formatDate(b.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      {!b.checkedAt ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                          Bekliyor
                        </span>
                      ) : failed ? (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-600">
                          Hatalı
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                          Başarılı
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-600">
                      <div className="space-y-1">
                        {productNames.length > 0 && (
                          <p className="text-[11px] text-zinc-500">
                            {productNames.slice(0, 5).join(", ")}
                            {productNames.length > 5 && ` +${productNames.length - 5} tane daha`}
                          </p>
                        )}
                        {!b.checkedAt ? (
                          <span className="text-zinc-400">Sonuç bekleniyor…</span>
                        ) : failed ? (
                          <div className="space-y-0.5">
                            <span className="font-medium text-rose-600">{b.failedItemCount} / {b.itemCount} kalem hatalı</span>
                            {failures.slice(0, 3).map((f, i) => {
                              const vId = f.barcode ? barcodeToVariantId.get(f.barcode) : undefined
                              const name = vId ? productNameByVariantId.get(vId) : undefined
                              return (
                                <p key={i} className="text-[11px] text-zinc-500">
                                  {name ?? f.barcode ?? "?"}: {f.reasons.join(", ")}
                                </p>
                              )
                            })}
                          </div>
                        ) : (
                          <span>{b.itemCount} kalem, hepsi başarılı</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SİPARİŞ SENKRON GEÇMİŞİ */}
      <div className="rounded-xl border border-zinc-100 bg-white">
        <div className="border-b border-zinc-100 px-4 py-3">
          <h2 className="text-[13px] font-semibold text-zinc-800">İşlenen Trendyol Siparişleri</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-zinc-400">
                <th className="px-4 py-2 font-medium">Sipariş No</th>
                <th className="px-4 py-2 font-medium">Durum</th>
                <th className="px-4 py-2 font-medium">Stok Düşüldü mü</th>
                <th className="px-4 py-2 font-medium">İşlendi</th>
              </tr>
            </thead>
            <tbody>
              {orderSyncs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-zinc-400">
                    Henüz işlenen sipariş yok.
                  </td>
                </tr>
              )}
              {orderSyncs.map((o) => (
                <tr key={o.id} className="border-b border-zinc-50 last:border-0">
                  <td className="px-4 py-2.5 font-mono text-[11px] text-zinc-600">{o.orderNumber}</td>
                  <td className="px-4 py-2.5 text-zinc-600">{o.lastStatus}</td>
                  <td className="px-4 py-2.5">
                    {o.stockDecremented ? (
                      <span className="text-emerald-600">Evet</span>
                    ) : (
                      <span className="text-zinc-400">Hayır</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-600">{formatDate(o.processedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ATLANAN ÜRÜNLER */}
      <div className="rounded-xl border border-zinc-100 bg-white">
        <div className="border-b border-zinc-100 px-4 py-3">
          <h2 className="text-[13px] font-semibold text-zinc-800">Atlanan Ürünler</h2>
          <p className="text-[11px] text-zinc-400">
            Beden ya da Renk değeri Trendyol&apos;un resmi listesiyle eşleşmediği için otomatik gönderime hiç
            girmemiş varyantlar — düzeltilene kadar her turda burada görünmeye devam eder.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-zinc-400">
                <th className="px-4 py-2 font-medium">Ürün</th>
                <th className="px-4 py-2 font-medium">Varyant SKU</th>
                <th className="px-4 py-2 font-medium">Eşleşmeyen Alan</th>
              </tr>
            </thead>
            <tbody>
              {skippedItems.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-zinc-400">
                    Atlanan ürün yok.
                  </td>
                </tr>
              )}
              {skippedItems.map((s, i) => {
                const product = skippedProductById.get(s.productId)
                return (
                  <tr key={i} className="border-b border-zinc-50 last:border-0">
                    <td className="px-4 py-2.5 text-zinc-600">
                      {product ? (
                        <Link href={`/admin/products/${product.id}/edit`} className="text-[#4f6f52] hover:underline">
                          {product.name}
                        </Link>
                      ) : (
                        `#${s.productId}`
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-zinc-500">{s.variantSku}</td>
                    <td className="px-4 py-2.5 text-amber-600">{s.field}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
