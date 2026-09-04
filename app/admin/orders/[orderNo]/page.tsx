"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import {
   FaChevronLeft,
   FaMapMarkerAlt,
   FaCreditCard,
   FaTruck,
   FaCheckCircle,
   FaBox,
   FaFileAlt,
   FaClock,
   FaTimesCircle,
   FaUndo,
   FaCopy,
   FaPrint,
   FaTrash,
} from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import Image from "next/image"

// ── Durum meta verisi ─────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; bg: string; color: string; dot: string }> = {
   PENDING: { label: "Bekliyor", bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
   PAID: { label: "Ödendi", bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
   PROCESSING: { label: "Hazırlanıyor", bg: "#f3e8ff", color: "#6b21a8", dot: "#a855f7" },
   SHIPPED: { label: "Kargoda", bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
   DELIVERED: { label: "Teslim Edildi", bg: "#d1fae5", color: "#065f46", dot: "#813d50" },
   CANCELLED: { label: "İptal", bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" },
   REFUNDED: { label: "İade Edildi", bg: "#fee2e2", color: "#b91c1c", dot: "#ef4444" },
}

// Sipariş akışındaki adımlar (sıralı)
const ORDER_TIMELINE = [
   { key: "PENDING", label: "Sipariş Alındı", icon: <FaClock /> },
   { key: "PAID", label: "Ödeme Onaylandı", icon: <FaCreditCard /> },
   { key: "PROCESSING", label: "Hazırlanıyor", icon: <FaBox /> },
   { key: "SHIPPED", label: "Kargoya Verildi", icon: <FaTruck /> },
   { key: "DELIVERED", label: "Teslim Edildi", icon: <FaCheckCircle /> },
]

const TERMINAL_STATUSES = ["CANCELLED", "REFUNDED"]

function StatusBadge({ status }: { status: string }) {
   const m = STATUS_META[status] ?? { label: status, bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" }
   return (
      <span
         className="inline-flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-[11px] font-medium"
         style={{ background: m.bg, color: m.color }}
      >
         <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.dot }} />
         {m.label}
      </span>
   )
}

// ── Sipariş zaman çizelgesi bileşeni ─────────────────────────────────────────
function OrderTimeline({ currentStatus }: { currentStatus: string }) {
   const isTerminal = TERMINAL_STATUSES.includes(currentStatus)
   const currentIdx = ORDER_TIMELINE.findIndex(s => s.key === currentStatus)

   if (isTerminal) {
      const m = STATUS_META[currentStatus]
      return (
         <div
            className="flex items-center gap-3 rounded-lg px-4 py-3"
            style={{ background: m.bg }}
         >
            <FaTimesCircle style={{ color: m.dot }} className="h-4 w-4 shrink-0" />
            <div>
               <p className="text-[12.5px] font-medium" style={{ color: m.color }}>
                  Bu sipariş {m.label.toLowerCase()}
               </p>
               <p className="text-[11px]" style={{ color: m.color, opacity: 0.7 }}>
                  Aşağıdan durumu güncelleyebilirsiniz.
               </p>
            </div>
         </div>
      )
   }

   return (
      <div className="flex items-center gap-0">
         {ORDER_TIMELINE.map((step, i) => {
            const isDone = i <= currentIdx
            const isCurrent = i === currentIdx
            const isLast = i === ORDER_TIMELINE.length - 1

            return (
               <div key={step.key} className="flex flex-1 items-center last:flex-none">
                  {/* Adım çevresi */}
                  <div className="flex flex-col items-center gap-1.5">
                     <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] transition-all
                  ${isDone
                              ? isCurrent
                                 ? "bg-[#813d50] text-white ring-4 ring-[#813d50]/15"
                                 : "bg-[#d1fae5] text-[#813d50]"
                              : "bg-zinc-100 text-zinc-300"}`}
                     >
                        {step.icon}
                     </div>
                     <span
                        className={`whitespace-nowrap text-[10px] font-medium
                  ${isDone ? (isCurrent ? "text-[#813d50]" : "text-zinc-500") : "text-zinc-300"}`}
                     >
                        {step.label}
                     </span>
                  </div>

                  {/* Bağlantı çizgisi */}
                  {!isLast && (
                     <div className={`mb-5 h-px flex-1 mx-2 ${i < currentIdx ? "bg-[#813d50]/30" : "bg-zinc-100"}`} />
                  )}
               </div>
            )
         })}
      </div>
   )
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────
export default function AdminOrderDetail({
   params,
}: {
   params: Promise<{ orderNo: string }>
}) {
   const { orderNo } = use(params)
   const router = useRouter()
   const [order, setOrder] = useState<any>(null)
   const [loading, setLoading] = useState(true)
   const [updating, setUpdating] = useState(false)
   const [deleting, setDeleting] = useState(false)
   const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
   const [copied, setCopied] = useState(false)

   useEffect(() => { fetchOrder() }, [orderNo])

   const fetchOrder = async () => {
      try {
         const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderNo)}`)
         const raw = await res.text()
         const data = raw ? JSON.parse(raw) : {}
         if (res.ok) {
            setOrder(data)
         } else {
            setOrder({ message: data?.message ?? "Sipariş alınamadı." })
         }
      } catch (err) {
         console.error(err)
         setOrder({ message: "Sipariş alınırken bir hata oluştu." })
      } finally {
         setLoading(false)
      }
   }

   const handleUpdateStatus = async (newStatus: string) => {
      // Destructive actions confirmation
      if (newStatus === "CANCELLED") {
         if (!window.confirm("Bu siparişi iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return
      }
      if (newStatus === "REFUNDED") {
         if (!window.confirm("Bu sipariş için iade işlemi başlatmak istediğinize emin misiniz?")) return
      }

      setUpdating(true)
      setToast(null)
      try {
         const res = await fetch(`/api/admin/orders/${orderNo}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
         })
         const data = await res.json()
         if (res.ok) {
            setToast({ msg: "Sipariş durumu güncellendi.", ok: true })
            await fetchOrder()
         } else {
            setToast({ msg: data.message ?? "Bir hata oluştu.", ok: false })
         }
      } catch {
         setToast({ msg: "Bağlantı hatası.", ok: false })
      } finally {
         setUpdating(false)
         setTimeout(() => setToast(null), 4000)
      }
   }

   const copyOrderNo = () => {
      navigator.clipboard.writeText(`#${orderNo}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
   }

   const handleDeleteOrderPermanently = async () => {
      if (
         !window.confirm(
            `Sipariş #${orderNo} veritabanından kalıcı olarak silinecek.\n\nTüm satırlar, ödemeler ve kargo kaydı silinir. Siparişin tam bir özeti işlem günlüğüne (metadata) yazılır.\n\nBu işlem geri alınamaz. Devam edilsin mi?`
         )
      ) {
         return
      }
      setDeleting(true)
      setToast(null)
      try {
         const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderNo)}`, {
            method: "DELETE",
         })
         const data = await res.json().catch(() => ({}))
         if (res.ok) {
            setToast({ msg: typeof data.message === "string" ? data.message : "Sipariş silindi.", ok: true })
            setTimeout(() => router.push("/admin/orders"), 1200)
         } else {
            setToast({ msg: typeof data.message === "string" ? data.message : "Silinemedi.", ok: false })
            setDeleting(false)
         }
      } catch {
         setToast({ msg: "Bağlantı hatası.", ok: false })
         setDeleting(false)
      } finally {
         setTimeout(() => setToast(null), 5000)
      }
   }

   const getPaymentMethod = (method: string) => {
      const m = method?.toUpperCase()
      if (m === "CREDIT_CARD" || m === "CARD") return "Kredi Kartı"
      if (m === "CASH") return "Nakit"
      if (m === "TRANSFER" || m === "BANK_TRANSFER") return "Havale / EFT"
      if (m === "CASH_ON_DELIVERY") return "Kapıda Ödeme"
      if (m === "MARKETPLACE") return "Trendyol"
      return method || "Bilinmiyor"
   }

   if (loading) return (
      <div className="flex h-[600px] items-center justify-center">
         <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-[#813d50]" />
            <p className="text-[11px] text-zinc-400">Yükleniyor...</p>
         </div>
      </div>
   )

   if (!order || order.message) return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4">
         <p className="text-[13px] text-zinc-400">Sipariş bulunamadı.</p>
         <Link href="/admin/orders" className="text-[12px] text-[#813d50] hover:underline">
            ← Siparişlere dön
         </Link>
      </div>
   )

   const subtotal = Number(order.subtotal ?? 0)
   const shippingCost = Number(order.shippingCost ?? 0)
   const discountTotal = Number(order.discountTotal ?? 0)
   const grandTotal = Number(order.grandTotal ?? 0)

   return (
      <div className="space-y-5 pb-10">
         <style jsx global>{`
            @media print {
               header, aside, .no-print, button, select, .dangerous-actions, .mobile-nav {
                  display: none !important;
               }
               main, .admin-content {
                  padding: 0 !important;
                  margin: 0 !important;
                  background: white !important;
               }
               .print-container {
                  display: block !important;
                  width: 100% !important;
               }
               .rounded-xl, .border {
                  border-radius: 0 !important;
                  border: 1px solid #eee !important;
                  box-shadow: none !important;
               }
            }
         `}</style>

         <AnimatePresence>
            {toast && (
               <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className={`fixed right-6 top-6 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 shadow-lg text-[12.5px] font-medium
              ${toast.ok ? "bg-[#d1fae5] text-[#065f46]" : "bg-red-50 text-red-700"}`}
               >
                  {toast.ok ? <FaCheckCircle className="h-3.5 w-3.5" /> : <FaTimesCircle className="h-3.5 w-3.5" />}
                  {toast.msg}
               </motion.div>
            )}
         </AnimatePresence>

         <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between no-print">
            <div className="flex items-center gap-4">
               <Link
                  href="/admin/orders"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-400 shadow-sm transition hover:text-zinc-700"
               >
                  <FaChevronLeft className="h-3 w-3" />
               </Link>
               <div>
                  <div className="flex items-center gap-2">
                     <h1 className="text-[17px] font-medium text-zinc-800">Sipariş #{order.orderNo}</h1>
                     <button onClick={copyOrderNo} className="text-zinc-300 transition hover:text-zinc-500">
                        <FaCopy className="h-3 w-3" />
                     </button>
                     {copied && <span className="text-[10.5px] text-[#813d50]">Kopyalandı!</span>}
                  </div>
                  <p className="text-[12px] text-zinc-400">
                     {new Date(order.createdAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
               </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
               <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-[12px] text-zinc-500 shadow-sm transition hover:bg-zinc-50"
               >
                  <FaPrint className="h-3 w-3" /> Yazdır
               </button>
               <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm">
                  <span className="text-[11px] text-zinc-400">Durum:</span>
                  <select
                     value={order.status}
                     disabled={updating}
                     onChange={e => handleUpdateStatus(e.target.value)}
                     className="text-[12px] font-medium text-zinc-700 outline-none bg-transparent cursor-pointer disabled:opacity-50"
                  >
                     <option value="PENDING">Bekliyor</option>
                     <option value="PAID">Ödendi</option>
                     <option value="PROCESSING">Hazırlanıyor</option>
                     <option value="SHIPPED">Kargoya Verildi</option>
                     <option value="DELIVERED">Teslim Edildi</option>
                     <option value="CANCELLED">İptal</option>
                     <option value="REFUNDED">İade Edildi</option>
                  </select>
                  {updating && <div className="h-3.5 w-3.5 animate-spin rounded-full border border-zinc-200 border-t-[#813d50]" />}
               </div>
            </div>
         </div>

         <div className="print-container">
            <div className="rounded-xl border border-zinc-100 bg-white p-5 no-print">
               <p className="mb-5 text-[12px] font-medium text-zinc-500">Sipariş Durumu</p>
               <OrderTimeline currentStatus={order.status} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px] mt-4">
               <div className="space-y-4">
                  <div className="rounded-xl border border-zinc-100 bg-white p-5">
                     <div className="mb-4 flex items-center justify-between">
                        <p className="text-[13px] font-medium text-zinc-800">Sipariş İçeriği</p>
                        <span className="text-[11.5px] text-zinc-400">{order.items?.length} ürün</span>
                     </div>
                     <div className="divide-y divide-zinc-50">
                        {order.items?.map((item: any) => (
                           <div key={item.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50 no-print">
                                 <Image src={item.product?.images?.[0]?.url ?? "/logo.jpeg"} alt={item.name} fill className="object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="truncate text-[13px] font-medium text-zinc-800">{item.name}</p>
                                 <div className="mt-1 flex items-center gap-2">
                                    <span className="text-[11.5px] text-zinc-500">{item.quantity} adet × ₺{Number(item.unitPrice).toLocaleString("tr-TR")}</span>
                                 </div>
                              </div>
                              <div className="text-right shrink-0">
                                 <p className="text-[13.5px] font-semibold text-zinc-800">₺{Number(item.lineTotal).toLocaleString("tr-TR")}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                     <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
                        <div className="flex justify-between text-[12px] text-zinc-500"><span>Ara Toplam</span><span>₺{subtotal.toLocaleString("tr-TR")}</span></div>
                        <div className="flex justify-between text-[12px] text-zinc-500"><span>Kargo</span><span className={shippingCost === 0 ? "text-[#813d50] font-medium" : ""}>{shippingCost === 0 ? "Ücretsiz" : `₺${shippingCost.toLocaleString("tr-TR")}`}</span></div>
                        {discountTotal > 0 && <div className="flex justify-between text-[12px] text-red-500"><span>İndirim</span><span>−₺{discountTotal.toLocaleString("tr-TR")}</span></div>}
                        <div className="flex justify-between border-t border-zinc-100 pt-3 text-[14px] font-semibold text-zinc-800"><span>Genel Toplam</span><span>₺{grandTotal.toLocaleString("tr-TR")}</span></div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                     <div className="rounded-xl border border-zinc-100 bg-white p-5">
                        <div className="mb-4 flex items-center gap-2 text-zinc-400"><FaMapMarkerAlt className="h-3.5 w-3.5 text-[#813d50]" /><p className="text-[12px] font-medium text-zinc-600">Teslimat Adresi</p></div>
                        <p className="text-[13px] font-medium text-zinc-800">{order.shippingFullName}</p>
                        <p className="mb-3 text-[11.5px] text-zinc-400">{order.shippingPhone}</p>
                        <div className="space-y-0.5 text-[12px] leading-relaxed text-zinc-500">
                           <p>{order.shippingLine1}</p>
                           {order.shippingLine2 && <p>{order.shippingLine2}</p>}
                           <p>{order.shippingDistrict} / {order.shippingCity}</p>
                           <p>{order.shippingPostalCode} {order.shippingCountry}</p>
                        </div>
                     </div>
                     <div className="rounded-xl border border-zinc-100 bg-white p-5">
                        <div className="mb-4 flex items-center gap-2"><FaFileAlt className="h-3.5 w-3.5 text-[#813d50]" /><p className="text-[12px] font-medium text-zinc-600">Sipariş Notu</p></div>
                        {order.note ? <p className="text-[12.5px] italic leading-relaxed text-zinc-600">"{order.note}"</p> : <p className="text-[12px] text-zinc-300">Müşteri not bırakmamış.</p>}
                     </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="rounded-xl border border-zinc-100 bg-white p-5">
                     <div className="mb-4 flex items-center gap-2"><FaCreditCard className="h-3.5 w-3.5 text-[#813d50]" /><p className="text-[12px] font-medium text-zinc-600">Müşteri & Ödeme</p></div>
                     <div className="space-y-4">
                        <div><p className="mb-0.5 text-[10.5px] text-zinc-400">Müşteri</p><p className="text-[12.5px] font-medium text-zinc-800">{order.shippingFullName}</p><p className="text-[11.5px] text-zinc-400">{order.guestEmail ?? order.user?.email ?? "—"}</p></div>
                        <div className="h-px bg-zinc-100" />
                        <div className="grid grid-cols-2 gap-4">
                           <div><p className="mb-1 text-[10.5px] text-zinc-400">Ödeme Durumu</p><span className={`text-[12px] font-medium ${order.paymentStatus === "PAID" ? "text-[#813d50]" : "text-amber-600"}`}>{order.paymentStatus === "PAID" ? "Ödendi" : "Bekliyor"}</span></div>
                           <div><p className="mb-1 text-[10.5px] text-zinc-400">Ödeme Yöntemi</p><p className="text-[12px] font-medium text-zinc-700">{getPaymentMethod(order.payments?.[0]?.method)}</p></div>
                        </div>
                     </div>
                  </div>

                  <div className="rounded-xl bg-zinc-900 p-5 text-white no-print">
                     <p className="mb-4 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Finansal Özet</p>
                     <div className="space-y-2.5">
                        <div className="flex justify-between text-[12px]"><span className="text-zinc-400">Ara Toplam</span><span>₺{subtotal.toLocaleString("tr-TR")}</span></div>
                        <div className="flex justify-between text-[12px]"><span className="text-zinc-400">Kargo</span><span className={shippingCost === 0 ? "text-[#86efac]" : ""}>{shippingCost === 0 ? "Ücretsiz" : `₺${shippingCost.toLocaleString("tr-TR")}`}</span></div>
                        {discountTotal > 0 && <div className="flex justify-between text-[12px] text-rose-400"><span>İndirim</span><span>−₺{discountTotal.toLocaleString("tr-TR")}</span></div>}
                     </div>
                     <div className="mt-4 flex items-baseline justify-between border-t border-white/10 pt-4"><span className="text-[11.5px] text-zinc-400">Toplam</span><span className="text-[26px] font-semibold tracking-tight text-[#86efac]">₺{grandTotal.toLocaleString("tr-TR")}</span></div>
                  </div>

                  {!TERMINAL_STATUSES.includes(order.status) && (
                     <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 no-print dangerous-actions">
                        <p className="mb-3 text-[11.5px] font-medium text-red-600">Tehlikeli Aksiyonlar</p>
                        <div className="flex flex-col gap-2">
                           <button disabled={updating} onClick={() => handleUpdateStatus("CANCELLED")} className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-[12px] text-red-600 transition hover:bg-red-50 disabled:opacity-50">
                              <FaTimesCircle className="h-3 w-3" /> Siparişi İptal Et
                           </button>
                           {order.paymentStatus === "PAID" && (
                              <button disabled={updating} onClick={() => handleUpdateStatus("REFUNDED")} className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-[12px] text-red-600 transition hover:bg-red-50 disabled:opacity-50">
                                 <FaUndo className="h-3 w-3" /> İade Başlat
                              </button>
                           )}
                        </div>
                     </div>
                  )}

                  <div className="rounded-xl border border-red-200 bg-white p-4 no-print dangerous-actions">
                     <p className="mb-1.5 text-[11.5px] font-semibold text-red-700">Kalıcı silme</p>
                     <p className="mb-3 text-[10.5px] leading-relaxed text-zinc-500">
                        Sipariş veritabanından tamamen kaldırılır (satırlar, ödemeler, kargo). Tüm sipariş detayları işlem günlüğüne kaydedilir; geri yükleme yoktur.
                     </p>
                     <button
                        type="button"
                        disabled={deleting || updating}
                        onClick={() => void handleDeleteOrderPermanently()}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-[12px] font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                     >
                        {deleting ? (
                           <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-200 border-t-red-700" />
                        ) : (
                           <FaTrash className="h-3 w-3" />
                        )}
                        Siparişi kalıcı olarak sil
                     </button>
                  </div>
               </div>
            </div>
         </div>
      </div>
   )
}
