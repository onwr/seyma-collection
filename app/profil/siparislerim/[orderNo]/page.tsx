"use client"

import { useState, useEffect, use } from "react"
import { motion } from "framer-motion"
import { FaChevronLeft, FaBox, FaTruck, FaCheckCircle, FaMapMarkerAlt, FaCreditCard, FaFileAlt } from "react-icons/fa"
import { HomeHeader } from "@/components/home/HomeHeader"
import { HomeFooter } from "@/components/home/HomeFooter"
import Link from "next/link"
import Image from "next/image"
import { formatCurrency } from "@/lib/cart"

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNo: string }>
}) {
  const { orderNo } = use(params)
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/orders/${orderNo}`)
      .then(r => r.json())
      .then(d => {
        setOrder(d)
        setLoading(false)
      })
  }, [orderNo])

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#bcd2bf] border-t-[#6f8f73]" />
    </div>
  )

  if (!order || order.message) return (
    <div className="flex h-screen flex-col items-center justify-center bg-white space-y-4">
      <p className="text-sm font-black uppercase tracking-widest text-zinc-400">Sipariş bulunamadı</p>
      <Link href="/profil?tab=siparisler" className="text-xs font-black text-[#6f8f73] underline">Siparişlerime dön</Link>
    </div>
  )

  const steps = [
    { id: "PENDING", label: "Hazırlanıyor", icon: <FaBox />, date: order.createdAt },
    { id: "SHIPPED", label: "Yolda", icon: <FaTruck />, date: order.shipment?.shippedAt },
    { id: "DELIVERED", label: "Teslim Edildi", icon: <FaCheckCircle />, date: order.shipment?.deliveredAt },
  ]

  const currentStepIndex = steps.findIndex(s => s.id === order.status)
  const activeStepIndex = currentStepIndex === -1 ? 0 : currentStepIndex

  return (
    <div className="min-h-screen bg-[#fcfdfc] flex flex-col">
      <HomeHeader />
      
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-12">
        {/* HEADER */}
        <div className="mb-10 flex items-center justify-between">
          <Link href="/profil?tab=siparisler" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors">
            <FaChevronLeft className="h-3 w-3" /> Geri
          </Link>
          <div className="text-right">
             <h1 className="text-2xl font-black uppercase tracking-tighter text-zinc-900">Sipariş Detayı</h1>
             <p className="text-[10px] font-black text-[#6f8f73] uppercase tracking-widest">#{order.orderNo}</p>
          </div>
        </div>

        {/* STATUS TRACKER */}
        <div className="mb-12 rounded-[2.5rem] bg-white border border-zinc-100 p-10 shadow-sm">
           <div className="relative flex justify-between">
              <div className="absolute top-6 left-0 h-0.5 w-full bg-zinc-100" />
              <div className="absolute top-6 left-0 h-0.5 bg-[#6f8f73] transition-all duration-1000" style={{ width: `${(activeStepIndex / (steps.length - 1)) * 100}%` }} />
              
              {steps.map((step, i) => (
                <div key={step.id} className="relative z-10 flex flex-col items-center group">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-500 
                    ${i <= activeStepIndex ? "bg-[#6f8f73] text-white shadow-lg shadow-[#6f8f73]/20" : "bg-zinc-100 text-zinc-400"}`}>
                    {step.icon}
                  </div>
                  <p className={`mt-4 text-[10px] font-black uppercase tracking-widest transition-colors ${i <= activeStepIndex ? "text-zinc-900" : "text-zinc-400"}`}>
                    {step.label}
                  </p>
                  {step.date && (
                    <p className="mt-1 text-[9px] text-zinc-400 font-bold uppercase">{new Date(step.date).toLocaleDateString('tr-TR')}</p>
                  )}
                </div>
              ))}
           </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_350px]">
          {/* LEFT: PRODUCTS & ADDRESS */}
          <div className="space-y-8">
            {/* Products */}
            <div className="rounded-3xl bg-white border border-zinc-100 p-8 shadow-sm">
              <h3 className="mb-6 text-sm font-black uppercase tracking-widest text-zinc-900">Sipariş Verilen Ürünler</h3>
              <div className="space-y-6">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex gap-6">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-zinc-50 border border-zinc-100">
                      <Image src={item.product.images[0]?.url || "/logo.jpeg"} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="flex flex-1 flex-col justify-center">
                      <h4 className="text-sm font-black text-zinc-900 uppercase tracking-tight">{item.name}</h4>
                      <p className="mt-1 text-xs font-bold text-zinc-400">{item.quantity} Adet × {formatCurrency(Number(item.unitPrice))}</p>
                    </div>
                    <div className="flex items-center">
                      <p className="text-sm font-black text-zinc-900">{formatCurrency(Number(item.lineTotal))}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Address & Note */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="rounded-3xl bg-white border border-zinc-100 p-8 shadow-sm">
                  <div className="mb-4 flex items-center gap-2 text-[#6f8f73]">
                    <FaMapMarkerAlt className="h-4 w-4" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest">Teslimat Adresi</h3>
                  </div>
                  <p className="text-sm font-black text-zinc-900 mb-1">{order.shippingFullName}</p>
                  <p className="text-xs font-bold text-zinc-500 mb-2">{order.shippingPhone}</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {order.shippingLine1}<br />
                    {order.shippingDistrict} / {order.shippingCity}
                  </p>
               </div>
               <div className="rounded-3xl bg-white border border-zinc-100 p-8 shadow-sm">
                  <div className="mb-4 flex items-center gap-2 text-[#6f8f73]">
                    <FaFileAlt className="h-4 w-4" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest">Sipariş Notu</h3>
                  </div>
                  <p className="text-xs font-bold text-zinc-500 leading-relaxed italic">
                    {order.note || "Not bırakılmamış."}
                  </p>
               </div>
            </div>
          </div>

          {/* RIGHT: SUMMARY */}
          <aside className="space-y-8">
            <div className="rounded-3xl bg-zinc-900 p-8 text-white shadow-xl shadow-zinc-900/20">
               <h3 className="mb-6 text-sm font-black uppercase tracking-widest opacity-40">Özet</h3>
               <div className="space-y-4 border-b border-white/10 pb-6">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                    <span className="opacity-40">ARA TOPLAM</span>
                    <span>{formatCurrency(Number(order.subtotal))}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                    <span className="opacity-40">KARGO</span>
                    <span className="text-[#bcd2bf]">{Number(order.shippingCost) === 0 ? "BEDAVA" : formatCurrency(Number(order.shippingCost))}</span>
                  </div>
                  {Number(order.discountTotal) > 0 && (
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-[#bcd2bf]">
                      <span>İNDİRİM</span>
                      <span>-{formatCurrency(Number(order.discountTotal))}</span>
                    </div>
                  )}
               </div>
               <div className="mt-6 flex justify-between items-end">
                  <span className="text-xs font-black uppercase tracking-widest opacity-40">TOPLAM</span>
                  <span className="text-3xl font-black tracking-tighter text-[#bcd2bf]">{formatCurrency(Number(order.grandTotal))}</span>
               </div>
            </div>

            <div className="rounded-3xl bg-white border border-zinc-100 p-8 shadow-sm">
               <div className="mb-4 flex items-center gap-2 text-zinc-400">
                 <FaCreditCard className="h-4 w-4" />
                 <h3 className="text-[10px] font-black uppercase tracking-widest">Ödeme Yöntemi</h3>
               </div>
               <p className="text-xs font-black text-zinc-900 uppercase tracking-widest">{order.payments[0]?.method || "Bilinmiyor"}</p>
               <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-[#6f8f73]">{order.paymentStatus}</p>
            </div>
          </aside>
        </div>
      </main>

      <HomeFooter />
    </div>
  )
}
