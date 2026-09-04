"use client"

import { useState, useEffect } from "react"
import { 
  FaPlus, 
  FaSearch, 
  FaTicketAlt, 
  FaTrash, 
  FaEdit, 
  FaCalendarAlt, 
  FaPercentage, 
  FaLiraSign, 
  FaInfoCircle, 
  FaTimes, 
  FaCheckCircle, 
  FaExclamationTriangle,
  FaChevronLeft,
  FaChevronRight,
  FaHistory
} from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"

interface Coupon {
  id: number
  code: string
  description: string | null
  type: "PERCENTAGE" | "FIXED"
  value: string
  minPurchase: string | null
  maxDiscount: string | null
  startDate: string | null
  endDate: string | null
  usageLimit: number | null
  usageCount: number
  isActive: boolean
  createdAt: string
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<Partial<Coupon>>({
    code: "",
    description: "",
    type: "PERCENTAGE",
    value: "0",
    minPurchase: "",
    maxDiscount: "",
    startDate: "",
    endDate: "",
    usageLimit: null,
    isActive: true
  })
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const fetchCoupons = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/coupons?q=${search}`)
      const data = await res.json()
      setCoupons(data.items || [])
    } catch (error) {
      console.error("Fetch coupons error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoupons()
  }, [search])

  const openModal = (coupon?: Coupon) => {
    if (coupon) {
      setEditingId(coupon.id)
      setForm({
        ...coupon,
        startDate: coupon.startDate ? coupon.startDate.split('T')[0] : "",
        endDate: coupon.endDate ? coupon.endDate.split('T')[0] : ""
      })
    } else {
      setEditingId(null)
      setForm({
        code: "",
        description: "",
        type: "PERCENTAGE",
        value: "0",
        minPurchase: "",
        maxDiscount: "",
        startDate: "",
        endDate: "",
        usageLimit: null,
        isActive: true
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const method = editingId ? "PUT" : "POST"
    const url = editingId ? `/api/admin/coupons/${editingId}` : "/api/admin/coupons"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      })
      const data = await res.json()

      if (res.ok) {
        setToast({ msg: editingId ? "Kupon güncellendi." : "Kupon oluşturuldu.", ok: true })
        setIsModalOpen(false)
        fetchCoupons()
        setTimeout(() => setToast(null), 3000)
      } else {
        setToast({ msg: data.message || "Hata oluştu.", ok: false })
      }
    } catch (error) {
      setToast({ msg: "Bağlantı hatası.", ok: false })
    }
  }

  const deleteCoupon = async (id: number) => {
    if (!confirm("Bu kuponu silmek istediğinize emin misiniz?")) return
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" })
      if (res.ok) {
        setToast({ msg: "Kupon silindi.", ok: true })
        fetchCoupons()
        setTimeout(() => setToast(null), 3000)
      }
    } catch (error) {
      setToast({ msg: "Silme sırasında hata oluştu.", ok: false })
    }
  }

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let result = "SEYMA-"
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setForm({ ...form, code: result })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-[#fcfcfc]">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-8 right-8 z-[200] px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 border-l-4
              ${toast.ok ? 'bg-emerald-50 text-emerald-800 border-emerald-500' : 'bg-rose-50 text-rose-800 border-rose-500'}`}
          >
            {toast.ok ? <FaCheckCircle className="text-emerald-500" /> : <FaExclamationTriangle className="text-rose-500" />}
            <span className="text-sm font-bold">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/10">
              <FaTicketAlt />
            </div>
            Kupon Yönetimi
          </h1>
          <p className="text-zinc-500 text-[13px] font-medium mt-1">Aktif promosyonları ve indirim kodlarını buradan yönetebilirsiniz.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group flex-1 md:w-64">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Kupon ara..."
              className="w-full h-12 pl-11 pr-4 bg-white border border-zinc-200 rounded-2xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => openModal()}
            className="h-12 px-6 rounded-2xl bg-zinc-900 text-white flex items-center gap-2 font-bold text-sm shadow-xl shadow-zinc-900/10 hover:bg-primary transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <FaPlus className="text-xs" /> YENİ KUPON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-white border border-zinc-100 rounded-[2rem] animate-pulse"></div>
          ))
        ) : coupons.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-full bg-zinc-50 flex items-center justify-center border border-zinc-100">
              <FaTicketAlt className="text-3xl text-zinc-200" />
            </div>
            <p className="text-zinc-400 font-bold">Henüz hiç kupon oluşturmadınız.</p>
          </div>
        ) : (
          coupons.map((coupon) => {
            const isExpired = coupon.endDate && new Date(coupon.endDate) < new Date()
            const isUsedUp = coupon.usageLimit && coupon.usageCount >= coupon.usageLimit
            const isInactive = !coupon.isActive

            return (
              <motion.div
                layout
                key={coupon.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`relative bg-white border rounded-[2rem] p-6 transition-all duration-500 overflow-hidden group
                  ${isInactive || isExpired || isUsedUp ? 'border-zinc-100 grayscale-[0.5]' : 'border-zinc-100 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 shadow-xl shadow-zinc-200/30'}`}
              >
                {/* Status Badge */}
                <div className="absolute top-6 right-6 flex flex-col items-end gap-2">
                  <div className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5
                    ${isInactive ? 'bg-zinc-100 text-zinc-500' : isExpired ? 'bg-rose-50 text-rose-500' : isUsedUp ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${isInactive ? 'bg-zinc-400' : isExpired ? 'bg-rose-500' : isUsedUp ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
                    {isInactive ? 'Pasif' : isExpired ? 'Süresi Doldu' : isUsedUp ? 'Tükendi' : 'Aktif'}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-2xl font-black text-zinc-900 tracking-tighter group-hover:text-primary transition-colors">{coupon.code}</h3>
                  <p className="text-[12px] text-zinc-400 font-medium mt-1 line-clamp-1">{coupon.description || 'Açıklama belirtilmedi.'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">İndirim</p>
                    <div className="flex items-center gap-1.5 font-black text-zinc-800">
                      {coupon.type === "PERCENTAGE" ? <FaPercentage className="text-xs text-primary" /> : <span className="text-primary">₺</span>}
                      <span className="text-xl">{Number(coupon.value).toLocaleString('tr-TR')}</span>
                    </div>
                  </div>
                  <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Kullanım</p>
                    <div className="flex items-center gap-2 font-black text-zinc-800">
                      <FaHistory className="text-xs text-primary" />
                      <span className="text-xl">{coupon.usageCount}</span>
                      {coupon.usageLimit && <span className="text-zinc-300 font-medium text-sm">/ {coupon.usageLimit}</span>}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-8">
                  {coupon.minPurchase && (
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-zinc-400">Min. Sepet Tutarı</span>
                      <span className="text-zinc-700">₺{Number(coupon.minPurchase).toLocaleString('tr-TR')}</span>
                    </div>
                  )}
                  {coupon.endDate && (
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-zinc-400">Son Kullanma</span>
                      <span className={`flex items-center gap-1.5 ${isExpired ? 'text-rose-500' : 'text-zinc-700'}`}>
                        <FaCalendarAlt className="text-[10px]" />
                        {new Date(coupon.endDate).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                  <button
                    onClick={() => openModal(coupon)}
                    className="flex-1 h-10 rounded-xl bg-zinc-100 text-zinc-600 font-bold text-[12px] flex items-center justify-center gap-2 hover:bg-zinc-200"
                  >
                    <FaEdit /> Düzenle
                  </button>
                  <button
                    onClick={() => deleteCoupon(coupon.id)}
                    className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                  >
                    <FaTrash />
                  </button>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Coupon Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleSubmit} className="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-zinc-900">{editingId ? 'Kuponu Düzenle' : 'Yeni Kupon Oluştur'}</h2>
                    <p className="text-zinc-400 text-[13px] font-medium mt-1">Gerekli bilgileri girerek indirim stratejinizi oluşturun.</p>
                  </div>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-50 text-zinc-400 hover:text-rose-500">
                    <FaTimes />
                  </button>
                </div>

                <div className="space-y-8">
                  {/* Temel Bilgiler */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest px-1">Kupon Kodu</label>
                      <div className="relative group">
                        <input
                          required
                          type="text"
                          className="w-full h-12 pl-4 pr-12 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all text-sm font-black tracking-widest uppercase"
                          value={form.code}
                          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                        />
                        {!editingId && (
                          <button
                            type="button"
                            onClick={generateCode}
                            title="Kod Üret"
                            className="absolute right-2 top-2 w-8 h-8 rounded-lg bg-white border border-zinc-200 text-zinc-400 hover:text-primary transition-all flex items-center justify-center"
                          >
                            <FaHistory className="text-xs" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest px-1">Kupon Tipi</label>
                      <div className="flex gap-2 h-12">
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, type: 'PERCENTAGE' })}
                          className={`flex-1 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all
                            ${form.type === 'PERCENTAGE' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-50 text-zinc-400 border-zinc-200 hover:border-zinc-300'}`}
                        >
                          <FaPercentage /> Yüzde (%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, type: 'FIXED' })}
                          className={`flex-1 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all
                            ${form.type === 'FIXED' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-50 text-zinc-400 border-zinc-200 hover:border-zinc-300'}`}
                        >
                          <FaLiraSign /> Sabit (₺)
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest px-1">Değer</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 font-bold">{form.type === 'PERCENTAGE' ? '%' : '₺'}</span>
                        <input
                          required
                          type="number"
                          className="w-full h-12 pl-10 pr-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all text-sm font-black"
                          value={form.value}
                          onChange={(e) => setForm({ ...form, value: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest px-1">Min. Sepet</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 font-bold">₺</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          className="w-full h-12 pl-10 pr-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all text-sm font-black"
                          value={form.minPurchase || ""}
                          onChange={(e) => setForm({ ...form, minPurchase: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest px-1">Maks. İndirim</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 font-bold">₺</span>
                        <input
                          disabled={form.type === 'FIXED'}
                          type="number"
                          placeholder={form.type === 'FIXED' ? "Sınırsız" : "Limit yok"}
                          className="w-full h-12 pl-10 pr-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all text-sm font-black disabled:opacity-50"
                          value={form.maxDiscount || ""}
                          onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest px-1">Kısa Açıklama</label>
                    <textarea
                      rows={2}
                      className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all text-sm font-medium resize-none"
                      placeholder="Bu kupon ne için kullanılıyor?"
                      value={form.description || ""}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>

                  {/* Kısıtlamalar */}
                  <div className="bg-zinc-50/50 rounded-3xl p-6 border border-zinc-100 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <FaInfoCircle className="text-primary text-xs" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Geçerlilik ve Kısıtlamalar</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-zinc-500">Başlangıç Tarihi</label>
                        <input
                          type="date"
                          className="w-full h-11 px-4 bg-white border border-zinc-200 rounded-xl outline-none focus:border-primary text-sm font-medium"
                          value={form.startDate || ""}
                          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-zinc-500">Bitiş Tarihi</label>
                        <input
                          type="date"
                          className="w-full h-11 px-4 bg-white border border-zinc-200 rounded-xl outline-none focus:border-primary text-sm font-medium"
                          value={form.endDate || ""}
                          onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-zinc-500">Kullanım Limiti (Toplam)</label>
                        <input
                          type="number"
                          placeholder="Limitsiz"
                          className="w-full h-11 px-4 bg-white border border-zinc-200 rounded-xl outline-none focus:border-primary text-sm font-medium"
                          value={form.usageLimit || ""}
                          onChange={(e) => setForm({ ...form, usageLimit: e.target.value ? parseInt(e.target.value) : null })}
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <label className="flex items-center gap-3 cursor-pointer group h-11">
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={form.isActive}
                            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                          />
                          <div className={`w-10 h-5 rounded-full relative transition-all duration-300 ${form.isActive ? 'bg-emerald-500' : 'bg-zinc-300'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${form.isActive ? 'left-6' : 'left-1'}`}></div>
                          </div>
                          <span className="text-[12px] font-bold text-zinc-600">Kupon Kullanıma Açık</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 h-14 rounded-2xl border border-zinc-200 text-zinc-500 font-bold hover:bg-zinc-50 transition-all"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="flex-2 h-14 rounded-2xl bg-zinc-900 text-white font-black hover:bg-primary transition-all shadow-xl shadow-zinc-900/10"
                  >
                    {editingId ? 'Kuponu Güncelle' : 'Kuponu Oluştur'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e4e4e7; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d4d4d8; }
      `}</style>
    </div>
  )
}
