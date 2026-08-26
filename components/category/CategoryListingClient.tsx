"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { FaHeart, FaRegHeart } from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"

interface Product {
  id: string
  slug: string
  name: string
  basePrice: number
  compareAtPrice?: number | null
  images: { url: string }[]
  variants: { price: number; stock: number }[]
}

interface CategoryListingClientProps {
  products: Product[]
  view: "grid2" | "grid4"
}

const formatPrice = (value: number) => {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  }
}

export function CategoryListingClient({ products, view }: CategoryListingClientProps) {
  const [favoriteIds, setFavoriteIds] = useState<number[]>([])
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.favorites) {
          setFavoriteIds(
            (d.user.favorites as Array<{ productId: number }>).map((f) => f.productId)
          )
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2500)
    return () => window.clearTimeout(t)
  }, [toast])

  const toggleFavorite = async (
    e: React.MouseEvent<HTMLButtonElement>,
    rawProductId: string
  ) => {
    e.preventDefault()
    e.stopPropagation()

    const productId = Number(rawProductId)
    if (!Number.isFinite(productId)) {
      setToast({ msg: "Bu ürün favorilere eklenemedi.", ok: false })
      return
    }

    try {
      const res = await fetch("/api/favorites/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setToast({ msg: data.message || "Favori işlemi başarısız.", ok: false })
        return
      }
      setFavoriteIds((prev) =>
        data.isFavorite ? [...prev, productId] : prev.filter((id) => id !== productId)
      )
      setToast({ msg: data.message || "Favoriler güncellendi.", ok: true })
    } catch {
      setToast({ msg: "Bağlantı hatası.", ok: false })
    }
  }

  return (
    <>
      <motion.div
        layout
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={`grid gap-x-4 gap-y-10 transition-all duration-500 ${
          view === "grid2"
            ? "grid-cols-2"
            : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
        }`}
      >
        <AnimatePresence mode="popLayout">
          {products.map((product) => {
            const basePrice = Number(product.basePrice)
            const compareAtPrice = product.compareAtPrice ? Number(product.compareAtPrice) : null

            // Admin convention: compareAtPrice is the discounted price if it's lower than basePrice
            const hasDiscount = compareAtPrice !== null && compareAtPrice < basePrice
            const displayPrice = hasDiscount ? compareAtPrice : basePrice
            const oldPrice = hasDiscount ? basePrice : null
            const discountPct = hasDiscount ? Math.round(((basePrice - compareAtPrice) / basePrice) * 100) : 0

            const productId = Number(product.id)
            const isFavorite = Number.isFinite(productId) && favoriteIds.includes(productId)

            return (
              <motion.div
                layout
                key={product.id}
                variants={itemVariants}
                whileHover={{ y: -5 }}
                className="group flex flex-col"
              >
                <Link href={`/products/${product.slug}`} className="block">
                  <div className="relative aspect-4/5 overflow-hidden rounded-sm border border-zinc-100 bg-zinc-50 shadow-sm">
                    <Image
                      src={product.images[0]?.url ?? "/urunler/urun1.jpg"}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    
                    {hasDiscount && (
                      <div className="absolute left-3 top-3 z-10 rounded-full bg-[#6f8f73] px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                        %{discountPct} İndirim
                      </div>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      className={`absolute right-3 top-3 z-10 transition-colors ${
                        isFavorite ? "text-rose-500" : "text-zinc-300 hover:text-rose-400"
                      }`}
                      onClick={(e) => void toggleFavorite(e, product.id)}
                      aria-label={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
                    >
                      {isFavorite ? <FaHeart className="h-5 w-5" /> : <FaRegHeart className="h-5 w-5" />}
                    </motion.button>

                    {/* Quick view overlay on hover */}
                    <div className="absolute inset-x-0 bottom-0 hidden translate-y-full bg-white/90 p-3 backdrop-blur-sm transition-transform duration-300 group-hover:translate-y-0 md:block">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Hızlı Bakış</span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col items-center px-2 text-center">
                    <h3 className="line-clamp-2 text-[13px] font-medium text-zinc-700 transition-colors group-hover:text-[#6f8f73]">
                      {product.name}
                    </h3>
                    <div className="mt-1 flex flex-col items-center gap-0">
                      {hasDiscount && (
                        <span className="text-[12px] text-zinc-400 line-through">
                          ₺{formatPrice(Number(oldPrice))}
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-[15px] font-bold text-zinc-900">
                        <span className="text-[14px] text-[#6f8f73]">₺</span>
                        {formatPrice(Number(displayPrice))}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>


      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 10, x: "-50%" }}
            className={`fixed bottom-6 left-1/2 z-100 rounded-full px-4 py-2 text-[12px] font-semibold text-white shadow-lg ${
              toast.ok ? "bg-emerald-600" : "bg-rose-600"
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
