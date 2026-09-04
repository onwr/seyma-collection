"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { motion } from "framer-motion"
import {
  FaExclamationTriangle,
  FaChevronRight,
  FaPlus,
  FaCalendar,
  FaChartLine,
  FaDownload,
  FaCircle,
} from "react-icons/fa"
import Link from "next/link"
import { playAdminRetailCashSound } from "@/lib/adminRetailCashSound"

// ── Durum etiketi yardımcısı ──────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  DELIVERED: { label: "Teslim", bg: "#d1fae5", color: "#065f46" },
  SHIPPED: { label: "Kargoda", bg: "#dbeafe", color: "#1e40af" },
  PROCESSING: { label: "Hazırlık", bg: "#fef3c7", color: "#92400e" },
  PENDING: { label: "Beklemede", bg: "#f3f4f6", color: "#374151" },
  CANCELLED: { label: "İptal", bg: "#fee2e2", color: "#991b1b" },
  REFUNDED: { label: "İade", bg: "#fee2e2", color: "#991b1b" },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, bg: "#f3f4f6", color: "#374151" }
  return (
    <span
      className="inline-block rounded-[5px] px-2 py-0.5 text-[10px] font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}

// ── Küçük SVG grafik ──────────────────────────────────────────────────────────
function Sparkline({ data, color = "#813d50" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data)
  const range = max - min || 1
  const W = 80
  const H = 28
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W
      const y = H - ((v - min) / range) * H
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  )
}

// ── Trend badge ───────────────────────────────────────────────────────────────
function TrendBadge({ value }: { value: string }) {
  const isUp = value.startsWith("+")
  const isNeutral = value === "Sabit"
  const bg = isNeutral ? "#f3f4f6" : isUp ? "#d1fae5" : "#fee2e2"
  const color = isNeutral ? "#374151" : isUp ? "#065f46" : "#991b1b"
  return (
    <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ background: bg, color }}>
      {value}
    </span>
  )
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────
const BUGUN_MAGAZA_CIRO = "Bugün Mağaza Ciro"

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const lastTodayRetailRef = useRef<number | null>(null)
  const [retailRevenueFlash, setRetailRevenueFlash] = useState(false)
  const [selectedVariants, setSelectedVariants] = useState<Set<number>>(() => new Set())
  const [addStockAmount, setAddStockAmount] = useState(10)
  const [stockSaving, setStockSaving] = useState(false)
  const [stockBanner, setStockBanner] = useState<{ text: string; error?: boolean } | null>(null)
  const [dateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  })

  const applyAdminStats = useCallback((d: any, mode: "initial" | "poll" | "manual") => {
    const nextRetail = Number(d.todayRetailRevenue ?? 0)
    if (mode === "poll" && lastTodayRetailRef.current !== null && nextRetail > lastTodayRetailRef.current) {
      playAdminRetailCashSound()
      setRetailRevenueFlash(true)
      window.setTimeout(() => setRetailRevenueFlash(false), 2200)
    }
    lastTodayRetailRef.current = nextRetail
    setData(d)
  }, [])

  const reloadStats = useCallback(async () => {
    const r = await fetch("/api/admin/stats")
    if (!r.ok) return
    applyAdminStats(await r.json(), "manual")
  }, [applyAdminStats])

  useEffect(() => {
    let cancelled = false
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        applyAdminStats(d, "initial")
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [applyAdminStats])

  useEffect(() => {
    if (loading) return
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return
      void (async () => {
        try {
          const r = await fetch("/api/admin/stats")
          if (!r.ok) return
          applyAdminStats(await r.json(), "poll")
        } catch {
          /* sessiz */
        }
      })()
    }, 5000)
    return () => clearInterval(id)
  }, [loading, applyAdminStats])

  useEffect(() => {
    if (!stockBanner) return
    const t = setTimeout(() => setStockBanner(null), 4500)
    return () => clearTimeout(t)
  }, [stockBanner])

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "+100%" : "Sabit"
    const diff = ((current - previous) / previous) * 100
    return `${diff >= 0 ? "+" : ""}${Math.round(diff)}%`
  }

  const toggleVariant = (id: number) => {
    setSelectedVariants((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllLowStock = () => {
    if (!data?.lowStock?.length) return
    setSelectedVariants(new Set(data.lowStock.map((x: { variantId: number }) => x.variantId)))
  }

  const clearVariantSelection = () => setSelectedVariants(new Set())

  const increaseSelectedStock = async () => {
    if (selectedVariants.size === 0) return
    setStockSaving(true)
    setStockBanner(null)
    try {
      const res = await fetch("/api/admin/stock/increase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantIds: Array.from(selectedVariants),
          amount: addStockAmount,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.message || "İşlem başarısız")
      setSelectedVariants(new Set())
      await reloadStats()
      setStockBanner({ text: `${j.updated} kalem +${j.amount} adet stok eklendi.` })
    } catch (e) {
      setStockBanner({
        text: e instanceof Error ? e.message : "Bir hata oluştu",
        error: true,
      })
    } finally {
      setStockSaving(false)
    }
  }

  const isCurrency = (label: string) =>
    label.includes("Ciro") ||
    label.includes("Sepet") ||
    label.includes("Mağaza") ||
    label.includes("Toplam")

  const formatValue = (value: number, label: string) =>
    isCurrency(label)
      ? "₺" + value.toLocaleString("tr-TR")
      : value.toLocaleString("tr-TR")

  const stats = useMemo(() => {
    if (!data) return []
    return [
      {
        label: "Bugün Ciro",
        value: data.todayRevenue || 0,
        prev: data.yesterdayRevenue || 0,
        prevLabel: "Dün",
        trend: calculateTrend(data.todayRevenue || 0, data.yesterdayRevenue || 0),
        spark: data.weekRevenue || [],
      },
      {
        label: "Bu Ay Ciro",
        value: data.monthRevenue || 0,
        prev: data.lastMonthRevenue || 0,
        prevLabel: "Geçen ay",
        trend: calculateTrend(data.monthRevenue || 0, data.lastMonthRevenue || 0),
        spark: data.monthlyRevenue || [],
      },
      {
        label: BUGUN_MAGAZA_CIRO,
        value: data.todayRetailRevenue || 0,
        prev: data.yesterdayRetailRevenue || 0,
        prevLabel: "Dün",
        trend: calculateTrend(
          data.todayRetailRevenue || 0,
          data.yesterdayRetailRevenue || 0
        ),
        spark: [],
      },
      {
        label: "Bu Ay Mağaza Ciro",
        value: data.monthRetailRevenue || 0,
        prev: data.lastMonthRetailRevenue || 0,
        prevLabel: "Geçen ay",
        trend: calculateTrend(
          data.monthRetailRevenue || 0,
          data.lastMonthRetailRevenue || 0
        ),
        spark: [],
      },
      {
        label: "Bugün Toplam (Site+Mağaza)",
        value:
          data.todayCombinedRevenue ??
          (data.todayRevenue || 0) + (data.todayRetailRevenue || 0),
        prev:
          data.yesterdayCombinedRevenue ??
          (data.yesterdayRevenue || 0) + (data.yesterdayRetailRevenue || 0),
        prevLabel: "Dün",
        trend: calculateTrend(
          data.todayCombinedRevenue ??
            (data.todayRevenue || 0) + (data.todayRetailRevenue || 0),
          data.yesterdayCombinedRevenue ??
            (data.yesterdayRevenue || 0) + (data.yesterdayRetailRevenue || 0)
        ),
        spark: [],
      },
      {
        label: "Toplam Sipariş",
        value: data.totalOrders || 0,
        prev: data.previousOrders || 0,
        prevLabel: "Geçen dönem",
        trend: calculateTrend(data.totalOrders || 0, data.previousOrders || 0),
        spark: data.dailyOrders || [],
      },
      {
        label: "Ortalama Sepet",
        value: data.averageOrderValue || 0,
        prev: data.previousAvgOrder || 0,
        prevLabel: "Geçen ay",
        trend: calculateTrend(data.averageOrderValue || 0, data.previousAvgOrder || 0),
        spark: [],
      },
      {
        label: "Bekleyen Sipariş",
        value: data.pendingOrders || 0,
        prev: data.previousPending || 0,
        prevLabel: "Geçen dönem",
        trend: calculateTrend(data.pendingOrders || 0, data.previousPending || 0),
        spark: [],
      },
      {
        label: "Yeni Müşteriler",
        value: data.newCustomers || 0,
        prev: data.previousCustomers || 0,
        prevLabel: "Geçen ay",
        trend: calculateTrend(data.newCustomers || 0, data.previousCustomers || 0),
        spark: [],
      },
    ]
  }, [data])

  // SVG grafik verisi
  const dailyData = data?.dailyRevenue || []
  const hasChart = dailyData.some((d: any) => d.total > 0)
  const maxRevenue = Math.max(...dailyData.map((d: any) => d.total), 100)
  const CW = 760; const CH = 200
  const toX = (i: number) => (i / Math.max(dailyData.length - 1, 1)) * CW
  const toY = (v: number) => CH - (v / maxRevenue) * CH

  const linePts = dailyData.map((d: any, i: number) =>
    `${toX(i).toFixed(1)},${toY(d.total).toFixed(1)}`).join(" ")
  const areaPts = dailyData.length
    ? `0,${CH} ` + linePts + ` ${CW},${CH}`
    : ""

  // Operasyonel durum
  const opItems = useMemo(() => {
    if (!data) return []
    const items = [
      { label: "Hazırlanıyor", count: data.processingOrders || 0, color: "#f59e0b" },
      { label: "Kargoda", count: data.shippedOrders || 0, color: "#3b82f6" },
      { label: "Tamamlanan", count: data.completedOrders || 0, color: "#813d50" },
      { label: "İade Bekleyen", count: data.refundedOrders || 0, color: "#ef4444" },
    ]
    const total = items.reduce((s, x) => s + x.count, 0) || 1
    return items.map(x => ({ ...x, pct: Math.round((x.count / total) * 100) }))
  }, [data])

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-zinc-200 border-t-[#813d50]" />
          <p className="text-[11px] font-medium text-zinc-400">Veriler yükleniyor...</p>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-zinc-900">Genel Bakış</h1>
          <p className="text-[12px] text-zinc-400">
            {dateRange.from.toLocaleDateString("tr-TR")} —{" "}
            {dateRange.to.toLocaleDateString("tr-TR")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[11.5px] text-zinc-500">
            <FaCalendar className="h-3 w-3 text-zinc-400" />
            Son 30 gün
          </div>
          <Link
            href="/admin/products/new"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#813d50] px-4 py-2 text-[12px] font-bold text-white
                       transition hover:bg-[#673040] active:scale-[.98] sm:flex-none"
          >
            <FaPlus className="h-2.5 w-2.5" /> Yeni Ürün
          </Link>
        </div>
      </div>

      {/* ── STATS GRID ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat, i) => {
          const isTodayRetailCard = stat.label === BUGUN_MAGAZA_CIRO
          return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={
              retailRevenueFlash && isTodayRetailCard
                ? {
                    opacity: 1,
                    y: 0,
                    boxShadow: [
                      "0 0 0 0 rgba(34,197,94,0)",
                      "0 0 36px 10px rgba(34,197,94,0.38)",
                      "0 0 14px 3px rgba(34,197,94,0.2)",
                      "0 0 0 0 rgba(34,197,94,0)",
                    ],
                    backgroundColor: ["#ffffff", "#ecfdf5", "#f0fdf4", "#ffffff"],
                  }
                : { opacity: 1, y: 0, boxShadow: "0 0 0 0 transparent", backgroundColor: "#ffffff" }
            }
            transition={
              retailRevenueFlash && isTodayRetailCard
                ? {
                    boxShadow: { duration: 1.35, times: [0, 0.32, 0.62, 1], ease: "easeInOut" },
                    backgroundColor: { duration: 1.35, times: [0, 0.32, 0.62, 1], ease: "easeInOut" },
                  }
                : { delay: i * 0.04 }
            }
            className="rounded-xl border border-zinc-100 bg-white p-4"
          >
            <div className="mb-3 flex items-start justify-between">
              <p className="text-[11px] text-zinc-400">{stat.label}</p>
              <TrendBadge value={stat.trend} />
            </div>
            <p className="mb-1 text-[20px] font-medium text-zinc-800 leading-none">
              {formatValue(stat.value, stat.label)}
            </p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-[10.5px] text-zinc-400">
                {stat.prevLabel}:{" "}
                <span className="text-zinc-500">
                  {formatValue(stat.prev, stat.label)}
                </span>
              </p>
              {stat.spark.length > 1 && (
                <Sparkline data={stat.spark} />
              )}
            </div>
          </motion.div>
          )
        })}
      </div>

      {/* ── CHART + SIDEBAR ────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">

        {/* Satış trendi grafiği */}
        <div className="h-fit self-start xl:col-span-2 rounded-xl border border-zinc-100 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-zinc-800">Satış Trendi</p>
              <p className="text-[11px] text-zinc-400">Son 30 gün — günlük ciro</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#813d50]" />
                Günlük ciro
              </span>
              <button className="text-zinc-300 transition hover:text-zinc-600">
                <FaDownload className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="relative h-36 w-full sm:h-40">
            {!hasChart ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center
                              rounded-lg border-2 border-dashed border-zinc-100 bg-zinc-50/60">
                <FaChartLine className="mb-2 h-6 w-6 text-zinc-200" />
                <p className="text-[11px] text-zinc-400">Gösterilecek veri yok</p>
              </div>
            ) : (
              <svg
                viewBox={`0 0 ${CW} ${CH}`}
                className="h-full w-full overflow-visible"
                preserveAspectRatio="none"
              >
                {/* Yatay kılavuz çizgileri */}
                {[0.25, 0.5, 0.75, 1].map(f => (
                  <line key={f} x1={0} x2={CW}
                    y1={(CH * (1 - f)).toFixed(1)} y2={(CH * (1 - f)).toFixed(1)}
                    stroke="#f4f4f5" strokeWidth="1" />
                ))}
                {/* Alan dolgusu */}
                <polygon points={areaPts} fill="#813d50" fillOpacity="0.07" />
                {/* Çizgi */}
                <motion.polyline
                  fill="none" stroke="#813d50" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                  points={linePts}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.4, ease: "easeInOut" }}
                />
                {/* Noktalar */}
                {dailyData.map((d: any, i: number) => (
                  <circle
                    key={i}
                    cx={toX(i).toFixed(1)}
                    cy={toY(d.total).toFixed(1)}
                    r="3"
                    fill="white"
                    stroke="#813d50"
                    strokeWidth="1.5"
                  />
                ))}
              </svg>
            )}
          </div>

          {/* X ekseni etiketleri */}
          {dailyData.length > 0 && (
            <div className="mt-3 flex justify-between px-1">
              {dailyData
                .filter((_: any, i: number) =>
                  i === 0 ||
                  i === dailyData.length - 1 ||
                  i % Math.ceil(dailyData.length / 6) === 0
                )
                .map((d: any) => (
                  <span key={d.date} className="text-[10px] text-zinc-400">
                    {new Date(d.date).toLocaleDateString("tr-TR", {
                      day: "numeric", month: "short",
                    })}
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* Operasyonel durum */}
        <div className="h-fit self-start">
          <div className="rounded-xl border border-zinc-100 bg-white p-5">
            <p className="mb-4 text-[12.5px] font-medium text-zinc-800">Operasyonel Durum</p>
            <div className="space-y-3.5">
              {opItems.map(item => (
                <div key={item.label}>
                  <div className="mb-1.5 flex justify-between text-[11.5px]">
                    <span className="text-zinc-500">{item.label}</span>
                    <span className="font-medium text-zinc-700">{item.count}</span>
                  </div>
                  <div className="h-[3px] overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${item.pct}%`, background: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Kritik stok (tam genişlik, grafik + operasyonel altında) ───────── */}
      <div className="rounded-xl border border-zinc-100 bg-white p-5">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <p className="text-[12.5px] font-medium text-zinc-800">Kritik Stok</p>
            {data?.lowStock?.length > 0 && (
              <span className="rounded-[5px] bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
                {data.lowStock.length} varyant
              </span>
            )}
          </div>
        </div>

        {data?.lowStock?.length > 0 ? (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-zinc-100 pb-3">
              <label className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <span className="whitespace-nowrap">Eklenecek adet</span>
                <input
                  type="number"
                  min={1}
                  max={99999}
                  value={addStockAmount}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10)
                    if (!Number.isFinite(v)) return
                    setAddStockAmount(Math.min(99999, Math.max(1, v)))
                  }}
                  className="w-16 rounded-md border border-zinc-200 bg-white px-2 py-1 text-center text-[12px] text-zinc-800 outline-none focus:border-[#813d50]"
                />
              </label>
              <button
                type="button"
                disabled={stockSaving || selectedVariants.size === 0}
                onClick={increaseSelectedStock}
                className="rounded-lg bg-[#813d50] px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-[#673040] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {stockSaving ? "Kaydediliyor…" : "Seçilenlerin stokunu artır"}
              </button>
              <button
                type="button"
                onClick={selectAllLowStock}
                className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Tümünü seç
              </button>
              <button
                type="button"
                onClick={clearVariantSelection}
                className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Seçimi temizle
              </button>
            </div>
            {stockBanner && (
              <p
                className={`mb-2 text-[11px] ${stockBanner.error ? "text-red-600" : "text-[#813d50]"}`}
              >
                {stockBanner.text}
              </p>
            )}
            <div className="max-h-[min(360px,45vh)] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-x-6 gap-y-0 sm:grid-cols-2 xl:grid-cols-3">
                {data.lowStock.map((item: { variantId: number; productId: number; name: string; stock: number }) => (
                  <div
                    key={item.variantId}
                    className="flex items-start gap-2 border-b border-zinc-100 py-2.5"
                  >
                    <input
                      type="checkbox"
                      checked={selectedVariants.has(item.variantId)}
                      onChange={() => toggleVariant(item.variantId)}
                      className="mt-1 h-3.5 w-3.5 shrink-0 rounded border-zinc-300 text-[#813d50] focus:ring-[#813d50]"
                    />
                    <Link
                      href={`/admin/products/${item.productId}/edit`}
                      className="group flex min-w-0 flex-1 items-center justify-between rounded-lg px-0.5 py-0 transition-colors hover:bg-zinc-50/80"
                    >
                      <div className="min-w-0">
                        <p className="wrap-break-word text-[12px] font-medium text-zinc-700">{item.name}</p>
                        <p className="text-[10.5px] text-red-500">Kalan: {item.stock} adet</p>
                      </div>
                      <FaChevronRight className="ml-2 h-2.5 w-2.5 shrink-0 text-zinc-300 transition group-hover:text-[#813d50]" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5">
            <span className="text-[11px] text-emerald-700">Tüm stoklar normal düzeyde</span>
          </div>
        )}
      </div>

      {/* ── RECENT ORDERS TABLE ─────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-100 bg-white p-5">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-[13px] font-medium text-zinc-800">Son Siparişler</p>
          <Link href="/admin/orders"
            className="text-[11.5px] font-medium text-[#813d50] hover:underline">
            Tümünü gör →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-100">
                {["Sipariş No", "Müşteri", "Ürünler", "Tutar", "Durum"].map((h, idx) => (
                  <th key={h}
                    className={`pb-3 text-[10.5px] font-medium text-zinc-400 ${idx >= 2 ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {data?.recentOrders?.map((o: any) => (
                <tr key={o.id} className="transition-colors hover:bg-zinc-50/60">
                  <td className="align-top py-3 pr-3 font-mono text-[11.5px] whitespace-nowrap text-zinc-400">
                    #{o.orderNo}
                  </td>
                  <td className="align-top py-3 pr-4 text-[12.5px] text-zinc-700 wrap-break-word">
                    {o.customer}
                  </td>
                  <td className="align-top py-3 text-right text-[12px] text-zinc-500">
                    {o.itemCount ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-medium text-zinc-600">{o.itemCount} ürün</span>
                        {o.productsPreview ? (
                          <span
                            className="max-w-[280px] wrap-break-word text-[11px] leading-snug text-zinc-400"
                            title={o.productsPreview}
                          >
                            {o.productsPreview}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="align-top py-3 text-right text-[12.5px] font-medium whitespace-nowrap text-zinc-800">
                    ₺{o.grandTotal.toLocaleString("tr-TR")}
                  </td>
                  <td className="align-top py-3 text-right whitespace-nowrap">
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
              {(!data?.recentOrders || data.recentOrders.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[11px] text-zinc-400">
                    Sipariş bulunmuyor
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}