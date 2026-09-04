"use client"

import { useState, useEffect, Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FaUser, FaMapMarkerAlt, FaBox, FaHeart, FaChevronRight, FaPhone, FaEnvelope, FaClock, FaCheckCircle, FaTrash, FaEdit, FaShoppingCart, FaStar } from "react-icons/fa"
import { HomeHeader } from "@/components/home/HomeHeader"
import { HomeFooter } from "@/components/home/HomeFooter"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { dispatchCartUpdated } from "@/lib/cartEvents"
import { formatCurrency } from "@/lib/cart"

type TabType = "profil" | "adresler" | "siparisler" | "favoriler" | "degerlendirmeler"

function ProfileContent() {
  const [activeTab, setActiveTab] = useState<TabType>("profil")
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const [formData, setFormData] = useState({
    name: "",
    phone: ""
  })

  // Sync tab with URL
  useEffect(() => {
    const tab = searchParams.get("tab") as TabType
    if (tab && ["profil", "adresler", "siparisler", "favoriler", "degerlendirmeler"].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me")
      const data = await res.json()
      if (res.ok && data.user) {
        setUser(data.user)
        setFormData({
          name: data.user.name || "",
          phone: data.user.phone || ""
        })
      } else {
        router.push("/login")
      }
    } catch (err) {
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async () => {
    setUpdateLoading(true)
    setFeedback(null)
    try {
      const res = await fetch("/api/profile/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (res.ok) {
        setFeedback({ type: "success", message: data.message })
        void fetchUser()
      } else {
        setFeedback({ type: "error", message: data.message })
      }
    } catch (err) {
      setFeedback({ type: "error", message: "Bir hata oluştu." })
    } finally {
      setUpdateLoading(false)
    }
  }

  const toggleFavorite = async (productId: number) => {
    try {
      const res = await fetch("/api/favorites/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId })
      })
      if (res.ok) {
        void fetchUser()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddToCart = async (productId: number) => {
    try {
      const response = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ productId, variantId: 1, quantity: 1 }),
      })
      if (response.ok) {
        dispatchCartUpdated()
      }
    } catch (error) {
      console.error(error)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#ddb1bd] border-t-[#ad516b]" />
      </div>
    )
  }

  const tabs = [
    { id: "profil", label: "Profil Bilgileri", icon: <FaUser /> },
    { id: "adresler", label: "Adreslerim", icon: <FaMapMarkerAlt /> },
    { id: "siparisler", label: "Siparişlerim", icon: <FaBox /> },
    { id: "favoriler", label: "Favorilerim", icon: <FaHeart /> },
    { id: "degerlendirmeler", label: "Değerlendirmelerim", icon: <FaStar /> },
  ]

  return (
    <div className="min-h-screen bg-[#fdfcfc] flex flex-col">
      <HomeHeader />
      
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-12 md:px-8">
        <div className="mb-10 flex flex-col gap-2">
           <h1 className="text-4xl font-black uppercase tracking-tighter text-zinc-900">Hesabım</h1>
           <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Kişisel bilgilerinizi ve siparişlerinizi yönetin.</p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
          {/* Sidebar Tabs */}
          <aside className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TabType)
                  router.push(`/profil?tab=${tab.id}`, { scroll: false })
                }}
                className={`group flex w-full items-center justify-between rounded-2xl px-6 py-4 text-sm font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id
                    ? "bg-zinc-900 text-white shadow-xl shadow-zinc-900/20"
                    : "bg-white text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900 border border-zinc-100"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className={`text-lg transition-colors ${activeTab === tab.id ? "text-[#ddb1bd]" : "text-zinc-300 group-hover:text-zinc-900"}`}>
                    {tab.icon}
                  </span>
                  {tab.label}
                </div>
                <FaChevronRight className={`h-3 w-3 transition-transform duration-300 ${activeTab === tab.id ? "translate-x-1" : "opacity-0 group-hover:opacity-100 group-hover:translate-x-1"}`} />
              </button>
            ))}
          </aside>

          {/* Content Area */}
          <div className="min-h-[600px] rounded-[2.5rem] bg-white border border-zinc-100 p-8 shadow-sm">
             <AnimatePresence mode="wait">
               <motion.div
                 key={activeTab}
                 initial={{ opacity: 0, x: 10 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -10 }}
                 transition={{ duration: 0.3 }}
               >
                 {activeTab === "profil" && (
                    <div className="max-w-2xl space-y-8">
                      <div>
                        <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight mb-2">Profil Bilgileri</h2>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Bilgilerinizi buradan güncelleyebilirsiniz.</p>
                      </div>

                      {feedback && (
                        <div className={`rounded-2xl p-4 text-xs font-bold uppercase tracking-widest ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
                          {feedback.message}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ProfileInput label="AD SOYAD" value={formData.name} onChange={(v: string) => setFormData({...formData, name: v})} icon={<FaUser />} />
                        <ProfileInput label="E-POSTA" value={user?.email || ""} icon={<FaEnvelope />} disabled />
                        <ProfileInput label="TELEFON" value={formData.phone} onChange={(v: string) => setFormData({...formData, phone: v})} icon={<FaPhone />} />
                      </div>

                      <div className="pt-6">
                        <button 
                          onClick={handleUpdateProfile}
                          disabled={updateLoading}
                          className="rounded-2xl bg-[#ad516b] px-10 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-[#ad516b]/20 transition-all hover:bg-[#97475e] hover:scale-105 active:scale-95 disabled:opacity-50"
                        >
                          {updateLoading ? "GÜNCELLENİYOR..." : "Değişiklikleri Kaydet"}
                        </button>
                      </div>
                    </div>
                 )}

                 {activeTab === "adresler" && (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight mb-2">Adreslerim</h2>
                          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Kayıtlı teslimat ve fatura adresleriniz.</p>
                        </div>
                        <button className="rounded-xl border-2 border-[#ad516b] px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#ad516b] hover:bg-[#ad516b] hover:text-white transition-all">
                          Yeni Adres Ekle
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {user.addresses?.map((addr: any) => (
                          <div key={addr.id} className={`group relative rounded-3xl border-2 p-6 transition-all hover:shadow-lg ${addr.isDefault ? "border-[#ad516b] bg-[#f9f2f4]/30" : "border-zinc-100 bg-zinc-50/20 hover:border-zinc-300"}`}>
                             <div className="mb-4 flex items-center justify-between">
                                <span className={`rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest ${addr.isDefault ? "bg-[#ad516b] text-white" : "bg-zinc-200 text-zinc-600"}`}>
                                  {addr.title}
                                </span>
                                <div className="flex gap-3">
                                  <button className="text-zinc-400 hover:text-zinc-900 transition-colors"><FaEdit className="h-4 w-4" /></button>
                                  {!addr.isDefault && <button className="text-zinc-400 hover:text-rose-600 transition-colors"><FaTrash className="h-4 w-4" /></button>}
                                </div>
                             </div>
                             <p className="text-sm font-black text-zinc-900 mb-1">{addr.fullName}</p>
                             <p className="text-xs font-bold text-zinc-500 leading-relaxed mb-1">{addr.phone}</p>
                             <p className="text-xs text-zinc-400 leading-relaxed">
                               {addr.line1}<br />
                               {addr.district} / {addr.city}
                             </p>
                             {addr.isDefault && (
                               <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-[#ad516b] uppercase tracking-widest">
                                 <FaCheckCircle className="h-3 w-3" />
                                 Varsayılan Adres
                                </div>
                             )}
                          </div>
                        ))}
                        {(!user.addresses || user.addresses.length === 0) && (
                          <p className="col-span-full py-12 text-center text-sm font-bold text-zinc-400 uppercase tracking-widest">Henüz bir adres eklemediniz.</p>
                        )}
                      </div>
                    </div>
                 )}

                 {activeTab === "siparisler" && (
                    <div className="space-y-8">
                      <div>
                        <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight mb-2">Siparişlerim</h2>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Tüm siparişlerinizin detaylarını ve durumunu görün.</p>
                      </div>

                      {user.orders?.length > 0 ? (
                        <div className="space-y-6">
                          {user.orders.map((order: any) => (
                            <div key={order.id} className="group overflow-hidden rounded-[2.5rem] border border-zinc-100 bg-white transition-all hover:shadow-xl hover:shadow-zinc-900/5">
                               <div className="flex flex-wrap items-center justify-between gap-6 bg-zinc-50/50 px-8 py-6">
                                  <div className="flex flex-wrap gap-8">
                                     <div>
                                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">SİPARİŞ TARİHİ</p>
                                        <p className="text-xs font-black text-zinc-900 uppercase">{new Date(order.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                     </div>
                                     <div>
                                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">TOPLAM</p>
                                        <p className="text-xs font-black text-zinc-900">{formatCurrency(Number(order.grandTotal))}</p>
                                     </div>
                                     <div>
                                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">DURUM</p>
                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                                          order.status === "DELIVERED" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                        }`}>
                                          <div className={`h-1.5 w-1.5 rounded-full ${order.status === "DELIVERED" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                                          {order.status === "PENDING" ? "Hazırlanıyor" : order.status === "SHIPPED" ? "Yolda" : "Teslim Edildi"}
                                        </span>
                                     </div>
                                  </div>
                                  <Link 
                                    href={`/profil/siparislerim/${order.orderNo}`}
                                    className="rounded-xl bg-white border border-zinc-200 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-900 transition-all hover:bg-zinc-900 hover:text-white hover:border-zinc-900"
                                  >
                                    Detayları Gör
                                  </Link>
                               </div>
                               <div className="px-8 py-8">
                                  <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                     {order.items?.map((item: any) => (
                                       <div key={item.id} className="group/item relative h-20 w-20 shrink-0 rounded-[1.25rem] bg-zinc-50 overflow-hidden border border-zinc-100 transition-transform hover:scale-105">
                                          <Image src={item.product?.images?.[0]?.url || "/logo.jpeg"} alt={item.name} fill className="object-cover" />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center">
                                             <span className="text-[10px] font-black text-white">x{item.quantity}</span>
                                          </div>
                                       </div>
                                     ))}
                                  </div>
                               </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex h-[400px] flex-col items-center justify-center text-center">
                          <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-zinc-50 text-zinc-200">
                            <FaBox className="h-10 w-10" />
                          </div>
                          <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 mb-2">HENÜZ BİR SİPARİŞİNİZ YOK</h3>
                          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-8">Hemen alışverişe başla ve harika ürünleri keşfet!</p>
                          <Link href="/" className="rounded-2xl bg-[#ad516b] px-10 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-[#ad516b]/20 transition-all hover:scale-105 active:scale-95">
                             Alışverişe Başla
                          </Link>
                        </div>
                      )}
                    </div>
                 )}

                 {activeTab === "favoriler" && (
                    <div className="space-y-8">
                      <div>
                        <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight mb-2">Favorilerim</h2>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Beğendiğiniz ürünlere buradan hızlıca ulaşın.</p>
                      </div>

                      {user.favorites?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {user.favorites.map((fav: any) => (
                            <div key={fav.id} className="group relative rounded-3xl border border-zinc-100 p-4 transition-all hover:shadow-xl hover:border-[#ad516b]/30">
                              <div className="relative aspect-square w-full overflow-hidden rounded-2xl mb-4">
                                <Link href={`/products/${fav.product.slug}`}>
                                  <Image src={fav.product.images[0]?.url || "/logo.jpeg"} alt={fav.product.name} fill className="object-cover transition-transform group-hover:scale-110" />
                                </Link>
                                <button 
                                  onClick={() => void toggleFavorite(fav.product.id)}
                                  className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 text-rose-500 shadow-sm backdrop-blur-md transition-colors hover:bg-rose-500 hover:text-white"
                                >
                                  <FaHeart className="h-4 w-4" />
                                </button>
                              </div>
                              <Link href={`/products/${fav.product.slug}`} className="block">
                                <h3 className="line-clamp-1 text-xs font-black uppercase tracking-tight text-zinc-900 group-hover:text-[#ad516b] transition-colors">{fav.product.name}</h3>
                                <p className="mt-1 text-sm font-black text-zinc-900">₺{fav.product.basePrice}</p>
                              </Link>
                              <button 
                                onClick={() => void handleAddToCart(fav.product.id)}
                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-[#ad516b]"
                              >
                                <FaShoppingCart className="h-3 w-3" />
                                SEPETE EKLE
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex h-[300px] flex-col items-center justify-center text-center opacity-40">
                          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-50">
                            <FaHeart className="h-8 w-8" />
                          </div>
                          <p className="text-sm font-black uppercase tracking-widest">Favori ürününüz bulunmuyor.</p>
                        </div>
                      )}
                    </div>
                 )}

                 {activeTab === "degerlendirmeler" && (
                    <div className="space-y-8">
                      <div>
                        <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight mb-2">Değerlendirmelerim</h2>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Satın aldığınız ürünlere yaptığınız yorumlar.</p>
                      </div>

                      <div className="flex h-[300px] flex-col items-center justify-center text-center opacity-40">
                        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-50">
                          <FaStar className="h-8 w-8" />
                        </div>
                        <p className="text-sm font-black uppercase tracking-widest">Henüz bir değerlendirmeniz bulunmuyor.</p>
                      </div>
                    </div>
                 )}
               </motion.div>
             </AnimatePresence>
          </div>
        </div>
      </main>

      <HomeFooter />
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#ddb1bd] border-t-[#ad516b]" />
      </div>
    }>
      <ProfileContent />
    </Suspense>
  )
}

function ProfileInput({ label, value, onChange, icon, type = "text", disabled = false }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative group">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 transition-colors group-focus-within:text-[#ad516b]">
          {icon}
        </span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-14 w-full rounded-2xl border-2 border-zinc-100 bg-zinc-50/30 pl-12 pr-4 text-sm font-bold text-zinc-900 outline-none transition-all focus:border-[#ad516b] focus:bg-white disabled:opacity-50"
        />
      </div>
    </div>
  )
}
