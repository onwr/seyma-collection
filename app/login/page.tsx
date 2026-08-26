import type { Metadata } from "next"
import { Suspense } from "react"
import { LoginForm } from "@/components/auth/LoginForm"
import { HomeFooter } from "@/components/home/HomeFooter"
import { HomeHeader } from "@/components/home/HomeHeader"
import Image from "next/image"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.littlemomstore.com"

export const metadata: Metadata = {
  title: "Üye girişi",
  description: "Little Mom's Store hesabınıza giriş yapın.",
  alternates: { canonical: `${siteUrl}/login` },
}

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <HomeHeader />
      <main className="grid flex-1 md:grid-cols-2">
        
        {/* LEFT */}
        <div className="relative hidden md:flex rounded-br-2xl flex-col justify-center bg-[#6f8f73] text-white p-12 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image
              src="/slide2.png"
              alt="Login Background"
              fill
              className="object-cover opacity-20 mix-blend-overlay"
            />
          </div>

          <div className="relative z-10">
            <h2 className="text-4xl font-black leading-tight uppercase tracking-tight">
              Tekrar Hoş Geldin <br /> <span className="text-[#bcd2bf]">seni özledik</span>
            </h2>
            <p className="mt-4 text-sm font-medium opacity-80 max-w-xs">
              Hesabına giriş yaparak siparişlerini takip edebilir ve avantajlardan yararlanabilirsin.
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center justify-center px-6 py-12 bg-white">
          <Suspense fallback={
            <div className="flex justify-center py-12">
               <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-[#6f8f73]" />
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>
      </main>
      <HomeFooter />
    </div>
  )
}
