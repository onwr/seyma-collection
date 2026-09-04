"use client"

import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { WhatsAppButton } from "@/components/WhatsAppButton"
import {
  FaChevronUp,
  FaFacebookF,
  FaGoogle,
  FaInstagram,
  FaTwitter,
  FaYoutube,
} from "react-icons/fa"
import {
  FOOTER_SOCIAL_FALLBACK,
  type FooterSocialUrls,
} from "@/lib/footerSocialSettings"

const shoppingLinks = [
  { label: "Siparişlerim", href: "/siparislerim" },
  { label: "Sepetim", href: "/cart" },
  { label: "Hesabım", href: "/profil" },
  { label: "Sıkça Sorulan Sorular", href: "/sikca-sorulan-sorular" },
]

const corporateLinks = [
  { label: "Üyelik ve Kullanım Sözleşmesi", href: "/sayfa/uyelik-ve-kullanim-sozlesmesi" },
  { label: "İade Prosedürü", href: "/sayfa/iade-proseduru" },
  { label: "Mesafeli Satış Sözleşmesi", href: "/sayfa/mesafeli-satis-sozlesmesi" },
  { label: "Gizlilik ve Güvenlik", href: "/sayfa/gizlilik-ve-guvenlik" },
]

function FooterColumn({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-white">{title}</h3>
      <ul className="space-y-2.5 text-sm text-zinc-300">{children}</ul>
    </div>
  )
}

const SOCIAL_ROW: {
  key: keyof FooterSocialUrls
  label: string
  Icon: typeof FaFacebookF
}[] = [
  { key: "facebook", label: "Facebook", Icon: FaFacebookF },
  { key: "twitter", label: "X", Icon: FaTwitter },
  { key: "instagram", label: "Instagram", Icon: FaInstagram },
  { key: "youtube", label: "YouTube", Icon: FaYoutube },
  { key: "google", label: "Google", Icon: FaGoogle },
]

export function HomeFooter() {
  const [social, setSocial] = useState<FooterSocialUrls>(FOOTER_SOCIAL_FALLBACK)

  useEffect(() => {
    let cancelled = false
    fetch("/api/footer-social")
      .then((r) => r.json())
      .then((d: Partial<FooterSocialUrls>) => {
        if (cancelled || !d || typeof d !== "object") return
        setSocial({
          facebook: typeof d.facebook === "string" ? d.facebook : FOOTER_SOCIAL_FALLBACK.facebook,
          twitter: typeof d.twitter === "string" ? d.twitter : FOOTER_SOCIAL_FALLBACK.twitter,
          instagram: typeof d.instagram === "string" ? d.instagram : FOOTER_SOCIAL_FALLBACK.instagram,
          youtube: typeof d.youtube === "string" ? d.youtube : FOOTER_SOCIAL_FALLBACK.youtube,
          google: typeof d.google === "string" ? d.google : FOOTER_SOCIAL_FALLBACK.google,
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <footer className="mt-auto w-full">
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-10 md:py-12">
          <div className="flex w-full max-w-xl items-center gap-4 sm:max-w-2xl sm:gap-6 md:gap-8">
            <div className="h-px min-w-0 flex-1 bg-linear-to-r from-transparent via-zinc-300 to-zinc-300" aria-hidden />
            <Link href="/" className="mx-auto shrink-0">
              <Image
                src="/logo2.png"
                alt="Şeyma Collection"
                width={200}
                height={70}
                className="h-auto w-36 object-contain sm:w-44 md:w-52"
              />
            </Link>
            <div className="h-px min-w-0 flex-1 bg-linear-to-l from-transparent via-zinc-300 to-zinc-300" aria-hidden />
          </div>

          <div className="mt-10 flex w-full flex-col items-center gap-4">
            <span className="text-sm font-medium text-zinc-700">Bizi Takip Edin</span>
            <div className="flex flex-wrap items-center justify-center gap-3 text-zinc-600">
              {SOCIAL_ROW.map(({ key, label, Icon }) => {
                const href = social[key]?.trim()
                if (!href) return null
                const iconClass =
                  key === "instagram" || key === "youtube"
                    ? "h-4 w-4"
                    : "h-3.5 w-3.5"
                return (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 transition hover:border-[#ddb1bd] hover:text-[#ad516b]"
                  >
                    <Icon className={iconClass} />
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-zinc-950 text-zinc-100">
        <div className="mx-auto max-w-6xl px-4 pt-12 md:py-12 md:pt-16 md:pb-0">
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10 xl:gap-14">
            <FooterColumn title="Alışveriş Bilgileri">
              {shoppingLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </FooterColumn>

            <FooterColumn title="Kurumsal">
              {corporateLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </FooterColumn>

            <div className="min-w-0 sm:col-span-2 lg:col-span-1">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-white">İletişim</h3>
              <address className="not-italic">
                <p className="text-sm leading-relaxed text-zinc-300">
                  Sorularınız için bize ulaşabilirsiniz.
                </p>
                <p className="mt-4 space-y-3 text-sm text-zinc-400">
                  <span className="block">
                    <span className="font-medium text-zinc-500">Adres:</span>{" "}
                    <span className="text-zinc-300">
                      Cumhuriyet Mah. Veysel Karani Blv. 5400. Sokak D:2A/3, 06010 Yenimahalle/Ankara
                    </span>
                  </span>
                  <span className="block">
                    <span className="font-medium text-zinc-500">Telefon:</span>{" "}
                    <a href="tel:+905333066226" className="text-zinc-300 underline-offset-2 hover:text-white hover:underline">
                      0533 306 62 26
                    </a>
                  </span>

                  <span className="mt-1 block text-zinc-500">
                    <span className="font-medium text-zinc-500">Çalışma saatleri:</span>{" "}
                    Pazartesi–Cumartesi 10:00 – 20:00 · Pazar 12:00 – 18:00
                  </span>
                </p>
              </address>
            </div>
          </div>

         <div className="flex items-center  flex-col md:flex-row md:justify-between mt-12 border-t border-zinc-800 pt-10 md:pt-2 text-center text-xs text-zinc-500">
          <p className="text-left">
            © {new Date().getFullYear()}&nbsp;Şeyma Collection — Tüm hakları saklıdır.
          </p>
          <Link href="https://kurkayayazilim.com" target="_blank" rel="noopener noreferrer">
            <Image
              src="/klogo.png"
              alt="KÜRKAYA WEB TASARIM VE YAZILIM HİZMETLERİ"
              quality={100}
              width={700}
              height={700}
              className="w-60 md:w-40 object-cover"
            />
          </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-800 bg-black">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="flex min-h-[40px] w-full items-center justify-start md:max-w-[55%]">
            <Image
              src="/odemekanal1.png"
              alt="Kabul edilen ödeme yöntemleri"
              width={420}
              height={48}
              className="h-9 w-auto max-w-full object-contain object-left sm:h-10 md:h-11"
            />
          </div>

          <div className="flex w-full items-center justify-end gap-4 md:w-auto md:shrink-0">
            <div className="flex min-h-[40px] items-center">
              <Image
                src="/odemekanal2.png"
                alt="Güvenli ödeme"
                width={280}
                height={48}
                className="h-9 w-auto max-w-[min(100%,220px)] object-contain object-right sm:h-10 md:h-11"
              />
            </div>
            <button
              type="button"
              onClick={scrollTop}
              aria-label="Yukarı çık"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 transition hover:border-[#ddb1bd] hover:text-white"
            >
              <FaChevronUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <WhatsAppButton />
    </footer>
  )
}
