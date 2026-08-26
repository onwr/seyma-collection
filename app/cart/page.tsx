import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { CartClient } from "@/components/cart/CartClient"
import { HomeFooter } from "@/components/home/HomeFooter"
import { HomeHeader } from "@/components/home/HomeHeader"
import { getUserIdFromCookies } from "@/lib/authSession"
import { registerHrefWithCallbackUrl } from "@/lib/safeCallbackUrl"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.littlemomstore.com"

export const metadata: Metadata = {
  title: "Sepetim",
  description: "Sepetinizdeki ürünleri düzenleyin ve siparişinizi tamamlamaya hazırlanın.",
  alternates: {
    canonical: `${siteUrl}/cart`,
  },
}

export const dynamic = "force-dynamic"

export default async function CartPage() {
  const userId = await getUserIdFromCookies()
  if (!userId) {
    redirect(registerHrefWithCallbackUrl("/cart"))
  }

  return (
    <>
      <main className="mx-auto w-full max-w-screen-2xl flex-1">
        <HomeHeader />

        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
          <Link href="/" className="transition hover:text-[#6f8f73]">
            Anasayfa
          </Link>
          <span aria-hidden>›</span>
          <span className="font-medium text-zinc-800">Sepetim</span>
        </div>

        <section className="rounded-2xl border border-zinc-200/80 bg-linear-to-b from-zinc-50/90 to-white p-4 shadow-sm md:p-6">
          <h1 className="mb-4 text-2xl font-semibold text-zinc-900 md:text-3xl">Sepetim</h1>
          <CartClient />
        </section>
      </main>
      <HomeFooter />
    </>
  )
}
