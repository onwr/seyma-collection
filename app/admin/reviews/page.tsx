"use client"

import { useState, useEffect } from "react"
import { 
  FaSearch, 
  FaStar, 
  FaCheck, 
  FaTimes, 
  FaTrash, 
  FaFilter, 
  FaChevronLeft, 
  FaChevronRight, 
  FaUser, 
  FaShoppingBag, 
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaEdit
} from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

interface Review {
  id: number
  productId: number
  userId: number
  rating: number
  comment: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  createdAt: string
  product: {
    id: number
    name: string
    slug: string
    images: { url: string }[]
  }
  user: {
    id: number
    name: string
    email: string
  }
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [ratingFilter, setRatingFilter] = useState<string>("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const url = `/api/admin/reviews?page=${page}&q=${search}&status=${statusFilter}&rating=${ratingFilter}`
      const res = await fetch(url)
      const data = await res.json()
      setReviews(data.items || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (error) {
      console.error("Fetch reviews error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [page, search, statusFilter, ratingFilter])

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      })
      if (res.ok) {
        setToast({ msg: "Durum güncellendi.", ok: true })
        fetchReviews()
        setTimeout(() => setToast(null), 3000)
      }
    } catch (error) {
      setToast({ msg: "Hata oluştu.", ok: false })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Bu yorumu kalıcı olarak silmek istediğinize emin misiniz?")) return
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" })
      if (res.ok) {
        setToast({ msg: "Yorum silindi.", ok: true })
        fetchReviews()
        setTimeout(() => setToast(null), 3000)
      }
    } catch (error) {
      setToast({ msg: "Silme hatası.", ok: false })
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingReview) return
    try {
      const res = await fetch(`/api/admin/reviews/${editingReview.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: editingReview.comment, rating: editingReview.rating })
      })
      if (res.ok) {
        setToast({ msg: "Yorum güncellendi.", ok: true })
        setEditingReview(null)
        fetchReviews()
        setTimeout(() => setToast(null), 3000)
      }
    } catch (error) {
       setToast({ msg: "Güncelleme hatası.", ok: false })
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-[#fcfcfc]">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-8 right-8 z-[200] px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 border-l-4
              ${toast.ok ? 'bg-emerald-50 text-emerald-800 border-emerald-500' : 'bg-rose-50 text-rose-800 border-rose-500'}`}
          >
            {toast.ok ? <FaCheckCircle className="text-emerald-500" /> : <FaTimesCircle className="text-rose-500" />}
            <span className="text-sm font-bold">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-sm border border-amber-500/10">
              <FaStar />
            </div>
            Yorum Moderasyonu
          </h1>
          <p className="text-zinc-500 text-[13px] font-medium mt-1">Mağazanızdaki tüm ürün yorumlarını buradan denetleyin.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group w-full md:w-64">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Ürün veya yorumda ara..."
              className="w-full h-12 pl-11 pr-4 bg-white border border-zinc-200 rounded-2xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-12 px-4 bg-white border border-zinc-200 rounded-2xl outline-none focus:border-primary text-sm font-bold cursor-pointer"
          >
            <option value="">Tüm Durumlar</option>
            <option value="PENDING">Bekleyenler</option>
            <option value="APPROVED">Onaylananlar</option>
            <option value="REJECTED">Reddedilenler</option>
          </select>

          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="h-12 px-4 bg-white border border-zinc-200 rounded-2xl outline-none focus:border-primary text-sm font-bold cursor-pointer"
          >
            <option value="">Tüm Puanlar</option>
            {[5, 4, 3, 2, 1].map(n => (
              <option key={n} value={n}>{n} Yıldız</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 bg-white border border-zinc-100 rounded-[2rem] animate-pulse"></div>
          ))
        ) : reviews.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm">
            <div className="w-20 h-20 rounded-full bg-zinc-50 flex items-center justify-center border border-zinc-100">
              <FaStar className="text-3xl text-zinc-200" />
            </div>
            <p className="text-zinc-400 font-bold">Herhangi bir yorum bulunamadı.</p>
          </div>
        ) : (
          reviews.map((review) => (
            <motion.div
              layout
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="group bg-white border border-zinc-100 rounded-[2.5rem] p-6 hover:shadow-2xl hover:shadow-zinc-200/50 transition-all duration-500"
            >
              <div className="flex flex-col md:flex-row gap-6">
                {/* Sol: Ürün Bilgisi */}
                <div className="w-full md:w-48 shrink-0">
                  <div className="relative aspect-square rounded-3xl overflow-hidden bg-zinc-50 border border-zinc-100 mb-3 group-hover:scale-[1.02] transition-transform">
                    {review.product.images?.[0]?.url ? (
                      <Image
                        src={review.product.images[0].url}
                        alt={review.product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-200"><FaShoppingBag className="text-3xl" /></div>
                    )}
                  </div>
                  <p className="text-[12px] font-black text-zinc-800 line-clamp-1 text-center uppercase tracking-tighter">{review.product.name}</p>
                </div>

                {/* Orta: Yorum İçeriği */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        {review.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-zinc-900 leading-none">{review.user.name}</p>
                        <p className="text-[11px] text-zinc-400 mt-1">{review.user.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <FaStar key={star} className={`text-sm ${star <= review.rating ? 'text-amber-400' : 'text-zinc-100'}`} />
                        ))}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5
                        ${review.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 
                          review.status === 'REJECTED' ? 'bg-rose-50 text-rose-500' : 
                          'bg-amber-50 text-amber-600'}`}>
                        {review.status === 'APPROVED' ? <FaCheckCircle /> : review.status === 'REJECTED' ? <FaTimesCircle /> : <FaClock />}
                        {review.status === 'APPROVED' ? 'YAYINDA' : review.status === 'REJECTED' ? 'REDDEDİLDİ' : 'BEKLEMEDE'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-zinc-50/50 rounded-3xl p-5 border border-zinc-50 relative group/msg">
                    <p className="text-[14px] text-zinc-600 font-medium leading-relaxed italic">
                      "{review.comment}"
                    </p>
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-100">
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-bold">
                        <FaCalendarAlt className="text-[10px]" />
                        {new Date(review.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sağ: Aksiyonlar */}
                <div className="flex md:flex-col gap-2 justify-center shrink-0">
                  <button
                    onClick={() => handleStatusUpdate(review.id, 'APPROVED')}
                    className={`h-11 md:h-auto md:w-11 md:aspect-square flex items-center justify-center rounded-2xl transition-all shadow-sm flex-1 md:flex-none
                      ${review.status === 'APPROVED' ? 'bg-emerald-500 text-white shadow-emerald-200/50' : 'bg-white border border-zinc-100 text-zinc-300 hover:text-emerald-500 hover:border-emerald-200'}`}
                    title="Onayla"
                  >
                    <FaCheck className="text-sm" />
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(review.id, 'REJECTED')}
                    className={`h-11 md:h-auto md:w-11 md:aspect-square flex items-center justify-center rounded-2xl transition-all shadow-sm flex-1 md:flex-none
                      ${review.status === 'REJECTED' ? 'bg-rose-500 text-white shadow-rose-200/50' : 'bg-white border border-zinc-100 text-zinc-300 hover:text-rose-500 hover:border-rose-200'}`}
                    title="Reddet"
                  >
                    <FaTimes className="text-sm" />
                  </button>
                  <button
                    onClick={() => setEditingReview(review)}
                    className="h-11 md:h-auto md:w-11 md:aspect-square flex items-center justify-center rounded-2xl bg-white border border-zinc-100 text-zinc-300 hover:text-blue-500 hover:border-blue-200 transition-all shadow-sm flex-1 md:flex-none"
                    title="Düzenle"
                  >
                    <FaEdit className="text-sm" />
                  </button>
                  <button
                    onClick={() => handleDelete(review.id)}
                    className="h-11 md:h-auto md:w-11 md:aspect-square flex items-center justify-center rounded-2xl bg-white border border-zinc-100 text-zinc-300 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm flex-1 md:flex-none"
                    title="Sil"
                  >
                    <FaTrash className="text-sm" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="mt-10 flex items-center justify-between bg-white p-6 rounded-[2rem] border border-zinc-100">
          <span className="text-[13px] font-bold text-zinc-400 uppercase tracking-widest">Sayfa {page} / {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-zinc-50 border border-zinc-100 text-zinc-400 hover:text-primary disabled:opacity-30 transition-all"
            >
              <FaChevronLeft />
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-zinc-50 border border-zinc-100 text-zinc-400 hover:text-primary disabled:opacity-30 transition-all"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingReview && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingReview(null)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleEdit} className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-zinc-900">Yorumu Düzenle</h2>
                  <button type="button" onClick={() => setEditingReview(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-50 text-zinc-400 hover:text-rose-500">
                    <FaTimes />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest px-1 block mb-2">Puan</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setEditingReview({ ...editingReview, rating: n })}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border
                            ${editingReview.rating >= n ? 'bg-amber-500 text-white border-amber-500' : 'bg-zinc-50 text-zinc-300 border-zinc-100'}`}
                        >
                          <FaStar className="text-sm" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest px-1 block mb-2">Yorum İçeriği</label>
                    <textarea
                      rows={4}
                      required
                      className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all text-sm font-medium resize-none"
                      value={editingReview.comment}
                      onChange={(e) => setEditingReview({ ...editingReview, comment: e.target.value })}
                    />
                  </div>
                </div>

                <div className="mt-10 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingReview(null)}
                    className="flex-1 h-14 rounded-2xl border border-zinc-200 text-zinc-500 font-bold hover:bg-zinc-50 transition-all"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="flex-2 h-14 rounded-2xl bg-zinc-900 text-white font-black hover:bg-primary transition-all shadow-xl shadow-zinc-900/10"
                  >
                    Kaydet
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
