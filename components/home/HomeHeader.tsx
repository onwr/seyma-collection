"use client"

import Image from "next/image"
import Link from "next/link"
import { FaSearch, FaShoppingBag, FaTimes, FaChevronRight, FaChevronDown } from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect, useRef, useCallback, startTransition } from "react"
import { HeaderAuthNav } from "@/components/home/HeaderAuthNav"
import { HeaderCartCount } from "@/components/home/HeaderCartCount"
import { CartDrawer } from "@/components/cart/CartDrawer"

type HeaderNavLink = {
  id: number
  label: string
  href: string
  labelUppercase: boolean
  openInNewTab: boolean
  children?: Array<{
    label: string
    href: string
    openInNewTab?: boolean
  }>
}

interface SearchResult {
  id: number
  name: string
  slug: string
  basePrice: number
  images: { url: string }[]
  variants: { price: number }[]
}

// ── Stagger variants ──────────────────────────────────────────────────────────
const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}
const itemVariants = {
  hidden: { opacity: 0, x: -6 },
  show: { opacity: 1, x: 0, transition: { duration: 0.2 } },
}

const megaMenuVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.22, ease: "anticipate" as const },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.98,
    transition: { duration: 0.15, ease: "easeIn" as const },
  },
}

export function HomeHeader() {
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [isSearchLoading, setIsSearchLoading] = useState(false)
  const [activeMenu, setActiveMenu] = useState<number | null>(null)
  const [navItems, setNavItems] = useState<HeaderNavLink[]>([])
  const [navLoading, setNavLoading] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const [announcements, setAnnouncements] = useState<string[]>([])
  const [announcementsLoaded, setAnnouncementsLoaded] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const menuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── scroll shadow ──────────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // ── load nav (yalnızca panelden / DB’den; mock yok) ───────────────────────
  useEffect(() => {
    let cancelled = false
    const loadNav = async () => {
      try {
        const res = await fetch("/api/navigation")
        const data = await res.json()
        if (!cancelled && Array.isArray(data?.items)) {
          setNavItems(data.items)
        }
      } catch {
        if (!cancelled) setNavItems([])
      } finally {
        if (!cancelled) setNavLoading(false)
      }
    }
    void loadNav()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadAnnouncements = async () => {
      try {
        const res = await fetch("/api/navigation/announcements")
        const data = await res.json()
        if (!cancelled && Array.isArray(data?.items)) {
          setAnnouncements(data.items)
        }
      } catch {
        if (!cancelled) setAnnouncements([])
      } finally {
        if (!cancelled) setAnnouncementsLoaded(true)
      }
    }
    void loadAnnouncements()
    return () => {
      cancelled = true
    }
  }, [])

  // ── search debounce ────────────────────────────────────────────────────────
  useEffect(() => {
    if (query.length < 2) {
      startTransition(() => {
        setResults([])
      })
      return
    }
    startTransition(() => {
      setIsSearchLoading(true)
    })
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.products || [])
      } catch { /* ignore */ }
      finally { setIsSearchLoading(false) }
    }, 280)
    return () => clearTimeout(t)
  }, [query])

  // ── click outside search ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowSearch(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // ── menu hover helpers ─────────────────────────────────────────────────────
  const handleMenuEnter = useCallback((id: number) => {
    if (menuTimerRef.current) clearTimeout(menuTimerRef.current)
    setActiveMenu(id)
  }, [])

  const handleMenuLeave = useCallback(() => {
    menuTimerRef.current = setTimeout(() => setActiveMenu(null), 120)
  }, [])

  return (
    <>
      <div className="sticky top-0 z-50 w-full">
        <AnimatePresence initial={false}>
          {announcementsLoaded && announcements.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="bg-[#813d50] rounded-b-xl py-2 overflow-hidden"
            >
              <style>{`
                @keyframes marquee {
                  0%   { transform: translateX(0); }
                  100% { transform: translateX(-50%); }
                }
                .marquee-track {
                  display: flex;
                  width: max-content;
                  animation: marquee 28s linear infinite;
                }
                .marquee-track:hover { animation-play-state: paused; }
              `}</style>
              {announcements.length === 1 ? (
                <div className="flex items-center justify-center px-4">
                  <span className="text-[11px] font-medium tracking-[0.14em] uppercase text-[#ecdadf] whitespace-nowrap">
                    {announcements[0]}
                  </span>
                </div>
              ) : (
                <div className="marquee-track">
                  {[...announcements, ...announcements].map((text, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-5 px-3 text-[11px] font-medium tracking-[0.14em] uppercase text-[#ecdadf] whitespace-nowrap"
                    >
                      {text}
                      <span className="h-0.5 w-0.5 rounded-full bg-[#ecdadf]/40" />
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <header
          className={`w-full bg-white transition-shadow duration-300 ${
            scrolled ? "shadow-[0_1px_24px_rgba(0,0,0,0.08)]" : "shadow-none"
          }`}
        >
        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <div className="w-full px-5 md:px-10">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3 py-3 md:h-32 md:flex-nowrap md:gap-6 md:py-0">
            <Link href="/" className="order-1 shrink-0 md:order-1">
              <motion.div
                whileHover={{ opacity: 0.82 }}
                transition={{ duration: 0.2 }}
              >
                <Image
                  src="/logo2.png"
                  alt="Şeyma Collection"
                  width={150}
                  height={52}
                  priority
                  className="h-11 w-auto rounded-md object-contain md:h-24 md:rounded-lg"
                  sizes="(max-width: 768px) 88px, 150px"
                />
              </motion.div>
            </Link>

            {/* Search — mobilde tam satır (alta); md+ ortada genişler */}
            <div
              className="relative z-60 order-3 w-full min-w-0 basis-full shrink-0 md:order-2 md:max-w-lg md:flex-1 md:basis-auto"
              ref={searchRef}
            >
              <form action="/search" method="GET">
                <div className="relative flex items-center">
                  <FaSearch className="pointer-events-none absolute left-4 z-10 h-3.5 w-3.5 text-[#813d50]" />
                  <input
                    type="text"
                    name="q"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setShowSearch(true) }}
                    onFocus={() => setShowSearch(true)}
                    placeholder="Ürün, kategori veya marka ara…"
                    autoComplete="off"
                    className="h-11 w-full rounded-full border border-[#e6ced5] bg-[#f9f3f5] pl-10 pr-10 text-[13px] text-zinc-800 placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-[#813d50] focus:bg-white focus:shadow-[0_0_0_3px_rgba(122,156,126,0.12)]"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => { setQuery(""); setResults([]) }}
                      className="absolute right-4 text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      <FaTimes className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </form>

              {/* ── Search dropdown ──────────────────────────────────────── */}
              <AnimatePresence>
                {showSearch && query.length >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: "anticipate" }}
                        className="absolute left-0 right-0 top-[calc(100%+10px)] z-70 overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]"
                  >
                    {isSearchLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <div className="h-5 w-5 animate-spin rounded-full border-[2.5px] border-zinc-200 border-t-[#813d50]" />
                      </div>
                    ) : results.length > 0 ? (
                      <div>
                        <div className="px-5 pt-4 pb-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                            Önerilen Ürünler
                          </p>
                        </div>
                        <ul>
                          {results.map((product) => (
                            <li key={product.id}>
                              <Link
                                href={`/products/${product.slug}`}
                                onClick={() => setShowSearch(false)}
                                className="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-[#fbf6f8]"
                              >
                                <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50">
                                  <Image
                                    src={product.images[0]?.url || "/urunler/urun1.jpg"}
                                    alt={product.name}
                                    fill
                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="truncate text-[13px] font-medium text-zinc-800 group-hover:text-[#813d50] transition-colors">
                                    {product.name}
                                  </p>
                                  <p
                                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                                    className="text-base font-semibold text-[#813d50]"
                                  >
                                    ₺{(Number(product.variants[0]?.price ?? product.basePrice)).toFixed(2)}
                                  </p>
                                </div>
                                <FaChevronRight className="h-3 w-3 shrink-0 text-zinc-300 group-hover:text-[#813d50] transition-colors" />
                              </Link>
                            </li>
                          ))}
                        </ul>
                        <div className="border-t border-zinc-50 px-5 py-3">
                          <Link
                            href={`/search?q=${encodeURIComponent(query)}`}
                            onClick={() => setShowSearch(false)}
                            className="flex items-center justify-between text-[12px] font-semibold text-[#813d50] hover:text-[#813d50] transition-colors"
                          >
                            <span>&quot;{query}&quot; için tüm sonuçlar</span>
                            <FaChevronRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="py-10 text-center">
                        <div className="mb-2 text-3xl">🔍</div>
                        <p className="text-sm font-medium text-zinc-400">
                          &quot;{query}&quot; için sonuç bulunamadı
                        </p>
                        <p className="mt-1 text-xs text-zinc-300">Farklı bir arama yapmayı deneyin</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right actions — mobilde logonun karşısı (order-2); md sağ */}
            <div className="order-2 flex shrink-0 items-center gap-2 md:order-3 md:gap-3">
              <HeaderAuthNav />

              {/* Cart button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="group relative flex items-center gap-2.5 rounded-full border border-[#e6ced5] bg-[#f9f3f5] px-4 py-2.5 transition-all duration-200 hover:border-[#813d50] hover:bg-white hover:shadow-[0_4px_16px_rgba(61,92,66,0.12)]"
              >
                <FaShoppingBag className="h-4 w-4 text-[#813d50]" />
                <span className="hidden md:block text-[12px] font-semibold uppercase tracking-widest text-[#813d50]">
                  Sepet
                </span>
                <HeaderCartCount />
              </button>
            </div>
          </div>
        </div>

        {/* ── Category nav ─────────────────────────────────────────────────── */}
        <nav
          aria-label="Kategoriler"
          aria-busy={navLoading}
          className="relative z-40 border-t border-[#eddbe0] overflow-visible"
        >
          <div className="w-full px-5 md:px-10">
            <ul className="flex items-center overflow-x-auto md:overflow-visible md:overflow-y-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {navLoading ? (
                <>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <li key={`nav-skel-${i}`} className="shrink-0 px-4 py-4" aria-hidden>
                      <span
                        className="inline-block h-3 animate-pulse rounded-full bg-zinc-200/90"
                        style={{ width: `${64 + (i % 4) * 12}px` }}
                      />
                    </li>
                  ))}
                </>
              ) : (
                navItems.map((item) => (
                <li
                  key={item.id}
                  className="relative shrink-0"
                  onMouseEnter={() => item.children?.length ? handleMenuEnter(item.id) : undefined}
                  onMouseLeave={handleMenuLeave}
                >
                  <Link
                    href={item.href}
                    target={item.openInNewTab ? "_blank" : undefined}
                    rel={item.openInNewTab ? "noopener noreferrer" : undefined}
                    onClick={(e) => {
                      if (item.children?.length) {
                        // Mobilde menünün açılması için durumu güncelliyoruz ancak yönlendirmeyi (navigate) iptal etmiyoruz
                        setActiveMenu((prev) => (prev === item.id ? null : item.id))
                      }
                    }}
                    className={`
                      group relative flex items-center gap-1 px-4 py-4 text-[12px] font-medium
                      tracking-widest text-zinc-600 transition-colors duration-150
                      hover:text-[#813d50]
                      ${item.labelUppercase ? "uppercase" : ""}
                      ${activeMenu === item.id ? "text-[#813d50]" : ""}
                    `}
                  >
                    {item.label}
                    {item.children?.length ? (
                      <FaChevronDown
                        className={`ml-0.5 h-2.5 w-2.5 transition-transform duration-200 ${
                          activeMenu === item.id ? "rotate-180" : "group-hover:rotate-180"
                        }`}
                      />
                    ) : null}
                    {/* underline */}
                    <span
                      className={`absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-[#813d50] transition-transform duration-200 origin-left ${
                        activeMenu === item.id ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                      }`}
                    />
                  </Link>

                  {/* ── Mega / dropdown menu ─────────────────────────────── */}
                  <AnimatePresence>
                    {activeMenu === item.id && item.children && item.children.length > 0 && (
                      <motion.div
                        variants={megaMenuVariants}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        onMouseEnter={() => handleMenuEnter(item.id)}
                        onMouseLeave={handleMenuLeave}
                        className="absolute left-0 top-full z-50 pt-0 min-w-full w-max"
                      >
                        {/* subtle top connector so hover doesn't break */}
                        <div className="h-1" />
                        <div className="overflow-hidden rounded-2xl border border-[#ebd7dd] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.10)]">
                          {/* header stripe */}
                          <div className="h-1 bg-linear-to-r from-[#813d50] via-[#b56179] to-[#813d50]" />
                          <motion.ul
                            variants={listVariants}
                            initial="hidden"
                            animate="show"
                            className="p-2 min-w-[240px]"
                          >
                            {item.children.map((child, ci) => (
                              <motion.li key={ci} variants={itemVariants}>
                                <Link
                                  href={child.href}
                                  target={child.openInNewTab ? "_blank" : undefined}
                                  rel={child.openInNewTab ? "noopener noreferrer" : undefined}
                                  onClick={() => setActiveMenu(null)}
                                  className="group/child flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-[13px] font-medium text-zinc-600 transition-all hover:bg-[#f9f3f5] hover:text-[#813d50]"
                                >
                                  <span>{child.label}</span>
                                  <FaChevronRight className="h-2.5 w-2.5 opacity-0 transition-all group-hover/child:opacity-100 group-hover/child:translate-x-0.5" />
                                </Link>
                              </motion.li>
                            ))}
                          </motion.ul>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
                ))
              )
              }
            </ul>
          </div>
        </nav>
        </header>
      </div>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  )
}