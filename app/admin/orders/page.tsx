"use client"

import { useState, useEffect, useCallback } from "react"
import {
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaEye,
  FaBoxOpen,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaFileExport,
  FaCalendarAlt,
  FaCheck,
  FaTrash,
  FaShippingFast,
  FaCreditCard as FaPay,
  FaExclamationCircle,
  FaChevronRight as FaArrowRight,
} from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

// ── Tip tanımları ─────────────────────────────────────────────────────────────
type SortField = "orderNo" | "createdAt" | "grandTotal" | "status"
type SortDir = "asc" | "desc"

interface Order {
  id: string
  orderNo: string
  shippingFullName: string
  guestEmail?: string
  createdAt: string
  grandTotal: number
  status: string
  paymentStatus: string
  itemCount?: number
  user?: { email: string }
}

// ── Durum meta verisi ─────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  PENDING: { label: "Bekliyor", bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
  PAID: { label: "Ödendi", bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
  PROCESSING: { label: "Hazırlanıyor", bg: "#f3e8ff", color: "#6b21a8", dot: "#a855f7" },
  SHIPPED: { label: "Kargoda", bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
  DELIVERED: { label: "Teslim Edildi", bg: "#d1fae5", color: "#065f46", dot: "#4f6f52" },
  CANCELLED: { label: "İptal", bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" },
  REFUNDED: { label: "İade", bg: "#fee2e2", color: "#b91c1c", dot: "#ef4444" },
}

const STATUSES = ["ALL", "PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[5px] px-2 py-1 text-[10.5px] font-medium whitespace-nowrap"
      style={{ background: m.bg, color: m.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: m.dot }} />
      {m.label}
    </span>
  )
}

function PaymentBadge({ status }: { status: string }) {
  const isPaid = status === "PAID"
  const isPending = status === "PENDING"
  return (
    <span
      className="inline-block rounded-[4px] px-1.5 py-0.5 text-[10px] font-medium"
      style={{
        background: isPaid ? "#d1fae5" : isPending ? "#fef3c7" : "#f3f4f6",
        color: isPaid ? "#065f46" : isPending ? "#92400e" : "#374151",
      }}
    >
      {isPaid ? "Ödendi" : isPending ? "Bekliyor" : status}
    </span>
  )
}

// Müşteri baş harfi avatarı
function Avatar({ name }: { name: string }) {
  const letters = name
    .split(" ")
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("")
  const colors = [
    ["#dbeafe", "#1e40af"],
    ["#f3e8ff", "#6b21a8"],
    ["#d1fae5", "#065f46"],
    ["#fef3c7", "#92400e"],
    ["#fee2e2", "#991b1b"],
  ]
  const idx = name.charCodeAt(0) % colors.length
  const [bg, color] = colors[idx]
  return (
    <span
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
      style={{ background: bg, color }}
    >
      {letters || "?"}
    </span>
  )
}

function SortIcon({ field, active, dir }: { field: string; active: string; dir: SortDir }) {
  if (active !== field) return <FaSort className="h-2.5 w-2.5 text-zinc-300" />
  return dir === "asc"
    ? <FaSortUp className="h-2.5 w-2.5 text-[#4f6f52]" />
    : <FaSortDown className="h-2.5 w-2.5 text-[#4f6f52]" />
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────
export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("ALL")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [sortField, setSortField] = useState<SortField>("createdAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkLoading, setIsBulkLoading] = useState(false)
  const [deletingOrderNo, setDeletingOrderNo] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        status,
        search,
        sort: sortField,
        dir: sortDir,
        startDate,
        endDate
      })
      const res = await fetch(`/api/admin/orders?${params}`)
      const data = await res.json()
      if (res.ok) {
        setOrders(data.items)
        setTotalPages(data.pagination.totalPages)
        setTotalCount(data.pagination.totalCount ?? 0)
        if (data.summary) setSummary(data.summary)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, status, sortField, sortDir, startDate, endDate, search])

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        status,
        search,
        startDate,
        endDate,
        limit: "1000", // Export up to 1000 records
        sort: sortField,
        dir: sortDir
      })

      const res = await fetch(`/api/admin/orders?${params}`)
      const data = await res.json()

      if (!res.ok) throw new Error("Export failed")

      const items = data.items || []
      if (items.length === 0) {
        alert("Dışa aktarılacak veri bulunamadı.")
        return
      }

      // CSV Header
      const headers = ["Siparis No", "Musteri", "Email", "Tarih", "Tutar", "Odeme", "Durum"]
      const rows = items.map((o: any) => [
        o.orderNo,
        o.shippingFullName,
        o.guestEmail || o.user?.email || "-",
        new Date(o.createdAt).toLocaleString("tr-TR"),
        o.grandTotal,
        o.paymentStatus === "PAID" ? "Odendi" : "Bekliyor",
        STATUS_META[o.status]?.label || o.status
      ])

      const csvContent = [
        headers.join(","),
        ...rows.map((r: any) => r.join(","))
      ].join("\n")

      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `siparisler_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

    } catch (err) {
      console.error(err)
      alert("Dışa aktarma sırasında bir hata oluştu.")
    }
  }

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleBulkAction = async (action: string, value: string) => {
    if (selectedIds.length === 0) return
    if (!window.confirm(`${selectedIds.length} sipariş için bu işlemi yapmak istediğinize emin misiniz?`)) return

    setIsBulkLoading(true)
    try {
      const res = await fetch("/api/admin/orders/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, action, value })
      })
      if (res.ok) {
        setSelectedIds([])
        fetchOrders()
      } else {
        const d = await res.json()
        alert(d.message || "Bir hata oluştu")
      }
    } catch (err) {
      alert("Bağlantı hatası")
    } finally {
      setIsBulkLoading(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === orders.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(orders.map(o => o.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const handleDeleteOrderRow = async (orderNo: string, orderId: string) => {
    if (
      !window.confirm(
        `#${orderNo} kalıcı olarak silinsin mi?\n\nSatırlar ve ödemeler silinir; sipariş özeti işlem günlüğüne yazılır. Geri alınamaz.`
      )
    ) {
      return
    }
    setDeletingOrderNo(orderNo)
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderNo)}`, {
        method: "DELETE",
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) {
        setSelectedIds((prev) => prev.filter((id) => id !== orderId))
        void fetchOrders()
      } else {
        alert(typeof d.message === "string" ? d.message : "Sipariş silinemedi.")
      }
    } catch {
      alert("Bağlantı hatası")
    } finally {
      setDeletingOrderNo(null)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchOrders()
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortField(field); setSortDir("desc") }
  }

  const SUMMARY_CHIPS = [
    { key: "ALL", label: "Toplam", color: "text-zinc-600" },
    { key: "PENDING", label: "Bekliyor", color: "text-amber-600" },
    { key: "SHIPPED", label: "Kargoda", color: "text-blue-600" },
    { key: "DELIVERED", label: "Teslim Edildi", color: "text-[#4f6f52]" },
    { key: "CANCELLED", label: "İptal / İade", color: "text-red-500" },
  ]

  return (
    <div className="space-y-5 pb-10">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[17px] font-medium text-zinc-800">Siparişler</h1>
          <p className="text-[12px] text-zinc-400">
            {totalCount > 0 ? `${totalCount.toLocaleString("tr-TR")} sipariş` : "Tüm siparişler"}
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-[12px] text-zinc-500 transition hover:bg-zinc-50"
        >
          <FaFileExport className="h-3 w-3" />
          Dışa Aktar
        </button>
      </div>

      {/* ── BEKLEYEN SİPARİŞLER (KRİTİK) ──────────────────────── */}
      {summary["PENDING"] > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-amber-600">
              <FaExclamationCircle className="h-3.5 w-3.5 animate-pulse" />
              Onay Bekleyen Siparişler ({summary["PENDING"]})
            </h2>
            <button
              onClick={() => { setStatus("PENDING"); setPage(1) }}
              className="text-[11.5px] font-medium text-zinc-400 transition hover:text-[#4f6f52]"
            >
              Hepsini Gör →
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {orders
              .filter(o => o.status === "PENDING")
              .slice(0, 4)
              .map(order => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.orderNo}`}
                  className="group flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/30 p-3.5 transition-all hover:border-amber-200 hover:bg-amber-50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={order.shippingFullName} />
                    <div>
                      <p className="text-[12.5px] font-semibold text-zinc-800">#{order.orderNo}</p>
                      <p className="text-[11px] text-zinc-500">{order.shippingFullName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[12.5px] font-bold text-amber-700">₺{order.grandTotal.toLocaleString("tr-TR")}</p>
                    <p className="text-[10px] text-zinc-400">Yeni</p>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* ── ÖZET CHIP'LER ──────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {SUMMARY_CHIPS.map(chip => {
          const count = chip.key === "ALL"
            ? totalCount
            : chip.key === "CANCELLED"
              ? (summary["CANCELLED"] ?? 0) + (summary["REFUNDED"] ?? 0)
              : (summary[chip.key] ?? 0)
          const isActive = status === chip.key || (chip.key === "CANCELLED" && (status === "CANCELLED" || status === "REFUNDED"))
          return (
            <button
              key={chip.key}
              onClick={() => { setStatus(chip.key); setPage(1) }}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-[11.5px] transition
                ${isActive
                  ? "bg-white border border-zinc-200 shadow-sm font-medium text-zinc-800"
                  : "bg-white/60 border border-transparent text-zinc-400 hover:bg-white hover:border-zinc-200"}`}
            >
              <span className={chip.color + " font-semibold"}>{count}</span>
              <span>{chip.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── FİLTRE BARI ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-100 bg-white p-4 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-300" />
          <input
            type="text"
            placeholder="Sipariş no, müşteri adı veya e-posta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-zinc-100 bg-zinc-50 pl-9 pr-4 text-[12.5px]
                       text-zinc-800 outline-none transition focus:border-[#4f6f52] focus:bg-white"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-2.5 py-1.5 transition-all focus-within:bg-white focus-within:border-[#4f6f52] focus-within:ring-2 focus-within:ring-[#4f6f52]/5">
            <FaCalendarAlt className="h-3 w-3 text-zinc-400" />
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setPage(1) }}
              className="bg-transparent text-[11.5px] text-zinc-600 outline-none"
            />
            <span className="text-zinc-300">—</span>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setPage(1) }}
              className="bg-transparent text-[11.5px] text-zinc-600 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400 font-medium">Durum:</span>
            <select
              value={status}
              onChange={e => { setStatus(e.target.value); setPage(1) }}
              className="h-9 rounded-lg border border-zinc-100 bg-zinc-50 px-3 text-[12px] text-zinc-700
                         outline-none transition focus:border-[#4f6f52] focus:bg-white cursor-pointer font-medium"
            >
              {STATUSES.map(s => (
                <option key={s} value={s}>
                  {s === "ALL" ? "Tüm Durumlar" : (STATUS_META[s]?.label ?? s)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── TABLO ──────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-zinc-100 bg-white relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "45px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "220px" }} />
              <col style={{ width: "130px" }} />
              <col style={{ width: "80px" }} />
              <col style={{ width: "100px" }} />
              <col style={{ width: "130px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "64px" }} />
            </colgroup>
            <thead className="border-b border-zinc-100 bg-zinc-50/60">
              <tr>
                <th className="px-5 py-3.5">
                  <input
                    type="checkbox"
                    checked={orders.length > 0 && selectedIds.length === orders.length}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-zinc-300 text-[#4f6f52] focus:ring-[#4f6f52] cursor-pointer"
                  />
                </th>
                {[
                  { label: "Sipariş No", field: "orderNo" as SortField, align: "" },
                  { label: "Müşteri", field: null, align: "" },
                  { label: "Tarih", field: "createdAt" as SortField, align: "" },
                  { label: "Ürün", field: null, align: "" },
                  { label: "Tutar", field: "grandTotal" as SortField, align: "" },
                  { label: "Ödeme", field: null, align: "" },
                  { label: "Durum", field: "status" as SortField, align: "" },
                  { label: "", field: null, align: "text-right" },
                ].map((col, i) => (
                  <th
                    key={i}
                    className={`px-5 py-3.5 text-[10.5px] font-medium text-zinc-400 ${col.align}`}
                  >
                    {col.field ? (
                      <button
                        onClick={() => toggleSort(col.field!)}
                        className="flex items-center gap-1.5 hover:text-zinc-700 transition-colors"
                      >
                        {col.label}
                        <SortIcon field={col.field} active={sortField} dir={sortDir} />
                      </button>
                    ) : col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              <AnimatePresence mode="wait">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-200 border-t-[#4f6f52]" />
                        <span className="text-[11px] text-zinc-400">Yükleniyor...</span>
                      </div>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-zinc-200">
                        <FaBoxOpen className="h-12 w-12" />
                        <p className="text-[12px] text-zinc-400">
                          {search ? `"${search}" için sonuç bulunamadı` : "Sipariş bulunamadı"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : orders.map((order, i) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`group transition-colors hover:bg-zinc-50/70 ${selectedIds.includes(order.id) ? "bg-zinc-50" : ""}`}
                  >
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        className="h-3.5 w-3.5 rounded border-zinc-300 text-[#4f6f52] focus:ring-[#4f6f52] cursor-pointer"
                      />
                    </td>

                    {/* Sipariş No */}
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/orders/${order.orderNo}`}
                        className="font-mono text-[12px] font-medium text-zinc-700 hover:text-[#4f6f52] transition-colors"
                      >
                        #{order.orderNo}
                      </Link>
                    </td>

                    {/* Müşteri */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={order.shippingFullName} />
                        <div className="min-w-0">
                           <p className="truncate text-[12.5px] font-medium text-zinc-800">
                             {order.shippingFullName}
                           </p>
                           <p className="truncate text-[11px] text-zinc-400">
                             {order.guestEmail || order.user?.email || "E-posta Belirtilmemiş"}
                           </p>
                        </div>
                      </div>
                    </td>

                    {/* Tarih */}
                    <td className="px-5 py-4">
                      <p className="text-[12px] text-zinc-600">
                        {new Date(order.createdAt).toLocaleDateString("tr-TR", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </p>
                      <p className="text-[10.5px] text-zinc-400">
                        {new Date(order.createdAt).toLocaleTimeString("tr-TR", {
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </td>

                    {/* Ürün sayısı */}
                    <td className="px-5 py-4 text-[12px] text-zinc-500">
                      {order.itemCount != null ? `${order.itemCount} ürün` : "—"}
                    </td>

                    {/* Tutar */}
                    <td className="px-5 py-4">
                      <span className="text-[13px] font-semibold text-zinc-800">
                        ₺{order.grandTotal.toLocaleString("tr-TR")}
                      </span>
                    </td>

                    {/* Ödeme */}
                    <td className="px-5 py-4">
                      <PaymentBadge status={order.paymentStatus} />
                    </td>

                    {/* Durum */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={order.status} />
                        {order.status === "PENDING" && (
                          <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                        )}
                      </div>
                    </td>

                    {/* İşlem */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/orders/${order.orderNo}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg
                                     border border-zinc-100 bg-white text-zinc-400 shadow-sm
                                     transition-all hover:border-[#4f6f52] hover:text-[#4f6f52]"
                        >
                          <FaEye className="h-3 w-3" />
                        </Link>
                        <button
                          type="button"
                          title="Kalıcı sil"
                          disabled={deletingOrderNo === order.orderNo}
                          onClick={() => void handleDeleteOrderRow(order.orderNo, order.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-100
                                     bg-white text-zinc-300 shadow-sm transition-all hover:border-red-200 hover:text-red-600
                                     disabled:opacity-40"
                        >
                          {deletingOrderNo === order.orderNo ? (
                            <span className="h-3 w-3 animate-spin rounded-full border border-zinc-200 border-t-red-500" />
                          ) : (
                            <FaTrash className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* ── PAGİNASYON ─────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/40 px-5 py-3.5">
            <span className="text-[11.5px] text-zinc-400">
              Sayfa <span className="font-medium text-zinc-600">{page}</span> / {totalPages}
              {totalCount > 0 && (
                <span className="ml-2 text-zinc-300">· {totalCount.toLocaleString("tr-TR")} kayıt</span>
              )}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white
                           text-zinc-400 transition-all hover:border-zinc-300 hover:text-zinc-700
                           disabled:cursor-not-allowed disabled:opacity-30"
              >
                <FaChevronLeft className="h-2.5 w-2.5" />
              </button>

              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-[12px] transition-all
                      ${page === p
                        ? "bg-[#4f6f52] text-white font-medium"
                        : "border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300"}`}
                  >
                    {p}
                  </button>
                )
              })}

              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white
                           text-zinc-400 transition-all hover:border-zinc-300 hover:text-zinc-700
                           disabled:cursor-not-allowed disabled:opacity-30"
              >
                <FaChevronRight className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── TOPLU İŞLEMLER ───────────────────────────────────── */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-6 rounded-2xl bg-zinc-900 px-6 py-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 border-r border-white/10 pr-6">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4f6f52] text-[11px] font-bold text-white">
                  {selectedIds.length}
                </span>
                <span className="text-[12.5px] font-medium text-white">Sipariş Seçildi</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={isBulkLoading}
                  onClick={() => handleBulkAction("status_update", "PROCESSING")}
                  className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-[11.5px] font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                >
                  <FaBoxOpen className="h-3 w-3 text-zinc-400" />
                  Hazırlanıyor Yap
                </button>
                <button
                  disabled={isBulkLoading}
                  onClick={() => handleBulkAction("status_update", "SHIPPED")}
                  className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-[11.5px] font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                >
                  <FaShippingFast className="h-3 w-3 text-zinc-400" />
                  Kargoya Ver
                </button>
                <button
                  disabled={isBulkLoading}
                  onClick={() => handleBulkAction("status_update", "DELIVERED")}
                  className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-[11.5px] font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                >
                  <FaCheck className="h-3 w-3 text-[#4f6f52]" />
                  Teslim Edildi Yap
                </button>
                <button
                  disabled={isBulkLoading}
                  onClick={() => handleBulkAction("payment_update", "PAID")}
                  className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-[11.5px] font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                >
                  <FaPay className="h-3 w-3 text-zinc-400" />
                  Ödendi İşaretle
                </button>
                <button
                  disabled={isBulkLoading}
                  onClick={() => handleBulkAction("status_update", "CANCELLED")}
                  className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-1.5 text-[11.5px] font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  <FaTrash className="h-3 w-3" />
                  İptal Et
                </button>
              </div>

              <button
                onClick={() => setSelectedIds([])}
                className="ml-4 text-[11.5px] text-zinc-500 transition hover:text-white"
              >
                Vazgeç
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}