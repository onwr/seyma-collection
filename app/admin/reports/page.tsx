"use client"

import { useCallback, useEffect, useMemo, useState, startTransition } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { FaDownload, FaChevronLeft, FaSync } from "react-icons/fa"

function ymdLocal(d: Date): string {
  return d.toLocaleDateString("sv-SE")
}

function addDaysLocal(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function money(n: number) {
  return "₺" + n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const STATUS_TR: Record<string, string> = {
  PENDING: "Beklemede",
  PAID: "Ödendi",
  PROCESSING: "Hazırlık",
  SHIPPED: "Kargoda",
  DELIVERED: "Teslim",
  CANCELLED: "İptal",
  REFUNDED: "İade",
}

const PAYMENT_TR: Record<string, string> = {
  CARD: "Kart",
  CASH_ON_DELIVERY: "Kapıda ödeme",
  BANK_TRANSFER: "Havale / EFT",
  MARKETPLACE: "Trendyol",
}

type ReportPayload = {
  range: { from: string; to: string }
  summary: {
    revenue: number
    onlineRevenue?: number
    retailRevenue?: number
    combinedRevenue?: number
    orderCount: number
    retailSaleCount?: number
    averageOrderValue: number
    subtotal: number
    shippingCost: number
    discountTotal: number
    profit: number | null
    ordersWithDiscountCount: number
    ordersWithDiscountSum: number
    previousPeriod: {
      revenue: number
      orderCount: number
      retailRevenue?: number
      retailSaleCount?: number
    }
    pctChangeRevenue: number
    pctChangeOrders: number
    pctChangeRetailRevenue?: number
    pctChangeRetailCount?: number
  }
  daily: {
    date: string
    revenue: number
    orderCount: number
    retailRevenue?: number
    retailCount?: number
  }[]
  ordersByStatus: { status: string; count: number }[]
  paymentsByMethod: { method: string; count: number; amount: number }[]
  retailPaymentsByMethod?: { method: string; count: number; amount: number }[]
  topProducts: { productId: number; name: string; slug: string; quantity: number; revenue: number }[]
  topCategories: { categoryId: number | null; name: string; quantity: number; revenue: number }[]
  shippingCities: { city: string; orderCount: number; revenue: number }[]
  customers: { registeredWithOrders: number; guestOrders: number }
  shipments: { shippedCount: number; byCompany: { company: string; count: number }[] }
  reviews: { pendingTotal: number; pendingCreatedInRange: number }
}

function TrendMini({ pct }: { pct: number }) {
  const up = pct > 0
  const flat = pct === 0
  const color = flat ? "text-zinc-400" : up ? "text-emerald-600" : "text-red-600"
  const label = flat ? "0%" : `${up ? "+" : ""}${pct}%`
  return <span className={`text-[10px] font-medium ${color}`}>Önceki dönem: {label}</span>
}

export default function AdminReportsPage() {
  const today = useMemo(() => new Date(), [])
  const [from, setFrom] = useState(() => ymdLocal(addDaysLocal(today, -29)))
  const [to, setTo] = useState(() => ymdLocal(today))
  const [data, setData] = useState<ReportPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const q = new URLSearchParams({ from, to })
      const res = await fetch(`/api/admin/reports?${q}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.message || "Yükleme hatası")
      setData(j)
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : "Hata")
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    startTransition(() => {
      void load()
    })
  }, [load])

  const applyPreset = (days: number | "month" | "lastMonth") => {
    const end = new Date()
    if (days === "month") {
      const start = new Date(end.getFullYear(), end.getMonth(), 1)
      setFrom(ymdLocal(start))
      setTo(ymdLocal(end))
      return
    }
    if (days === "lastMonth") {
      const start = new Date(end.getFullYear(), end.getMonth() - 1, 1)
      const last = new Date(end.getFullYear(), end.getMonth(), 0)
      setFrom(ymdLocal(start))
      setTo(ymdLocal(last))
      return
    }
    setTo(ymdLocal(end))
    setFrom(ymdLocal(addDaysLocal(end, -(days - 1))))
  }

  const dailyData = data?.daily ?? []
  const hasChart = dailyData.some(
    (d) =>
      d.revenue > 0 ||
      d.orderCount > 0 ||
      (d.retailRevenue ?? 0) > 0 ||
      (d.retailCount ?? 0) > 0
  )
  const maxRev = Math.max(
    ...dailyData.map((d) => Math.max(d.revenue, d.retailRevenue ?? 0)),
    1
  )
  const CW = 760
  const CH = 160
  const toX = (i: number) => (i / Math.max(dailyData.length - 1, 1)) * CW
  const toY = (v: number) => CH - (v / maxRev) * CH
  const linePts = dailyData.map((d, i) => `${toX(i).toFixed(1)},${toY(d.revenue).toFixed(1)}`).join(" ")
  const areaPts = dailyData.length ? `0,${CH} ${linePts} ${CW},${CH}` : ""

  const exportCsv = () => {
    if (!data) return
    const sep = ";"
    const rows: string[][] = [
      ["Rapor", `${data.range.from} – ${data.range.to}`],
      [],
      ["Özet"],
      ["Site ciro", String(data.summary.revenue)],
      ["Mağaza ciro", String(data.summary.retailRevenue ?? 0)],
      ["Toplam ciro", String(data.summary.combinedRevenue ?? data.summary.revenue)],
      ["Ödenen sipariş", String(data.summary.orderCount)],
      ["Mağaza fiş", String(data.summary.retailSaleCount ?? 0)],
      ["Ortalama sepet", String(data.summary.averageOrderValue)],
      ["Ara toplam", String(data.summary.subtotal)],
      ["Kargo", String(data.summary.shippingCost)],
      ["İndirim", String(data.summary.discountTotal)],
      [],
      ["Gün", "Site ciro", "Sipariş", "Mağaza ciro", "Mağaza fiş"],
      ...data.daily.map((d) => [
        d.date,
        String(d.revenue),
        String(d.orderCount),
        String(d.retailRevenue ?? 0),
        String(d.retailCount ?? 0),
      ]),
      [],
      ["Ürün", "Adet", "Ciro"],
      ...data.topProducts.map((p) => [p.name, String(p.quantity), String(p.revenue)]),
    ]
    const body = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(sep)).join("\r\n")
    const bom = "\uFEFF"
    const blob = new Blob([bom + body], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `rapor-${data.range.from}-${data.range.to}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-zinc-200 border-t-[#813d50]" />
          <p className="text-[11px] font-medium text-zinc-400">Rapor yükleniyor…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative space-y-6 pb-10">
      {loading && data && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-2">
          <span className="rounded-full bg-zinc-900/80 px-3 py-1 text-[11px] font-medium text-white shadow-lg">
            Güncelleniyor…
          </span>
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin"
            className="mb-2 inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-[#813d50]"
          >
            <FaChevronLeft className="h-2.5 w-2.5" /> Panele dön
          </Link>
          <h1 className="text-[17px] font-medium text-zinc-800">Raporlar</h1>
          <p className="text-[12px] text-zinc-400">
            Ödenen siparişlere göre ciro ve detaylı kırılımlar (Türkiye takvim günü).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => applyPreset(7)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Son 7 gün
          </button>
          <button
            type="button"
            onClick={() => applyPreset(30)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Son 30 gün
          </button>
          <button
            type="button"
            onClick={() => applyPreset("month")}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Bu ay
          </button>
          <button
            type="button"
            onClick={() => applyPreset("lastMonth")}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Geçen ay
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-100 bg-white p-4">
        <label className="text-[11px] text-zinc-500">
          Başlangıç
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-lg border border-zinc-200 px-2 py-1.5 text-[12px] text-zinc-800"
          />
        </label>
        <label className="text-[11px] text-zinc-500">
          Bitiş
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-lg border border-zinc-200 px-2 py-1.5 text-[12px] text-zinc-800"
          />
        </label>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-[#813d50] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#673040] disabled:opacity-60"
        >
          <FaSync className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </button>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!data}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-[12px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          <FaDownload className="h-3 w-3" />
          CSV indir
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[12px] text-red-700">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-zinc-100 bg-white p-4"
            >
              <p className="text-[11px] text-zinc-400">Site ciro (ödendi)</p>
              <p className="mt-1 text-[18px] font-medium text-zinc-800">{money(data.summary.revenue)}</p>
              <TrendMini pct={data.summary.pctChangeRevenue} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 }}
              className="rounded-xl border border-zinc-100 bg-white p-4"
            >
              <p className="text-[11px] text-zinc-400">Sipariş adedi</p>
              <p className="mt-1 text-[18px] font-medium text-zinc-800">{data.summary.orderCount}</p>
              <TrendMini pct={data.summary.pctChangeOrders} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="rounded-xl border border-zinc-100 bg-white p-4"
            >
              <p className="text-[11px] text-zinc-400">Ortalama sepet</p>
              <p className="mt-1 text-[18px] font-medium text-zinc-800">
                {money(data.summary.averageOrderValue)}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.09 }}
              className="rounded-xl border border-zinc-100 bg-white p-4"
            >
              <p className="text-[11px] text-zinc-400">İndirim toplamı</p>
              <p className="mt-1 text-[18px] font-medium text-zinc-800">{money(data.summary.discountTotal)}</p>
              <p className="mt-0.5 text-[10px] text-zinc-400">
                {data.summary.ordersWithDiscountCount} siparişte indirim
              </p>
            </motion.div>
          </div>

          {(data.summary.retailRevenue != null || data.summary.combinedRevenue != null) && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                <p className="text-[11px] text-emerald-800/80">Mağaza ciro</p>
                <p className="mt-1 text-[18px] font-medium text-emerald-900">
                  {money(data.summary.retailRevenue ?? 0)}
                </p>
                {data.summary.pctChangeRetailRevenue != null && (
                  <TrendMini pct={data.summary.pctChangeRetailRevenue} />
                )}
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                <p className="text-[11px] text-emerald-800/80">Mağaza fiş adedi</p>
                <p className="mt-1 text-[18px] font-medium text-emerald-900">
                  {data.summary.retailSaleCount ?? 0}
                </p>
                {data.summary.pctChangeRetailCount != null && (
                  <TrendMini pct={data.summary.pctChangeRetailCount} />
                )}
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 lg:col-span-2">
                <p className="text-[11px] text-zinc-500">Site + mağaza toplam ciro</p>
                <p className="mt-1 text-[18px] font-medium text-zinc-900">
                  {money(data.summary.combinedRevenue ?? data.summary.revenue)}
                </p>
              </div>
            </div>
          )}

          {data.retailPaymentsByMethod && data.retailPaymentsByMethod.length > 0 && (
            <div className="rounded-xl border border-zinc-100 bg-white p-4">
              <p className="text-[12px] font-medium text-zinc-800">Mağaza ödeme dağılımı</p>
              <ul className="mt-2 space-y-1 text-[11px] text-zinc-600">
                {data.retailPaymentsByMethod.map((r) => (
                  <li key={r.method} className="flex justify-between gap-2">
                    <span>{r.method}</span>
                    <span>
                      {r.count} fiş · {money(r.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-zinc-100 bg-white p-4">
              <p className="text-[11px] text-zinc-400">Ara toplam</p>
              <p className="mt-1 text-[15px] font-medium text-zinc-800">{money(data.summary.subtotal)}</p>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-white p-4">
              <p className="text-[11px] text-zinc-400">Kargo geliri</p>
              <p className="mt-1 text-[15px] font-medium text-zinc-800">{money(data.summary.shippingCost)}</p>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-white p-4">
              <p className="text-[11px] text-zinc-400">Kayıtlı müşteri (sipariş)</p>
              <p className="mt-1 text-[15px] font-medium text-zinc-800">{data.customers.registeredWithOrders}</p>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-white p-4">
              <p className="text-[11px] text-zinc-400">Misafir sipariş</p>
              <p className="mt-1 text-[15px] font-medium text-zinc-800">{data.customers.guestOrders}</p>
            </div>
          </div>

          {data.summary.profit != null && (
            <div className="rounded-xl border border-zinc-100 bg-white p-4">
              <p className="text-[11px] text-zinc-400">Kayıtlı kar (profit alanı)</p>
              <p className="mt-1 text-[15px] font-medium text-zinc-800">{money(data.summary.profit)}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="h-fit self-start lg:col-span-2 rounded-xl border border-zinc-100 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-zinc-800">Günlük ciro</p>
                  <p className="text-[11px] text-zinc-400">
                    {data.range.from} — {data.range.to}
                  </p>
                </div>
              </div>
              <div className="relative h-36 w-full sm:h-40">
                {!hasChart ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-100 bg-zinc-50/60">
                    <p className="text-[11px] text-zinc-400">Bu aralıkta ödenen sipariş yok</p>
                  </div>
                ) : (
                  <svg viewBox={`0 0 ${CW} ${CH}`} className="h-full w-full overflow-visible" preserveAspectRatio="none">
                    {[0.25, 0.5, 0.75, 1].map((f) => (
                      <line
                        key={f}
                        x1={0}
                        x2={CW}
                        y1={(CH * (1 - f)).toFixed(1)}
                        y2={(CH * (1 - f)).toFixed(1)}
                        stroke="#f4f4f5"
                        strokeWidth="1"
                      />
                    ))}
                    <polygon points={areaPts} fill="#813d50" fillOpacity="0.07" />
                    <motion.polyline
                      fill="none"
                      stroke="#813d50"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={linePts}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 1, ease: "easeInOut" }}
                    />
                    {dailyData.map((d, i) => (
                      <circle
                        key={d.date}
                        cx={toX(i).toFixed(1)}
                        cy={toY(d.revenue).toFixed(1)}
                        r="3"
                        fill="white"
                        stroke="#813d50"
                        strokeWidth="1.5"
                      />
                    ))}
                  </svg>
                )}
              </div>
              {dailyData.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-between gap-2 px-1">
                  {dailyData
                    .filter(
                      (_, i) =>
                        i === 0 ||
                        i === dailyData.length - 1 ||
                        i % Math.max(1, Math.ceil(dailyData.length / 8)) === 0
                    )
                    .map((d) => (
                      <span key={d.date} className="text-[10px] text-zinc-400">
                        {new Date(d.date + "T12:00:00").toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    ))}
                </div>
              )}
            </div>

            <div className="h-fit space-y-4 self-start">
              <div className="rounded-xl border border-zinc-100 bg-white p-5">
                <p className="mb-3 text-[12.5px] font-medium text-zinc-800">Sipariş durumu</p>
                <div className="space-y-2">
                  {data.ordersByStatus.map((r) => (
                    <div key={r.status} className="flex justify-between text-[11.5px]">
                      <span className="text-zinc-500">{STATUS_TR[r.status] ?? r.status}</span>
                      <span className="font-medium text-zinc-800">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-white p-5">
                <p className="mb-3 text-[12.5px] font-medium text-zinc-800">Ödeme yöntemi</p>
                <div className="space-y-2">
                  {data.paymentsByMethod.length === 0 ? (
                    <p className="text-[11px] text-zinc-400">Veri yok</p>
                  ) : (
                    data.paymentsByMethod.map((r) => (
                      <div key={r.method} className="flex justify-between gap-2 text-[11.5px]">
                        <span className="text-zinc-500">{PAYMENT_TR[r.method] ?? r.method}</span>
                        <span className="shrink-0 font-medium text-zinc-800">{money(r.amount)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-white p-5">
                <p className="mb-3 text-[12.5px] font-medium text-zinc-800">Kargo / yorum</p>
                <p className="text-[11px] text-zinc-500">
                  Kargoya çıkan: <span className="font-medium text-zinc-800">{data.shipments.shippedCount}</span>
                </p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Bekleyen yorum:{" "}
                  <span className="font-medium text-zinc-800">{data.reviews.pendingTotal}</span> (aralıkta oluşan:{" "}
                  {data.reviews.pendingCreatedInRange})
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-100 bg-white">
            <table className="w-full min-w-[640px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80">
                  <th className="px-4 py-3 text-[10.5px] font-medium text-zinc-400">Ürün</th>
                  <th className="px-4 py-3 text-right text-[10.5px] font-medium text-zinc-400">Adet</th>
                  <th className="px-4 py-3 text-right text-[10.5px] font-medium text-zinc-400">Ciro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {data.topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-[11px] text-zinc-400">
                      Bu aralıkta satır kalemi yok
                    </td>
                  </tr>
                ) : (
                  data.topProducts.map((p) => (
                    <tr key={p.productId} className="hover:bg-zinc-50/60">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/admin/products/${p.productId}/edit`}
                          className="font-medium text-[#813d50] hover:underline"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right text-zinc-600">{p.quantity}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-zinc-800">{money(p.revenue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="overflow-x-auto rounded-xl border border-zinc-100 bg-white">
              <p className="border-b border-zinc-100 px-4 py-3 text-[12.5px] font-medium text-zinc-800">Kategoriler</p>
              <table className="w-full min-w-[400px] text-[12px]">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/80">
                    <th className="px-4 py-2 text-[10.5px] font-medium text-zinc-400">Kategori</th>
                    <th className="px-4 py-2 text-right text-[10.5px] font-medium text-zinc-400">Adet</th>
                    <th className="px-4 py-2 text-right text-[10.5px] font-medium text-zinc-400">Ciro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {data.topCategories.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-[11px] text-zinc-400">
                        Kategori verisi yok
                      </td>
                    </tr>
                  ) : (
                    data.topCategories.map((c, i) => (
                      <tr key={`${c.categoryId ?? "x"}-${i}`}>
                        <td className="px-4 py-2 text-zinc-700">{c.name}</td>
                        <td className="px-4 py-2 text-right text-zinc-600">{c.quantity}</td>
                        <td className="px-4 py-2 text-right font-medium text-zinc-800">{money(c.revenue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="overflow-x-auto rounded-xl border border-zinc-100 bg-white">
              <p className="border-b border-zinc-100 px-4 py-3 text-[12.5px] font-medium text-zinc-800">
                Şehir (teslimat)
              </p>
              <table className="w-full min-w-[400px] text-[12px]">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/80">
                    <th className="px-4 py-2 text-[10.5px] font-medium text-zinc-400">Şehir</th>
                    <th className="px-4 py-2 text-right text-[10.5px] font-medium text-zinc-400">Sipariş</th>
                    <th className="px-4 py-2 text-right text-[10.5px] font-medium text-zinc-400">Ciro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {data.shippingCities.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-[11px] text-zinc-400">
                        Şehir verisi yok
                      </td>
                    </tr>
                  ) : (
                    data.shippingCities.map((c) => (
                      <tr key={c.city}>
                        <td className="px-4 py-2 text-zinc-700">{c.city}</td>
                        <td className="px-4 py-2 text-right text-zinc-600">{c.orderCount}</td>
                        <td className="px-4 py-2 text-right font-medium text-zinc-800">{money(c.revenue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {data.shipments.byCompany.length > 0 && (
            <div className="rounded-xl border border-zinc-100 bg-white p-5">
              <p className="mb-3 text-[12.5px] font-medium text-zinc-800">Kargo firması (çıkış tarihi aralıkta)</p>
              <div className="flex flex-wrap gap-2">
                {data.shipments.byCompany.map((s) => (
                  <span
                    key={s.company}
                    className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] text-zinc-700"
                  >
                    {s.company}: {s.count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
