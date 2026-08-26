"use client"

import { motion, AnimatePresence } from "framer-motion"
import { FaTimes, FaTrash, FaMinus, FaPlus, FaShoppingCart } from "react-icons/fa"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import { CART_UPDATED_EVENT } from "@/lib/cartEvents"

interface CartLine {
  itemId: number
  productId: number
  productSlug: string
  productName: string
  imageUrl: string
  variantId: number | null
  variantName: string
  unitPrice: number
  quantity: number
  lineTotal: number
  stock: number | null
}

interface CartSummary {
  itemCount: number
  subtotal: number
  shipping: number
  grandTotal: number
}

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [summary, setSummary] = useState<CartSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  const fetchCart = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/cart")
      const data = await res.json()
      if (res.ok) {
        setLines(data.lines || [])
        setSummary(data.summary || null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch cart items when drawer opens or event is triggered
  useEffect(() => {
    if (isOpen) {
      void fetchCart()
    }
  }, [isOpen, fetchCart])

  // Listen for cart update events
  useEffect(() => {
    const handleUpdate = () => {
      void fetchCart()
    }
    window.addEventListener(CART_UPDATED_EVENT, handleUpdate)
    return () => window.removeEventListener(CART_UPDATED_EVENT, handleUpdate)
  }, [fetchCart])

  const updateQuantity = async (itemId: number, newQty: number) => {
    if (newQty < 1) return
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQty })
      })
      if (res.ok) void fetchCart()
    } catch (err) {
      console.error(err)
    }
  }

  const removeItem = async (itemId: number) => {
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: "DELETE"
      })
      if (res.ok) void fetchCart()
    } catch (err) {
      console.error(err)
    }
  }

  if (!mounted) return null

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-9999 flex justify-end overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
            className="relative z-10000 flex h-full w-full flex-col bg-white shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.3)] md:w-[35vw] lg:w-[30vw]"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-100 p-6 bg-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f7f4] text-[#6f8f73]">
                    <FaShoppingCart className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Sepetim</h2>
                    <p className="text-xs font-bold text-zinc-500">{summary?.itemCount || 0} Ürün</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="group flex h-10 w-10 items-center justify-center rounded-full transition-all hover:bg-zinc-100 hover:rotate-90"
                >
                  <FaTimes className="h-5 w-5 text-zinc-400 group-hover:text-zinc-900" />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {loading && lines.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#bcd2bf] border-t-[#6f8f73]" />
                  </div>
                ) : lines.length > 0 ? (
                  <div className="space-y-8">
                    {lines.map((line) => (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={line.itemId} 
                        className="flex gap-4 group"
                      >
                        <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50 transition-transform group-hover:scale-105">
                          <Image
                            src={line.imageUrl}
                            alt={line.productName}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex flex-1 flex-col">
                          <div className="flex justify-between gap-2">
                            <Link 
                              href={`/products/${line.productSlug}`} 
                              onClick={onClose}
                              className="text-sm font-bold text-zinc-800 hover:text-[#6f8f73] transition-colors line-clamp-2 uppercase tracking-tight"
                            >
                              {line.productName}
                            </Link>
                            <button 
                              onClick={() => void removeItem(line.itemId)}
                              className="text-zinc-300 hover:text-rose-500 transition-colors p-1"
                            >
                              <FaTrash className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="mt-1 text-[10px] font-black text-zinc-400 uppercase tracking-widest">{line.variantName}</p>
                          <div className="mt-auto flex items-center justify-between pt-2">
                            <div className="flex h-9 items-center rounded-xl border-2 border-zinc-100 bg-white px-1">
                              <button 
                                onClick={() => void updateQuantity(line.itemId, line.quantity - 1)}
                                className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                              >
                                <FaMinus className="h-2.5 w-2.5" />
                              </button>
                              <span className="w-8 text-center text-sm font-black text-zinc-800">{line.quantity}</span>
                              <button 
                                onClick={() => void updateQuantity(line.itemId, line.quantity + 1)}
                                className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                              >
                                <FaPlus className="h-2.5 w-2.5" />
                              </button>
                            </div>
                            <span className="text-base font-black text-zinc-900">₺{line.lineTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-zinc-50 text-zinc-200">
                      <FaShoppingCart className="h-12 w-12" />
                    </div>
                    <h3 className="text-xl font-black text-zinc-800 uppercase tracking-tight">Sepetin Boş</h3>
                    <p className="mt-2 text-sm text-zinc-400 max-w-[200px]">Hemen alışverişe başla ve harika ürünleri sepetine ekle!</p>
                    <button
                      onClick={onClose}
                      className="mt-8 rounded-2xl bg-[#6f8f73] px-10 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-[#6f8f73]/20 transition-all hover:bg-[#5f7f64] hover:scale-105 active:scale-95"
                    >
                      Alışverişe Başla
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              {lines.length > 0 && summary && (
                <div className="border-t border-zinc-100 p-8 space-y-4 bg-zinc-50/80 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Ara Toplam</span>
                    <span className="text-2xl font-black text-zinc-900 tracking-tight">₺{summary.subtotal.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">Kargo ve vergi ödeme adımında hesaplanacaktır.</p>
                  <div className="grid grid-cols-1 gap-3 pt-2">
                    <Link
                      href="/checkout"
                      onClick={onClose}
                      className="flex h-14 w-full items-center justify-center rounded-2xl bg-zinc-900 text-xs font-black uppercase tracking-widest text-white shadow-2xl shadow-black/10 transition-all hover:bg-zinc-800 hover:translate-y-[-2px] active:translate-y-0"
                    >
                      Satın Al
                    </Link>
                    <Link
                      href="/cart"
                      onClick={onClose}
                      className="flex h-12 w-full items-center justify-center rounded-2xl border-2 border-zinc-200 bg-white text-[10px] font-black uppercase tracking-widest text-zinc-500 transition-all hover:bg-zinc-50 hover:text-zinc-900"
                    >
                      Sepete Git / Detaylı Gör
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
