"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { FaUser, FaTruck, FaCreditCard, FaCheck, FaChevronRight, FaChevronLeft, FaInfoCircle, FaTicketAlt, FaTimes } from "react-icons/fa"
import Image from "next/image"
import { formatCurrency } from "@/lib/cart"
import { dispatchCartUpdated } from "@/lib/cartEvents"
import { calculatePriceSummary } from "@/lib/checkoutTotals"
import { cities, getDistrictsByCityId } from "@/utils/turkiye"
import Script from "next/script"

const steps = [
  { id: 1, title: "İletişim", icon: <FaUser /> },
  { id: 2, title: "Adres", icon: <FaTruck /> },
  { id: 3, title: "Ödeme", icon: <FaCreditCard /> }
]

export default function CheckoutClient() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [cart, setCart] = useState<any>(null)
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [storeSettings, setStoreSettings] = useState({ threshold: 750, cost: 49.9 })

  // Coupon States
  const [couponCode, setCouponCode] = useState("")
  const [activeCoupon, setActiveCoupon] = useState<any>(null)
  const [couponError, setCouponError] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const [paytrToken, setPaytrToken] = useState<string | null>(null)

  const [form, setForm] = useState({
    email: "",
    phone: "",
    fullName: "",
    city: "",
    district: "",
    address: "",
    postalCode: "",
    paymentMethod: "CREDIT_CARD",
    note: ""
  })

  // Veri yükleme ve API işlemleri
  useEffect(() => {
    fetch("/api/cart").then(r => r.json()).then(d => {
      setCart(d)
      if (d.settings) setStoreSettings(d.settings)
    })

    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) {
        setForm(prev => ({
          ...prev,
          email: d.user.email || "",
          phone: d.user.phone || ""
        }))
        // Fetch saved addresses if logged in
        fetch("/api/addresses").then(r => r.json()).then(addrData => {
           if (addrData.addresses) setSavedAddresses(addrData.addresses)
        })
      }
    })
  }, [])

  const districts = useMemo(() => {
    const selected = cities.find(c => c.name === form.city)
    if (!selected) return []
    return getDistrictsByCityId(selected.id)
  }, [form.city])

  const update = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const applySavedAddress = (addr: any) => {
    setForm(prev => ({
      ...prev,
      fullName: addr.fullName,
      city: addr.city,
      district: addr.district,
      address: addr.line1 + (addr.line2 ? ` ${addr.line2}` : "")
    }))
  }

  const applyCoupon = async () => {
    if (!couponCode) return
    setCouponLoading(true)
    setCouponError("")
    try {
      const res = await fetch("/api/checkout/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, subtotal: cart.summary.subtotal })
      })
      const data = await res.json()
      if (res.ok) {
        setActiveCoupon(data)
        setCouponCode("")
      } else {
        setCouponError(data.message)
      }
    } catch {
      setCouponError("Kupon uygulanırken bir hata oluştu.")
    } finally {
      setCouponLoading(false)
    }
  }

  const removeCoupon = () => {
    setActiveCoupon(null)
  }

  const next = () => setCurrentStep(prev => Math.min(prev + 1, 3))
  const back = () => setCurrentStep(prev => Math.max(prev - 1, 1))

  const isStepValid = () => {
    if (currentStep === 1) return form.email.includes("@") && form.phone.length >= 10
    if (currentStep === 2) return form.fullName && form.city && form.district && form.address
    return true
  }

  const handleFinalSubmit = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestEmail: form.email,
          guestPhone: form.phone,
          shippingFullName: form.fullName,
          shippingPhone: form.phone,
          shippingLine1: form.address,
          shippingDistrict: form.district,
          shippingCity: form.city,
          shippingPostalCode: form.postalCode || "34000",
          shippingCountry: "TR",
          billingSameAsShipping: true,
          paymentMethod: form.paymentMethod,
          note: form.note,
          couponCode: activeCoupon?.code
        })
      })
      const json = await res.json()
      if (res.ok) {
        dispatchCartUpdated()
        if (json.paytrToken) {
          setPaytrToken(json.paytrToken)
        } else {
          router.push(`/checkout/basarili?orderNo=${json.orderNo}`)
        }
      } else {
        const errorMsg = json.debug ? `${json.message} (${json.debug})` : (json.message || "Bir hata oluştu")
        alert(errorMsg)
      }
    } catch (err) {
      alert("Hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  if (!cart) return <div className="p-20 text-center">Yükleniyor...</div>

  // Dinamik Fiyat Hesaplama
  const totals = calculatePriceSummary(
    cart.summary.subtotal, 
    activeCoupon?.discount || 0,
    storeSettings.threshold,
    storeSettings.cost
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* STEPPER HEADER */}
      <div className="mb-12 flex items-center justify-center space-x-4 md:space-x-12">
        {steps.map((s) => (
          <div key={s.id} className="flex items-center space-x-2">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm transition-all duration-500 
              ${currentStep >= s.id ? "bg-[#6f8f73] text-white" : "bg-zinc-100 text-zinc-400"}`}>
              {currentStep > s.id ? <FaCheck /> : s.icon}
            </div>
            <span className={`hidden text-xs font-bold uppercase tracking-widest md:block 
              ${currentStep >= s.id ? "text-zinc-900" : "text-zinc-400"}`}>{s.title}</span>
            {s.id !== 3 && <div className="h-px w-8 bg-zinc-200 md:w-16" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_380px]">
        {/* LEFT SIDE: MULTI-STEP FORM */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-black uppercase italic text-zinc-800">İletişim Bilgileri</h2>
                  <Input label="E-Posta" value={form.email} onChange={(v: string) => update("email", v)} placeholder="ornek@mail.com" />
                  <Input label="Telefon" value={form.phone} onChange={(v: string) => update("phone", v)} placeholder="05XX XXX XX XX" />
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-black uppercase italic text-zinc-800">Teslimat Adresi</h2>
                  
                  {/* SAVED ADDRESSES */}
                  {savedAddresses.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Kayıtlı Adreslerim</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {savedAddresses.map((addr) => (
                          <button
                            key={addr.id}
                            type="button"
                            onClick={() => applySavedAddress(addr)}
                            className="flex flex-col items-start rounded-2xl border-2 border-zinc-100 p-4 text-left transition-all hover:border-[#6f8f73] hover:bg-[#f4f7f4]/30"
                          >
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#6f8f73] mb-1">{addr.title}</span>
                            <p className="text-xs font-bold text-zinc-900">{addr.fullName}</p>
                            <p className="mt-1 text-[10px] text-zinc-400 line-clamp-1">{addr.district}, {addr.city}</p>
                          </button>
                        ))}
                      </div>
                      <div className="relative flex items-center py-4">
                        <div className="grow border-t border-zinc-100"></div>
                        <span className="mx-4 shrink text-[10px] font-black uppercase tracking-widest text-zinc-300">VEYA MANUEL GİRİŞ</span>
                        <div className="grow border-t border-zinc-100"></div>
                      </div>
                    </div>
                  )}

                  <Input label="Ad Soyad" value={form.fullName} onChange={(v: string) => update("fullName", v)} />
                  <div className="grid grid-cols-2 gap-4">
                    <Select label="İl" value={form.city} options={cities} onChange={(v: string) => { update("city", v); update("district", "") }} />
                    <Select label="İlçe" value={form.district} options={districts} onChange={(v: string) => update("district", v)} disabled={!form.city} />
                  </div>
                  <Input label="Posta Kodu" value={form.postalCode} onChange={(v: string) => update("postalCode", v)} placeholder="34000" />
                  <textarea
                    placeholder="Mahalle, Sokak, No, Daire..."
                    className="w-full rounded-xl border border-zinc-200 p-4 text-sm font-bold outline-none focus:border-[#6f8f73] transition-all"
                    rows={3}
                    value={form.address}
                    onChange={e => update("address", e.target.value)}
                  />
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-8 text-center py-10">
                  {paytrToken ? (
                    <div className="space-y-6">
                      <div className="text-center">
                        <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">GÜVENLİ ÖDEME</h2>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2">Kart bilgilerinizi aşağıya girerek ödemenizi tamamlayın.</p>
                      </div>
                      <div className="rounded-3xl border border-zinc-100 shadow-sm bg-white">
                        <iframe 
                          src={`https://www.paytr.com/odeme/guvenli/${paytrToken}`} 
                          id="paytriframe" 
                          frameBorder="0" 
                          scrolling="auto" 
                          style={{ width: '100%', minHeight: '700px' }}
                        />
                        <Script 
                          src="https://www.paytr.com/js/iframeResizer.min.js" 
                          onLoad={() => {
                            // @ts-ignore
                            if (window.iFrameResize) window.iFrameResize({},'#paytriframe');
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#f4f7f4] text-[#6f8f73]">
                        <FaCreditCard className="h-10 w-10" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-900">ÖDEME ADIMI</h2>
                        <p className="text-sm text-zinc-400 max-w-sm mx-auto">Siparişinizi onayladıktan sonra PayTR güvenli ödeme sayfasına yönlendirileceksiniz.</p>
                      </div>
                    </>
                  )}
                  
                  {/* NOTE FIELD (Sadece iframe yokken gösterelim veya her zaman kalsın) */}
                  {!paytrToken && (
                    <div className="space-y-2 text-left">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">SİPARİŞ NOTU (OPSİYONEL)</label>
                      <textarea
                        placeholder="Siparişinize dair bir notunuz var mı?"
                        className="w-full rounded-4xl border-2 border-zinc-100 bg-white p-6 text-sm font-bold outline-none focus:border-[#6f8f73] transition-all"
                        rows={4}
                        value={form.note}
                        onChange={e => update("note", e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* NAVIGATION BUTTONS */}
          <div className="mt-10 flex items-center justify-between border-t border-zinc-100 pt-6">
            <button
              onClick={back}
              disabled={currentStep === 1}
              className="flex items-center space-x-2 text-sm font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-800 disabled:opacity-0"
            >
              <FaChevronLeft /> <span>Geri</span>
            </button>
            {currentStep < 3 ? (
              <button
                onClick={next}
                disabled={!isStepValid()}
                className="flex items-center space-x-3 rounded-full bg-[#6f8f73] px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-white shadow-lg disabled:opacity-40 transition-all hover:scale-105 active:scale-95"
              >
                <span>Devam Et</span> <FaChevronRight />
              </button>
            ) : (
              <button
                onClick={handleFinalSubmit}
                disabled={loading}
                className="flex items-center space-x-3 rounded-full bg-zinc-900 px-10 py-4 text-xs font-black uppercase tracking-[0.2em] text-white shadow-lg hover:bg-[#6f8f73] transition-all hover:scale-105 active:scale-95"
              >
                <span>{loading ? "Tamamlanıyor..." : "Siparişi Onayla"}</span> <FaCheck />
              </button>
            )}
          </div>
        </div>

        {/* RIGHT SIDE: SUMMARY CART (Mini) */}
        <aside className="h-fit rounded-[2.5rem] border border-zinc-100 bg-zinc-50/50 p-8 shadow-sm">
          <h3 className="mb-6 text-sm font-black uppercase tracking-widest text-zinc-900">Sipariş Özeti</h3>
          <div className="mb-8 space-y-4 border-b border-zinc-200 pb-8 max-h-[250px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {cart.lines.map((l: any) => (
              <div key={l.itemId} className="flex justify-between text-xs">
                <span className="text-zinc-500 line-clamp-1">{l.quantity}x {l.productName}</span>
                <span className="font-bold shrink-0 ml-4">{formatCurrency(l.lineTotal)}</span>
              </div>
            ))}
          </div>

          {/* COUPON SECTION */}
          <div className="mb-8 space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1">İNDİRİM KUPONU</p>
            {activeCoupon ? (
              <div className="flex items-center justify-between rounded-2xl bg-[#6f8f73]/10 px-4 py-3 border border-[#6f8f73]/20">
                <div className="flex items-center gap-2">
                  <FaTicketAlt className="text-[#6f8f73] h-3 w-3" />
                  <span className="text-xs font-black text-[#6f8f73] uppercase">{activeCoupon.code}</span>
                </div>
                <button onClick={removeCoupon} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                  <FaTimes className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input 
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="KODU GİRİN"
                  className="h-11 flex-1 rounded-xl border border-zinc-200 bg-white px-4 text-[10px] font-black uppercase outline-none focus:border-[#6f8f73]"
                />
                <button 
                  onClick={applyCoupon}
                  disabled={couponLoading || !couponCode}
                  className="h-11 rounded-xl bg-zinc-900 px-4 text-[10px] font-black uppercase text-white transition-all hover:bg-[#6f8f73] disabled:opacity-40"
                >
                  {couponLoading ? "..." : "UYGULA"}
                </button>
              </div>
            )}
            {couponError && <p className="text-[9px] font-bold text-rose-500 ml-1 uppercase">{couponError}</p>}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400 uppercase tracking-widest text-[9px]">Ara Toplam</span>
              <span className="font-bold">{formatCurrency(totals.subtotal)}</span>
            </div>
            
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400 uppercase tracking-widest text-[9px]">Kargo</span>
              <span className={`font-bold ${totals.shipping === 0 ? "text-[#6f8f73]" : ""}`}>
                {totals.shipping === 0 ? "BEDAVA" : formatCurrency(totals.shipping)}
              </span>
            </div>

            {totals.discount > 0 && (
              <div className="flex justify-between text-xs text-[#6f8f73]">
                <span className="uppercase tracking-widest text-[9px]">İndirim</span>
                <span className="font-bold">-{formatCurrency(totals.discount)}</span>
              </div>
            )}

            <div className="mt-6 flex justify-between border-t-2 border-dashed border-zinc-200 pt-6">
              <span className="text-xs font-black uppercase tracking-widest">Toplam</span>
              <span className="text-2xl font-black text-[#6f8f73] tracking-tighter">{formatCurrency(totals.grandTotal)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

// --- Küçük UI Bileşenleri ---

function Input({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string }) {
  return (
    <div className="flex flex-col space-y-1">
      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">{label}</label>
      <input
        className="h-14 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold outline-none focus:border-[#6f8f73] transition-all"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

function Select({ label, value, options, onChange, disabled }: { label: string, value: string, options: any[], onChange: (v: string) => void, disabled?: boolean }) {
  return (
    <div className="flex flex-col space-y-1">
      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">{label}</label>
      <select
        disabled={disabled}
        className="h-14 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold outline-none focus:border-[#6f8f73] disabled:bg-zinc-50 transition-all"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Seçiniz</option>
        {options?.map((o: any) => <option key={o.id} value={o.name}>{o.name}</option>)}
      </select>
    </div>
  )
}