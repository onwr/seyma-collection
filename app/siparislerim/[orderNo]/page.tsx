import type { Metadata } from "next"
import Link from "next/link"
import { OrderDetailClient } from "@/components/siparislerim/OrderDetailClient"
import { HomeFooter } from "@/components/home/HomeFooter"
import { HomeHeader } from "@/components/home/HomeHeader"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.seymacollection.com"

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ orderNo: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orderNo } = await params
  const decoded = decodeURIComponent(orderNo)
  return {
    title: `Sipariş ${decoded}`,
    description: "Sipariş detayı.",
    alternates: { canonical: `${siteUrl}/siparislerim/${encodeURIComponent(decoded)}` },
  }
}

export default async function SiparisDetayPage({ params }: Props) {
  const { orderNo: raw } = await params
  const orderNo = decodeURIComponent(raw)

  return (
    <>
      <main className="mx-auto w-full max-w-screen-2xl flex-1">
        <HomeHeader />
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
          <Link href="/" className="transition hover:text-[#ad516b]">
            Anasayfa
          </Link>
          <span aria-hidden>›</span>
          <Link href="/siparislerim" className="transition hover:text-[#ad516b]">
            Siparişlerim
          </Link>
          <span aria-hidden>›</span>
          <span className="font-medium text-zinc-800">Detay</span>
        </div>
        <section className="rounded-2xl border border-zinc-200/80 bg-linear-to-b from-zinc-50/90 to-white p-4 shadow-sm md:p-6">
          <h1 className="mb-4 font-mono text-xl font-semibold text-zinc-900 md:text-2xl">{orderNo}</h1>
          <OrderDetailClient orderNo={orderNo} />
        </section>
      </main>
      <HomeFooter />
    </>
  )
}
