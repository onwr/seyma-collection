import type { Metadata } from "next"
import RegisterForm from "@/components/auth/RegisterForm"
import { HomeFooter } from "@/components/home/HomeFooter"
import { HomeHeader } from "@/components/home/HomeHeader"
import { sanitizePostAuthPath } from "@/lib/safeCallbackUrl"
import Image from "next/image"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.seymacollection.com"

export const metadata: Metadata = {
  title: "Üye ol",
  description: "Şeyma Collection'a ücretsiz üye olun.",
  alternates: { canonical: `${siteUrl}/register` },
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const sp = await searchParams
  const postAuthRedirect = sanitizePostAuthPath(sp.callbackUrl)

  return (
    <div className="flex flex-col min-h-screen">
      <HomeHeader />

      <main className="grid flex-1 md:grid-cols-2">

        {/* LEFT */}
        <div className="relative hidden md:flex rounded-br-2xl flex-col justify-center bg-[#ad516b] text-white p-12 overflow-hidden">
          {/* Background Image with Opacity */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/slide2.png"
              alt="Register Background"
              fill
              className="object-cover opacity-20 mix-blend-overlay"
            />
          </div>

          <div className="relative z-10">
            <h2 className="text-4xl font-black leading-tight uppercase tracking-tight">
              Hesabını oluştur <br /> <span className="text-[#ddb1bd]">alışverişe başla</span>
            </h2>
            <p className="mt-4 text-sm font-medium opacity-80 max-w-xs">
              Şeyma Collection ailesine katılın, size özel kampanya ve fırsatları kaçırmayın.
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center justify-center px-6 py-12 bg-white">
          <RegisterForm postAuthRedirect={postAuthRedirect} />
        </div>

      </main>

      <HomeFooter />
    </div>
  )
}