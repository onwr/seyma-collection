"use client"

import { useState, useEffect, startTransition } from "react"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  FaChartPie,
  FaClipboardList,
  FaTshirt,
  FaTags,
  FaSignOutAlt,
  FaUsers,
  FaTicketAlt,
  FaStar,
  FaChartLine,
  FaImage,
  FaTruck,
  FaEnvelope,
  FaHome,
  FaLayerGroup,
  FaBars,
  FaChevronDown,
  FaShoppingBag,
  FaQuestionCircle,
  FaShareAlt,
  FaHistory,
  FaTimes,
  FaPhoneAlt,
  FaSync,
  FaCreditCard,
} from "react-icons/fa"
import {
  HOME_TAB_KEYS,
  HOME_TAB_LABELS,
  adminHomepageHref,
  parseHomeTabParam,
  type HomeTabKey,
} from "@/lib/adminHomepageTabs"

type NavItem = {
  label: string
  href: string
  icon: React.ReactNode
  badge?: number
}

const HOME_SIDEBAR_TAB_ICONS: Record<HomeTabKey, React.ReactNode> = {
  sliders: <FaImage />,
  banners: <FaLayerGroup />,
  categories: <FaTags />,
  products: <FaTshirt />,
  sections: <FaShoppingBag />,
}

const NAV_SECTIONS_MAIN: { title: string; items: NavItem[] }[] = [
  {
    title: "Genel",
    items: [
      { label: "Dashboard", href: "/admin", icon: <FaChartPie /> },
      { label: "Raporlar", href: "/admin/reports", icon: <FaChartLine /> },
    ],
  },
  {
    title: "Mağaza",
    items: [
      { label: "Siparişler", href: "/admin/orders", icon: <FaClipboardList />, badge: 18 },
      { label: "Ürünler", href: "/admin/products", icon: <FaTshirt /> },
      { label: "Kategoriler", href: "/admin/categories", icon: <FaTags /> },
      { label: "Müşteriler", href: "/admin/customers", icon: <FaUsers /> },
      { label: "Kuponlar", href: "/admin/coupons", icon: <FaTicketAlt /> },
      { label: "Yorumlar", href: "/admin/reviews", icon: <FaStar /> },
    ],
  },
]

const NAV_SECTIONS_SYSTEM: { title: string; items: NavItem[] }[] = [
  {
    title: "Sistem",
    items: [
      { label: "Kargo", href: "/admin/shipping", icon: <FaTruck /> },
      { label: "Telefonla Sipariş", href: "/admin/phone-order", icon: <FaPhoneAlt /> },
      { label: "Trendyol", href: "/admin/trendyol", icon: <FaSync /> },
      { label: "E-posta (SMTP)", href: "/admin/smtp", icon: <FaEnvelope /> },
      { label: "PayTR", href: "/admin/paytr", icon: <FaCreditCard /> },
      { label: "İşlem günlüğü", href: "/admin/activity-log", icon: <FaHistory /> },
    ],
  },
]

const CONTENT_MENUS_ITEM: NavItem = {
  label: "Menüler",
  href: "/admin/menus",
  icon: <FaBars />,
}

export function AdminSidebar({
  userEmail,
  isOpen,
  onClose
}: {
  userEmail: string
  isOpen?: boolean
  onClose?: () => void
}) {
  const [pendingCount, setPendingCount] = useState(0)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const onHomepage = pathname.startsWith("/admin/homepage")
  const currentHomeTab = parseHomeTabParam(searchParams.get("tab"))
  const [homepageOpen, setHomepageOpen] = useState(onHomepage)

  useEffect(() => {
    if (onHomepage) {
      startTransition(() => {
        setHomepageOpen(true)
      })
    }
  }, [onHomepage])

  useEffect(() => {
    // Fetch stats for badges
    fetch("/api/admin/stats")
      .then(r => r.json())
      .then(d => setPendingCount(d.pendingOrders || 0))
      .catch(() => { })
  }, [])

  // Close sidebar on path change (mobile)
  useEffect(() => {
    if (onClose) onClose()
  }, [pathname])

  const menusActive =
    pathname === CONTENT_MENUS_ITEM.href ||
    (CONTENT_MENUS_ITEM.href !== "/admin" &&
      pathname.startsWith(CONTENT_MENUS_ITEM.href))

  const faqsActive = pathname === "/admin/faqs" || pathname.startsWith("/admin/faqs/")
  const footerSocialActive = pathname === "/admin/footer-social"

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  // İki harf baş harf avatarı
  const initials = userEmail
    .split("@")[0]
    .split(/[._-]/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("")

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col bg-white border-r border-zinc-100 transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>

        {/* ── Logo / Marka ─────────────────────────── */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 shrink-0 rounded-xl overflow-hidden bg-[#813d50]/10 flex items-center justify-center">
              <Image
                src="/logo.jpeg"
                alt="Şeyma Collection"
                fill
                className="object-contain"
              />
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-[13px] font-bold text-zinc-800 truncate">Şeyma Collection</p>
              <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">Admin Panel</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-thin">
          {NAV_SECTIONS_MAIN.map((section) => (
            <div key={section.title}>
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                {section.title}
              </p>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/admin" && pathname.startsWith(item.href))

                  const badgeCount = item.label === "Siparişler" ? pendingCount : item.badge

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                      group flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all
                      ${isActive
                          ? "bg-[#813d50]/10 text-[#813d50]"
                          : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                        }
                    `}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-[15px] shrink-0 transition-colors
                        ${isActive ? "text-[#813d50]" : "text-zinc-300 group-hover:text-zinc-500"}`}>
                          {item.icon}
                        </span>
                        {item.label}
                      </div>

                      {badgeCount ? (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full leading-none
                                       ${isActive ? "bg-[#813d50] text-white" : "bg-zinc-100 text-zinc-500"}`}>
                          {badgeCount}
                        </span>
                      ) : isActive ? (
                        <div className="h-1.5 w-1.5 rounded-full bg-[#813d50]" />
                      ) : null}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}

          {/* İçerik: Anasayfa açılır menü + Menüler */}
          <div>
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
              İçerik
            </p>
            <div className="space-y-1">
              <button
                type="button"
                aria-expanded={homepageOpen}
                onClick={() => setHomepageOpen((o) => !o)}
                className={`
                group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-all
                ${onHomepage
                    ? "bg-[#813d50]/10 text-[#813d50]"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                  }
              `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`text-[15px] shrink-0 transition-colors ${onHomepage ? "text-[#813d50]" : "text-zinc-300 group-hover:text-zinc-500"
                      }`}
                  >
                    <FaHome />
                  </span>
                  <span className="truncate">Anasayfa</span>
                </div>
                <FaChevronDown
                  className={`text-[10px] shrink-0 text-zinc-400 transition-transform duration-200 ${homepageOpen ? "rotate-180" : ""
                    }`}
                />
              </button>

              {homepageOpen && (
                <div className="mt-1 space-y-0.5 border-l-2 border-zinc-100 ml-4 pl-2">
                  {HOME_TAB_KEYS.map((tab) => {
                    const href = adminHomepageHref(tab)
                    const subActive = onHomepage && currentHomeTab === tab
                    return (
                      <Link
                        key={tab}
                        href={href}
                        className={`
                        group flex items-center justify-between rounded-lg px-2.5 py-2 text-[12px] font-medium transition-all
                        ${subActive
                            ? "bg-[#813d50]/10 text-[#813d50]"
                            : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                          }
                      `}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`text-[13px] shrink-0 ${subActive ? "text-[#813d50]" : "text-zinc-300 group-hover:text-zinc-500"
                              }`}
                          >
                            {HOME_SIDEBAR_TAB_ICONS[tab]}
                          </span>
                          <span className="truncate">{HOME_TAB_LABELS[tab]}</span>
                        </div>
                        {subActive ? <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#813d50]" /> : null}
                      </Link>
                    )
                  })}
                </div>
              )}

              <Link
                href={CONTENT_MENUS_ITEM.href}
                className={`
                group flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all
                ${menusActive ? "bg-[#813d50]/10 text-[#813d50]" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"}
              `}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[15px] shrink-0 transition-colors ${menusActive ? "text-[#813d50]" : "text-zinc-300 group-hover:text-zinc-500"
                      }`}
                  >
                    {CONTENT_MENUS_ITEM.icon}
                  </span>
                  {CONTENT_MENUS_ITEM.label}
                </div>
                {menusActive ? <div className="h-1.5 w-1.5 rounded-full bg-[#813d50]" /> : null}
              </Link>

              <Link
                href="/admin/faqs"
                className={`
                group flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all
                ${faqsActive ? "bg-[#813d50]/10 text-[#813d50]" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"}
              `}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[15px] shrink-0 transition-colors ${faqsActive ? "text-[#813d50]" : "text-zinc-300 group-hover:text-zinc-500"
                      }`}
                  >
                    <FaQuestionCircle />
                  </span>
                  SSS
                </div>
                {faqsActive ? <div className="h-1.5 w-1.5 rounded-full bg-[#813d50]" /> : null}
              </Link>

              <Link
                href="/admin/footer-social"
                className={`
                group flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all
                ${footerSocialActive ? "bg-[#813d50]/10 text-[#813d50]" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"}
              `}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[15px] shrink-0 transition-colors ${footerSocialActive ? "text-[#813d50]" : "text-zinc-300 group-hover:text-zinc-500"
                      }`}
                  >
                    <FaShareAlt />
                  </span>
                  Sosyal Medya
                </div>
                {footerSocialActive ? <div className="h-1.5 w-1.5 rounded-full bg-[#813d50]" /> : null}
              </Link>
            </div>
          </div>

          {NAV_SECTIONS_SYSTEM.map((section) => (
            <div key={section.title}>
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                {section.title}
              </p>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/admin" && pathname.startsWith(item.href))

                  const badgeCount = item.label === "Siparişler" ? pendingCount : item.badge

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                      group flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all
                      ${isActive
                          ? "bg-[#813d50]/10 text-[#813d50]"
                          : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                        }
                    `}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-[15px] shrink-0 transition-colors
                        ${isActive ? "text-[#813d50]" : "text-zinc-300 group-hover:text-zinc-500"}`}>
                          {item.icon}
                        </span>
                        {item.label}
                      </div>

                      {badgeCount ? (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full leading-none
                                       ${isActive ? "bg-[#813d50] text-white" : "bg-zinc-100 text-zinc-500"}`}>
                          {badgeCount}
                        </span>
                      ) : isActive ? (
                        <div className="h-1.5 w-1.5 rounded-full bg-[#813d50]" />
                      ) : null}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-zinc-100 p-4 space-y-3">
          {/* Kullanıcı satırı */}
          <div className="flex items-center gap-3 px-1 py-1">
            <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-900 flex items-center justify-center
                          text-[11px] font-bold text-white shadow-sm">
              {initials || "?"}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-zinc-800 truncate leading-tight">
                {userEmail.split("@")[0]}
              </p>
              <p className="text-[10px] font-medium text-zinc-400 truncate leading-tight">{userEmail}</p>
            </div>
          </div>

          {/* Çıkış butonu */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5
                     text-[12px] font-bold text-zinc-500 hover:bg-rose-50 hover:text-rose-600
                     transition-all border border-transparent hover:border-rose-100"
          >
            <FaSignOutAlt className="text-[12px]" />
            Çıkış Yap
          </button>
        </div>
      </aside>
    </>
  )
}