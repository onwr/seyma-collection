import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import CheckoutClient from "@/components/checkout/CheckoutClient"
import { HomeFooter } from "@/components/home/HomeFooter"
import { HomeHeader } from "@/components/home/HomeHeader"
import { getUserIdFromCookies } from "@/lib/authSession"
import { registerHrefWithCallbackUrl } from "@/lib/safeCallbackUrl"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.seymacollection.com"

export const metadata: Metadata = {
  title: "Ödeme",
  description: "Teslimat ve ödeme bilgilerinizi girerek siparişinizi tamamlayın.",
  alternates: {
    canonical: `${siteUrl}/checkout`,
  },
}

export const dynamic = "force-dynamic"

export default async function CheckoutPage() {
  const userId = await getUserIdFromCookies()
  if (!userId) {
    redirect(registerHrefWithCallbackUrl("/checkout"))
  }

  return (
    <>
      <main className="mx-auto w-full max-w-screen-2xl flex-1">
        <HomeHeader />

        <div className="my-6 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
          <Link href="/" className="transition hover:text-[#ad516b]">
            Anasayfa
          </Link>
          <span aria-hidden>›</span>
          <Link href="/cart" className="transition hover:text-[#ad516b]">
            Sepetim
          </Link>
          <span aria-hidden>›</span>
          <span className="font-medium text-zinc-800">Ödeme</span>
        </div>

        <section className="rounded-2xl border border-zinc-200/80 bg-linear-to-b from-zinc-50/90 to-white p-4 shadow-sm md:p-6">
          <h1 className="mb-2 text-2xl font-semibold text-zinc-900 md:text-3xl">Ödeme</h1>
          <p className="mb-6 text-sm text-zinc-600">
            Teslimat adresi ve ödeme yöntemini seçin. Tutarlar sunucuda yeniden hesaplanır.
          </p>
          <CheckoutClient />
        </section>
      </main>
      <HomeFooter />
    </>
  )
}
