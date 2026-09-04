import type { Metadata } from "next"
import Link from "next/link"
import { FaqAccordion } from "@/components/faq/FaqAccordion"
import { FaqBreadcrumb } from "@/components/faq/FaqBreadcrumb"
import { HomeFooter } from "@/components/home/HomeFooter"
import { HomeHeader } from "@/components/home/HomeHeader"
import { getFaqsForPage } from "@/lib/faq"

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.seymacollection.com/"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Sıkça Sorulan Sorular",
  description:
    "Sipariş, kargo, iade ve hesap işlemleri hakkında Şeyma Collection sıkça sorulan sorular.",
  alternates: {
    canonical: `${siteUrl}/sikca-sorulan-sorular`,
  },
}

export default async function FaqPage() {
  const items = await getFaqsForPage()

  return (
    <>
      <main className="mx-auto w-full max-w-screen-2xl flex-1">
        <HomeHeader />
        <div className="mx-auto pt-2 md:pt-4">
          <FaqBreadcrumb />
          <header className="mb-10 text-center md:mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#ad516b]">
              Yardım merkezi
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
              Sıkça Sorulan Sorular
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-600 md:text-base">
              Aşağıda sipariş süreçleri, kargo, iade ve ürün güvenliği ile ilgili
              yanıtları bulabilirsiniz. Aradığınızı göremezseniz{" "}
              <Link
                href="/contact"
                className="font-medium text-[#ad516b] underline-offset-2 hover:underline"
              >
                iletişim
              </Link>{" "}
              sayfamızdan bize yazın.
            </p>
          </header>

          <div className="rounded-2xl border border-zinc-200/80 bg-linear-to-b from-zinc-50/90 to-white px-4 py-10 shadow-sm md:px-8 md:py-12">
            <FaqAccordion items={items} />
          </div>
        </div>
      </main>
      <HomeFooter />
    </>
  )
}
