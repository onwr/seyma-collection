"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { FaCheckCircle, FaShoppingBag, FaTruck, FaArrowRight } from "react-icons/fa"
import { HomeHeader } from "@/components/home/HomeHeader"
import { HomeFooter } from "@/components/home/HomeFooter"

export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNo?: string }>
}) {
  const params = use(searchParams)
  const orderNo = params.orderNo?.trim() ?? ""

  useEffect(() => {
    // If inside an iframe (PayTR), redirect the parent window
    if (typeof window !== 'undefined' && window.self !== window.top) {
      window.top!.location.href = window.location.href;
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <HomeHeader />
      
      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="w-full max-w-2xl text-center">
          {/* ANIMATED ICON */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 100 }}
            className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-[#f9f2f4] text-[#ad516b]"
          >
            <FaCheckCircle className="h-12 w-12" />
          </motion.div>

          {/* TEXT CONTENT */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <h1 className="text-4xl font-black uppercase tracking-tight text-zinc-900 md:text-5xl">
              SİPARİŞİNİZ <span className="text-[#ad516b]">ALINDI!</span>
            </h1>
            <p className="mx-auto max-w-md text-zinc-500">
              Harika bir seçim yaptınız! Siparişiniz başarıyla sistemimize ulaştı ve hazırlık ekibimize iletildi.
            </p>
          </motion.div>

          {/* ORDER CARD */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-12 overflow-hidden rounded-[2.5rem] border border-zinc-100 bg-zinc-50/50 p-8 md:p-10"
          >
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">SİPARİŞ NUMARASI</p>
                <p className="mt-1 text-2xl font-black tracking-tight text-zinc-900">#{orderNo || "000000"}</p>
              </div>
              <div className="h-px w-full bg-zinc-200 md:h-12 md:w-px" />
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">TAHMİNİ TESLİMAT</p>
                <p className="mt-1 text-lg font-bold text-zinc-800">2-4 İş Günü</p>
              </div>
              <div className="h-px w-full bg-zinc-200 md:h-12 md:w-px" />
              <div className="flex items-center space-x-3 text-[#ad516b]">
                <FaTruck className="h-6 w-6" />
                <span className="text-xs font-black uppercase tracking-widest">Hızlı Kargo</span>
              </div>
            </div>
          </motion.div>

          {/* NAVIGATION BUTTONS */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/profil?tab=siparisler"
              className="flex w-full items-center justify-center space-x-3 rounded-full bg-zinc-900 px-10 py-5 text-xs font-black uppercase tracking-[0.2em] text-white transition-all hover:scale-105 active:scale-95 sm:w-auto"
            >
              <span>SİPARİŞLERİM</span>
            </Link>
            <Link
              href="/"
              className="flex w-full items-center justify-center space-x-3 rounded-full border-2 border-zinc-100 bg-white px-10 py-5 text-xs font-black uppercase tracking-[0.2em] text-zinc-900 transition-all hover:border-[#ad516b] hover:text-[#ad516b] hover:scale-105 active:scale-95 sm:w-auto"
            >
              <span>ALIŞVERİŞE DEVAM ET</span>
              <FaArrowRight className="h-3 w-3" />
            </Link>
          </motion.div>

          {/* SOCIAL / HELP INFO */}
          <p className="mt-16 text-xs font-medium text-zinc-400">
            Sorunuz mu var? <Link href="/yardim" className="text-zinc-900 underline underline-offset-4">Destek merkezimize</Link> göz atın veya bize WhatsApp üzerinden ulaşın.
          </p>
        </div>
      </main>

      <HomeFooter />
    </div>
  )
}
