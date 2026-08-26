"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useRef, useState, useEffect } from "react"
import { FaChevronLeft, FaChevronRight, FaRegHeart, FaHeart, FaShoppingBag } from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"
import { dispatchCartUpdated } from "@/lib/cartEvents"
import { registerHrefWithCallbackUrl } from "@/lib/safeCallbackUrl"

interface Product {
  id: number
  name: string
  slug: string
  basePrice: string | number
  compareAtPrice?: string | number
  images: { url: string; isCover: boolean }[]
  isNew?: boolean
  category?: { name: string }
}

// ── Toast bildirimi ────────────────────────────────────────────────────────────
function Toast({ message, ok }: { message: string; ok: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, x: "-50%" }}
      animate={{ opacity: 1, y: 0, x: "-50%" }}
      exit={{ opacity: 0, y: -8, x: "-50%" }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="fixed bottom-8 left-1/2 z-50 flex items-center gap-2.5 rounded-full
                 px-5 py-3 text-[12.5px] font-medium shadow-xl backdrop-blur-sm"
      style={{
        background: ok ? "rgba(79, 111, 82, 0.95)" : "rgba(239, 68, 68, 0.95)",
        color: "white",
      }}
    >
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px]"
      >
        {ok ? "✓" : "✕"}
      </span>
      {message}
    </motion.div>
  )
}

// ── Ürün kartı ────────────────────────────────────────────────────────────────
function ProductCard({
  product,
  isFavorite,
  isAdding,
  onAddToCart,
  onToggleFavorite,
}: {
  product: Product
  isFavorite: boolean
  isAdding: boolean
  onAddToCart: (e: React.MouseEvent) => void
  onToggleFavorite: (e: React.MouseEvent) => void
}) {
  const coverImage =
    product.images.find(img => img.isCover)?.url ??
    product.images[0]?.url ??
    "/logo.jpeg"

  const basePrice = Number(product.basePrice)
  const compareAtPrice = product.compareAtPrice ? Number(product.compareAtPrice) : null

  const hasDiscount =
    compareAtPrice !== null &&
    compareAtPrice < basePrice

  const discountPct = hasDiscount
    ? Math.round(((basePrice - compareAtPrice) / basePrice) * 100)
    : 0

  const displayPrice = hasDiscount ? compareAtPrice : basePrice
  const oldPrice = hasDiscount ? basePrice : null

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      className="group/card relative flex w-[calc((100%-1rem)/3)] shrink-0 flex-col overflow-hidden
                 rounded-2xl border border-zinc-100 bg-white shadow-sm transition-shadow duration-300
                 hover:shadow-lg select-none sm:w-44 md:w-[190px] lg:w-[210px]"
    >
      {/* ── Görsel alanı ── */}
      <div className="relative overflow-hidden bg-zinc-50" style={{ aspectRatio: "3/4" }}>
        <Link
          href={`/products/${product.slug}`}
          className="absolute inset-0 z-10 select-none"
          draggable={false}
        >
          <Image
            src={coverImage}
            alt={product.name}
            fill
            draggable={false}
            sizes="(max-width: 639px) 33vw, 210px"
            className="pointer-events-none select-none object-cover transition-transform duration-700 ease-out
                       group-hover/card:scale-[1.06]"
            style={{ WebkitTouchCallout: "none" }}
          />
        </Link>

        {/* Rozetler */}
        <div className="absolute left-3 top-3 z-20 flex flex-col gap-1.5">
          {product.isNew && (
            <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[10px] font-semibold text-white">
              Yeni
            </span>
          )}
          {hasDiscount && discountPct > 0 && (
            <span className="rounded-full bg-[#4f6f52] px-2.5 py-1 text-[10px] font-semibold text-white">
              %{discountPct} İndirim
            </span>
          )}
        </div>

        {/* Favori butonu */}
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
          className={`absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center
                      rounded-full border shadow-md backdrop-blur-sm transition-all duration-200
                      ${isFavorite
              ? "border-rose-100 bg-rose-50 text-rose-500"
              : "border-white/30 bg-white/70 text-zinc-400 hover:bg-white hover:text-rose-400"}`}
        >
          {isFavorite
            ? <FaHeart className="h-3.5 w-3.5" />
            : <FaRegHeart className="h-3.5 w-3.5" />}
        </button>

        {/* Sepete ekle — hover'da çıkar */}
        <div className="absolute inset-x-0 bottom-0 z-20 translate-y-full transition-transform
                        duration-300 ease-out group-hover/card:translate-y-0">
          <button
            type="button"
            disabled={isAdding}
            onClick={onAddToCart}
            className="flex w-full items-center justify-center gap-2.5 bg-zinc-900 py-3.5
                       text-[11.5px] font-medium text-white transition-colors hover:bg-[#4f6f52]
                       disabled:opacity-60"
          >
            {isAdding ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border border-white/30 border-t-white" />
            ) : (
              <FaShoppingBag className="h-3 w-3" />
            )}
            {isAdding ? "Ekleniyor..." : "Sepete Ekle"}
          </button>
        </div>
      </div>

      {/* ── Bilgi alanı ── */}
      <div className="flex flex-1 flex-col p-2.5 sm:p-4">
        {product.category && (
          <p className="mb-0.5 truncate text-[9px] text-zinc-400 sm:mb-1 sm:text-[11px]">
            {product.category.name}
          </p>
        )}

        <Link
          href={`/products/${product.slug}`}
          className="group/name mb-2 block flex-1 select-none sm:mb-3"
          draggable={false}
        >
          <h3 className="line-clamp-2 text-[11px] font-medium leading-snug text-zinc-800 transition-colors
                         group-hover/name:text-[#4f6f52] sm:text-[13.5px]">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-baseline justify-between gap-1">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-zinc-900 sm:text-[15px]">
              ₺{displayPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {hasDiscount && (
              <p className="text-[10px] text-zinc-400 line-through sm:text-[12px]">
                ₺{oldPrice?.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>

          <Link
            href={`/products/${product.slug}`}
            className="hidden items-center gap-1 text-[11px] font-medium text-[#4f6f52] opacity-0
                       transition-opacity group-hover/card:opacity-100 sm:flex"
          >
            İncele <FaChevronRight className="h-2.5 w-2.5" />
          </Link>
        </div>
      </div>
    </motion.article>
  )
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────
export function HomeProductsSection({
  title,
  subtitle,
  products = [],
  viewAllHref,
}: {
  title: string
  subtitle?: string
  products?: Product[]
  viewAllHref?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [addingId, setAddingId] = useState<number | null>(null)
  const [favoriteIds, setFavoriteIds] = useState<number[]>([])
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const DRAG_THRESHOLD_PX = 8

  // Favori listesini çek
  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (d.user?.favorites) {
          setFavoriteIds(
            (d.user.favorites as Array<{ productId: number }>).map((f) => f.productId)
          )
        }
      })
      .catch(() => { })
  }, [])

  // Toast otomatik kapatma
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // Scroll pozisyonunu izle → ok butonlarını göster/gizle
  const syncScrollState = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 16)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 16)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", syncScrollState, { passive: true })
    syncScrollState()
    return () => el.removeEventListener("scroll", syncScrollState)
  }, [])

  const scroll = (dir: "prev" | "next") => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: el.clientWidth * 0.8 * (dir === "next" ? 1 : -1), behavior: "smooth" })
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.closest("button")) return
    const el = scrollRef.current
    if (!el) return

    const session = {
      startX: e.clientX,
      startScrollLeft: el.scrollLeft,
      hasDragged: false,
    }

    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - session.startX
      if (!session.hasDragged && Math.abs(delta) > DRAG_THRESHOLD_PX) {
        session.hasDragged = true
      }
      if (session.hasDragged) {
        ev.preventDefault()
        el.scrollLeft = session.startScrollLeft - delta
      }
    }

    const onEnd = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onEnd)
      window.removeEventListener("pointercancel", onEnd)
      if (session.hasDragged) {
        const blockClick = (ce: MouseEvent) => {
          ce.preventDefault()
          ce.stopPropagation()
          document.removeEventListener("click", blockClick, true)
        }
        document.addEventListener("click", blockClick, true)
      }
    }

    window.addEventListener("pointermove", onMove, { passive: false })
    window.addEventListener("pointerup", onEnd)
    window.addEventListener("pointercancel", onEnd)
  }

  // Sepete ekle
  const handleAddToCart = async (e: React.MouseEvent, productId: number) => {
    e.preventDefault()
    e.stopPropagation()
    setAddingId(productId)
    setToast(null)
    try {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ productId, quantity: 1 }),
      })
      const json = await res.json()
      if (res.status === 401) {
        router.push(registerHrefWithCallbackUrl(pathname))
        setToast({ msg: "Sepete eklemek için üye olmanız veya giriş yapmanız gerekir.", ok: false })
        return
      }
      if (!res.ok) throw new Error(json.message ?? "Sepete eklenemedi.")
      setToast({ msg: "Ürün sepete eklendi.", ok: true })
      dispatchCartUpdated()
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : "Sepete eklenemedi.", ok: false })
    } finally {
      setAddingId(null)
    }
  }

  // Favori toggle
  const toggleFavorite = async (e: React.MouseEvent, productId: number) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const res = await fetch("/api/favorites/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      })
      const data = await res.json()
      if (res.ok) {
        setFavoriteIds(prev =>
          data.isFavorite ? [...prev, productId] : prev.filter(id => id !== productId)
        )
        setToast({ msg: data.message, ok: true })
      } else {
        setToast({ msg: data.message ?? "İşlem başarısız.", ok: false })
      }
    } catch {
      setToast({ msg: "Bir hata oluştu.", ok: false })
    }
  }

  if (!products || products.length === 0) return null

  // Başlığı kelime başına renklendir — ikinci kelimeye vurgu
  const words = title.trim().split(/\s+/)

  return (
    <section className="relative py-5 px-4 md:px-8 lg:px-12">

      {/* ── Bölüm başlığı ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-10 flex flex-col items-center gap-2 text-center"
      >
        <h2 className="text-[28px] font-semibold leading-tight text-zinc-900 md:text-[36px]">
          {words.map((word, i) => (
            <span key={i}>
              <span className={i === 1 ? "text-[#4f6f52]" : ""}>{word}</span>
              {i < words.length - 1 && " "}
            </span>
          ))}
        </h2>

        {subtitle && (
          <p className="max-w-md text-[14px] text-zinc-500">{subtitle}</p>
        )}

        {/* Dekoratif çizgi */}
        <div className="mt-1 h-0.5 w-12 rounded-full bg-[#4f6f52]/40" />
      </motion.div>

      {/* ── Karusel kapsayıcı ─────────────────────────────────── */}
      <div className="relative">

        {/* Sol ok */}
        <AnimatePresence>
          {canScrollLeft && (
            <motion.button
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              type="button"
              onClick={() => scroll("prev")}
              className="absolute -left-4 top-1/2 z-20 hidden -translate-y-1/2 items-center
                         justify-center rounded-full border border-zinc-200 bg-white shadow-md
                         transition hover:border-[#4f6f52] hover:text-[#4f6f52] md:flex
                         h-10 w-10 text-zinc-400"
            >
              <FaChevronLeft className="h-3.5 w-3.5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Sağ ok */}
        <AnimatePresence>
          {canScrollRight && (
            <motion.button
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              type="button"
              onClick={() => scroll("next")}
              className="absolute -right-4 top-1/2 z-20 hidden -translate-y-1/2 items-center
                         justify-center rounded-full border border-zinc-200 bg-white shadow-md
                         transition hover:border-[#4f6f52] hover:text-[#4f6f52] md:flex
                         h-10 w-10 text-zinc-400"
            >
              <FaChevronRight className="h-3.5 w-3.5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Ürün şeridi */}
        <div
          ref={scrollRef}
          onPointerDown={handlePointerDown}
          className="flex touch-pan-x gap-2 overflow-x-auto pb-4 pt-2 sm:gap-4
                     [scrollbar-width:none] [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing
                     select-none [-webkit-user-drag:none]"
        >
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              isFavorite={favoriteIds.includes(product.id)}
              isAdding={addingId === product.id}
              onAddToCart={e => void handleAddToCart(e, product.id)}
              onToggleFavorite={e => void toggleFavorite(e, product.id)}
            />
          ))}

          {/* "Tümünü Gör" kapanış kartı */}
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="flex w-[calc((100%-1rem)/3)] shrink-0 flex-col items-center justify-center gap-2
                         rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 transition
                         hover:border-[#4f6f52] hover:bg-[#4f6f52]/5 select-none sm:w-44 sm:gap-3 md:w-[190px]
                         lg:w-[180px]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400">
                <FaChevronRight className="h-3.5 w-3.5" />
              </div>
              <span className="text-center text-[12px] font-medium text-zinc-500 px-4 leading-snug">
                Tümünü Gör
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* ── Alt link ──────────────────────────────────────────── */}
      {viewAllHref && (
        <div className="mt-8 flex justify-center">
          <Link
            href={viewAllHref}
            className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white
                       px-6 py-2.5 text-[13px] font-medium text-zinc-600 shadow-sm
                       transition hover:border-[#4f6f52] hover:text-[#4f6f52]"
          >
            Tüm Ürünleri Gör
            <FaChevronRight className="h-2.5 w-2.5" />
          </Link>
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && <Toast message={toast.msg} ok={toast.ok} />}
      </AnimatePresence>
    </section>
  )
}