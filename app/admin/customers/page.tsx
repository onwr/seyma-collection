"use client"

import { useState, useEffect } from "react"
import { 
  FaSearch, 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaCalendarAlt, 
  FaShoppingCart, 
  FaWallet, 
  FaEllipsisV,
  FaCheckCircle,
  FaTimesCircle,
  FaShieldAlt,
  FaMapMarkerAlt,
  FaChevronLeft,
  FaChevronRight,
  FaEdit,
  FaTrash
} from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"

interface Customer {
  id: number
  name: string
  email: string
  phone: string | null
  role: string
  isActive: boolean
  createdAt: string
  totalSpent: number
  orderCount: number
}

interface CustomerDetail extends Customer {
  addresses: any[]
  orders: any[]
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<CustomerDetail | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState<any>(null)

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/customers?page=${page}&q=${search}`)
      const data = await res.json()
      setCustomers(data.items || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (error) {
      console.error("Fetch customers error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [page, search])

  const fetchDetail = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/customers/${id}`)
      const data = await res.json()
      setDetail(data)
      setIsModalOpen(true)
    } catch (error) {
      console.error("Fetch detail error:", error)
    }
  }

  const handleEdit = (customer: Customer) => {
    setEditForm({ ...customer })
    setIsEditModalOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch(`/api/admin/customers/${editForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      })
      if (res.ok) {
        setIsEditModalOpen(false)
        fetchCustomers()
      }
    } catch (error) {
      console.error("Update customer error:", error)
    }
  }

  const toggleStatus = async (customer: Customer) => {
    if (!confirm(`Bu kullanıcıyı ${customer.isActive ? 'pasifleştirmek' : 'aktifleştirmek'} istediğinize emin misiniz?`)) return
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...customer, isActive: !customer.isActive })
      })
      if (res.ok) fetchCustomers()
    } catch (error) {
       console.error("Toggle status error:", error)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-zinc-50/50">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Müşteri Yönetimi</h1>
          <p className="text-zinc-500 text-sm mt-1">Toplam {total} kayıt bulundu</p>
        </div>

        <div className="relative group w-full md:w-96">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="İsim, e-posta veya telefon ile ara..."
            className="w-full h-12 pl-11 pr-4 bg-white border border-zinc-200 rounded-2xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-xl shadow-zinc-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/80 border-b border-zinc-100">
                <th className="px-6 py-4 text-[11px] font-black text-zinc-400 uppercase tracking-widest">Müşteri Bilgileri</th>
                <th className="px-6 py-4 text-[11px] font-black text-zinc-400 uppercase tracking-widest text-center">Durum</th>
                <th className="px-6 py-4 text-[11px] font-black text-zinc-400 uppercase tracking-widest text-center">İstatistikler</th>
                <th className="px-6 py-4 text-[11px] font-black text-zinc-400 uppercase tracking-widest text-center">Kayıt Tarihi</th>
                <th className="px-6 py-4 text-[11px] font-black text-zinc-400 uppercase tracking-widest text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-6"><div className="h-10 w-48 bg-zinc-100 rounded-lg"></div></td>
                    <td className="px-6 py-6"><div className="h-6 w-20 mx-auto bg-zinc-100 rounded-full"></div></td>
                    <td className="px-6 py-6"><div className="h-8 w-32 mx-auto bg-zinc-100 rounded-lg"></div></td>
                    <td className="px-6 py-6"><div className="h-6 w-24 mx-auto bg-zinc-100 rounded-lg"></div></td>
                    <td className="px-6 py-6"><div className="h-10 w-10 ml-auto bg-zinc-100 rounded-full"></div></td>
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center">
                        <FaUser className="text-zinc-200 text-2xl" />
                      </div>
                      <p className="text-zinc-400 font-medium">Müşteri bulunamadı.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-bold text-sm border border-primary/10">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[14px] font-bold text-zinc-800">{customer.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <FaEnvelope className="text-[10px] text-zinc-300" />
                            <span className="text-[12px] text-zinc-400">{customer.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5
                          ${customer.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          {customer.isActive ? <FaCheckCircle /> : <FaTimesCircle />}
                          {customer.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                        {customer.role === 'ADMIN' && (
                          <span className="bg-zinc-900 text-white px-2 py-0.5 rounded text-[9px] font-black flex items-center gap-1">
                            <FaShieldAlt className="text-[8px]" /> ADMİN
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center">
                            <span className="text-[13px] font-black text-zinc-700">{customer.orderCount}</span>
                            <span className="text-[9px] font-bold text-zinc-400 uppercase">Sipariş</span>
                          </div>
                          <div className="w-px h-6 bg-zinc-100"></div>
                          <div className="flex flex-col items-center">
                            <span className="text-[13px] font-black text-zinc-700">₺{(customer.totalSpent ?? 0).toLocaleString('tr-TR')}</span>
                            <span className="text-[9px] font-bold text-zinc-400 uppercase">Harcama</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[13px] font-medium text-zinc-600">
                          {new Date(customer.createdAt).toLocaleDateString('tr-TR')}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {new Date(customer.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => fetchDetail(customer.id)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 hover:bg-zinc-900 hover:text-white transition-all shadow-sm"
                          title="Detayları Gör"
                        >
                          <FaSearch className="text-xs" />
                        </button>
                        <button
                          onClick={() => handleEdit(customer)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                          title="Düzenle"
                        >
                          <FaEdit className="text-xs" />
                        </button>
                        <button
                          onClick={() => toggleStatus(customer)}
                          className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all shadow-sm
                            ${customer.isActive ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white'}`}
                          title={customer.isActive ? 'Durdur' : 'Aktifleştir'}
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between">
            <span className="text-[12px] text-zinc-500 font-medium">Sayfa {page} / {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-400 hover:text-primary disabled:opacity-30 transition-all shadow-sm"
              >
                <FaChevronLeft className="text-xs" />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-400 hover:text-primary disabled:opacity-30 transition-all shadow-sm"
              >
                <FaChevronRight className="text-xs" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {isModalOpen && detail && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center text-primary font-black text-2xl border border-primary/10">
                      {detail.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-zinc-900">{detail.name}</h2>
                      <p className="text-zinc-500 font-medium">{detail.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-all">
                    <FaTimesCircle className="text-xl" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  <div className="bg-zinc-50 rounded-3xl p-5 border border-zinc-100">
                    <div className="flex items-center gap-3 mb-2 text-zinc-400">
                      <FaShoppingCart className="text-sm" />
                      <span className="text-[11px] font-black uppercase tracking-widest">Sipariş Sayısı</span>
                    </div>
                    <p className="text-2xl font-black text-zinc-800">{detail.orderCount ?? 0}</p>
                  </div>
                  <div className="bg-zinc-50 rounded-3xl p-5 border border-zinc-100">
                    <div className="flex items-center gap-3 mb-2 text-zinc-400">
                      <FaWallet className="text-sm" />
                      <span className="text-[11px] font-black uppercase tracking-widest">Toplam Harcama</span>
                    </div>
                    <p className="text-2xl font-black text-zinc-800">₺{(detail.totalSpent ?? 0).toLocaleString('tr-TR')}</p>
                  </div>
                  <div className="bg-zinc-50 rounded-3xl p-5 border border-zinc-100">
                    <div className="flex items-center gap-3 mb-2 text-zinc-400">
                      <FaCalendarAlt className="text-sm" />
                      <span className="text-[11px] font-black uppercase tracking-widest">Kayıt Tarihi</span>
                    </div>
                    <p className="text-[15px] font-bold text-zinc-800">{new Date(detail.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 mb-4 flex items-center gap-2">
                      <FaMapMarkerAlt className="text-primary" /> Kayıtlı Adresler
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {detail.addresses.length > 0 ? (
                        detail.addresses.map((addr, idx) => (
                          <div key={idx} className="p-4 rounded-2xl border border-zinc-100 bg-zinc-50/50">
                            <p className="text-[13px] font-bold text-zinc-800">{addr.title || 'Adres ' + (idx + 1)}</p>
                            <p className="text-[12px] text-zinc-500 mt-1">{addr.fullName}</p>
                            <p className="text-[12px] text-zinc-500">{addr.addressLine1}</p>
                            <p className="text-[12px] text-zinc-500">{addr.district} / {addr.city}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-zinc-400 italic">Kayıtlı adres bulunmuyor.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-zinc-900 mb-4 flex items-center gap-2">
                      <FaShoppingCart className="text-primary" /> Son Siparişler
                    </h3>
                    <div className="space-y-3">
                      {detail.orders.length > 0 ? (
                        detail.orders.map((order, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border border-zinc-100 bg-white shadow-sm">
                            <div>
                              <p className="text-[13px] font-bold text-zinc-800">#{order.orderNo}</p>
                              <p className="text-[11px] text-zinc-400">{new Date(order.createdAt).toLocaleDateString('tr-TR')}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[13px] font-black text-primary">₺{Number(order.grandTotal ?? 0).toLocaleString('tr-TR')}</p>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${order.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                {order.paymentStatus === 'PAID' ? 'Ödendi' : 'Bekliyor'}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-zinc-400 italic">Sipariş geçmişi bulunmuyor.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && editForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleUpdate} className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-zinc-900">Müşteri Düzenle</h2>
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-400 hover:bg-red-50 hover:text-red-500">
                    <FaTimesCircle />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Ad Soyad</label>
                    <input
                      type="text"
                      className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-primary focus:bg-white transition-all text-sm font-medium"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">E-Posta</label>
                    <input
                      type="email"
                      className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-primary focus:bg-white transition-all text-sm font-medium"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Telefon</label>
                    <input
                      type="text"
                      className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-primary focus:bg-white transition-all text-sm font-medium"
                      value={editForm.phone || ""}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Yetki</label>
                      <select
                        className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-primary focus:bg-white transition-all text-sm font-bold cursor-pointer"
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      >
                        <option value="CUSTOMER">Müşteri</option>
                        <option value="ADMIN">Admin</option>
                        <option value="STAFF">Personel</option>
                      </select>
                    </div>
                    <div className="flex flex-col justify-center pt-4">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={editForm.isActive}
                          onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                        />
                        <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${editForm.isActive ? 'bg-emerald-500' : 'bg-zinc-300'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${editForm.isActive ? 'left-7' : 'left-1'}`}></div>
                        </div>
                        <span className="text-sm font-bold text-zinc-700 group-hover:text-primary transition-colors">
                          {editForm.isActive ? 'Hesap Aktif' : 'Hesap Pasif'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 h-14 rounded-2xl border border-zinc-200 text-zinc-500 font-bold hover:bg-zinc-50 transition-all"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="flex-2 h-14 rounded-2xl bg-zinc-900 text-white font-black hover:bg-primary transition-all shadow-xl shadow-zinc-900/10"
                  >
                    Değişiklikleri Kaydet
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
