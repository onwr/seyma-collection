"use client"

import Link from "next/link"
import Image from "next/image"
import { HomeHeader } from "@/components/home/HomeHeader"
import { HomeFooter } from "@/components/home/HomeFooter"

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen bg-[#fdfdfd]">
      <HomeHeader />

      <main className="flex-grow flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center space-y-8">


          <div className="space-y-4">
            <h1 className="text-6xl font-serif font-bold text-[#ad516b]">404</h1>
            <h2 className="text-2xl font-medium text-zinc-800">Ups! Yolumuzu Kaybettik</h2>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-xs mx-auto">
              Aradığınız sayfa uykuda olabilir veya başka bir adrese taşınmış olabilir.
              Bebeğiniz için en güzel ürünlere göz atmaya ne dersiniz?
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/"
              className="w-full sm:w-auto px-8 py-3 bg-[#ad516b] text-white rounded-full font-medium transition-all hover:bg-[#8d4358] hover:shadow-lg active:scale-95"
            >
              Anasayfaya Dön
            </Link>
            <Link
              href="/categories/yeni-gelenler"
              className="w-full sm:w-auto px-8 py-3 border border-[#ad516b] text-[#ad516b] rounded-full font-medium transition-all hover:bg-[#f9f2f4] active:scale-95"
            >
              Yeni Gelenler
            </Link>
          </div>

          <div className="pt-8">
            <p className="text-xs text-zinc-400">
              Yardıma mı ihtiyacınız var? <Link href="/sikca-sorulan-sorular" className="underline hover:text-[#ad516b]">Destek Merkezine</Link> göz atın.
            </p>
          </div>
        </div>
      </main>

      <HomeFooter />

      <style jsx global>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
