"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FaMinus, FaPlus, FaTrash, FaShoppingCart, FaArrowRight, FaTruck } from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"
import type { CartLine, CartResponse } from "@/lib/cart"
import { formatCurrency } from "@/lib/cart"
import { dispatchCartUpdated } from "@/lib/cartEvents"

type FetchState = {
  loading: boolean
  error: string | null
  data: CartResponse
}

const emptyCart: CartResponse = {
  cartId: null,
  lines: [],
  summary: {
    itemCount: 0,
    subtotal: 0,
    shipping: 0,
    grandTotal: 0,
  },
}

export function CartClient() {
  const [state, setState] = useState<FetchState>({
    loading: true,
    error: null,
    data: emptyCart,
  })
  const [pendingItemId, setPendingItemId] = useState<number | null>(null)
  const skipNextCartBroadcast = useRef(true)

  const loadCart = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const response = await fetch("/api/cart", { cache: "no-store", credentials: "same-origin" })
      const json = (await response.json()) as CartResponse & { message?: string }
      if (!response.ok) {
        throw new Error(json.message ?? "Sepet getirilemedi.")
      }
      setState({ loading: false, error: null, data: json })
      if (skipNextCartBroadcast.current) {
        skipNextCartBroadcast.current = false
      } else {
        dispatchCartUpdated()
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Sepet yüklenemedi.",
      }))
    }
  }, [])

  useEffect(() => {
    void loadCart()
  }, [loadCart])

  const changeQuantity = async (line: CartLine, nextQty: number) => {
    setPendingItemId(line.itemId)
    try {
      const response = await fetch(`/api/cart/items/${line.itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ quantity: nextQty }),
      })
      const json = (await response.json()) as { message?: string }
      if (!response.ok) {
        throw new Error(json.message ?? "Adet güncellenemedi.")
      }
      await loadCart()
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Adet güncellenemedi.",
      }))
    } finally {
      setPendingItemId(null)
    }
  }

  const removeLine = async (line: CartLine) => {
    setPendingItemId(line.itemId)
    try {
      const response = await fetch(`/api/cart/items/${line.itemId}`, {
        method: "DELETE",
        credentials: "same-origin",
      })
      const json = (await response.json()) as { message?: string }
      if (!response.ok) {
        throw new Error(json.message ?? "Ürün kaldırılamadı.")
      }
      await loadCart()
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Ürün kaldırılamadı.",
      }))
    } finally {
      setPendingItemId(null)
    }
  }

  const lines = state.data.lines
  const summary = state.data.summary
  const hasItems = lines.length > 0
  const isBusy = useMemo(() => state.loading || pendingItemId !== null, [state.loading, pendingItemId])

  if (state.loading && !hasItems) {
    return (
      <div className="flex h-64 flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-[#6f8f73]" />
        <p className="text-sm font-medium text-zinc-500">Sepetiniz yükleniyor...</p>
      </div>
    )
  }

  if (!hasItems) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 bg-white p-12 text-center"
      >
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-zinc-50 text-zinc-200">
          <FaShoppingCart className="h-12 w-12" />
        </div>
        <h2 className="text-2xl font-black text-zinc-800 uppercase tracking-tight">Sepetiniz Boş</h2>
        <p className="mt-3 max-w-sm text-sm font-medium text-zinc-500">
          Görünüşe göre henüz bir şey eklemediniz. En sevdiğiniz ürünleri keşfetmeye ne dersiniz?
        </p>
        <Link
          href="/"
          className="mt-8 rounded-2xl bg-[#6f8f73] px-10 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-[#6f8f73]/20 transition-all hover:bg-[#5f7f64] hover:scale-105 active:scale-95"
        >
          Alışverişe Başla
        </Link>
        {state.error ? <p className="mt-4 text-xs font-bold text-rose-500">{state.error}</p> : null}
      </motion.div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-3">
             <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4f7f4] text-[#6f8f73]">
                <FaShoppingCart className="h-5 w-5" />
             </div>
             <h2 className="text-lg font-black text-zinc-800 uppercase tracking-tight">Sepet Ürünleri</h2>
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-zinc-400">{summary.itemCount} Ürün</span>
        </div>

        <motion.ul 
          layout
          className="space-y-4"
        >
          <AnimatePresence mode="popLayout">
            {lines.map((line) => (
              <motion.li
                key={line.itemId}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="group relative overflow-hidden rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex gap-4 md:gap-6">
                  <Link href={`/products/${line.productSlug}`} className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50">
                    <Image src={line.imageUrl} alt={line.productName} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                  </Link>

                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex justify-between gap-4">
                      <div className="space-y-1">
                        <Link href={`/products/${line.productSlug}`} className="text-sm font-bold text-zinc-800 hover:text-[#6f8f73] transition-colors line-clamp-1">
                          {line.productName}
                        </Link>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{line.variantName}</p>
                      </div>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void removeLine(line)}
                        className="text-zinc-300 transition-colors hover:text-rose-500"
                      >
                        <FaTrash className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                      <div className="flex h-10 items-center rounded-xl border-2 border-zinc-100 bg-zinc-50 px-1">
                        <button
                          type="button"
                          disabled={isBusy || line.quantity <= 1}
                          onClick={() => void changeQuantity(line, line.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-white hover:shadow-sm disabled:opacity-30"
                        >
                          <FaMinus className="h-2.5 w-2.5" />
                        </button>
                        <span className="w-10 text-center text-sm font-black text-zinc-800">{line.quantity}</span>
                        <button
                          type="button"
                          disabled={isBusy || (line.stock !== null && line.quantity >= line.stock)}
                          onClick={() => void changeQuantity(line, line.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-white hover:shadow-sm disabled:opacity-30"
                        >
                          <FaPlus className="h-2.5 w-2.5" />
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-bold text-zinc-400 line-through decoration-rose-400/50">
                          {formatCurrency(line.unitPrice * 1.2)}
                        </p>
                        <p className="text-lg font-black text-zinc-900">{formatCurrency(line.lineTotal)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>

        {state.error ? <p className="text-sm font-bold text-rose-500">{state.error}</p> : null}
      </section>

      <aside className="sticky top-32 h-fit space-y-6">
        <div className="rounded-3xl border-2 border-zinc-100 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900">Sipariş Özeti</h2>
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between text-sm font-medium text-zinc-500">
              <span>Ara Toplam</span>
              <span className="text-zinc-900">{formatCurrency(summary.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-medium text-zinc-500">
              <span>Kargo</span>
              <span className={summary.shipping === 0 ? "text-emerald-600 font-bold" : "text-zinc-900"}>
                {summary.shipping === 0 ? "Ücretsiz" : formatCurrency(summary.shipping)}
              </span>
            </div>
            
            <div className="border-t border-zinc-100 pt-6">
              <div className="flex items-center justify-between text-2xl font-black text-zinc-900">
                <span>Toplam</span>
                <span>{formatCurrency(summary.grandTotal)}</span>
              </div>
              <p className="mt-2 text-[10px] text-zinc-400 font-medium">KDV dahil hesaplanmıştır.</p>
            </div>
          </div>

          <Link
            href="/checkout"
            className="group mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#6f8f73] text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-[#6f8f73]/20 transition-all hover:bg-[#5f7f64] hover:scale-[1.02]"
          >
            Ödemeye Geç
            <FaArrowRight className="transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href="/"
            className="mt-4 block text-center text-[10px] font-black uppercase tracking-[0.2em] text-[#6f8f73] hover:underline"
          >
            Alışverişe Devam Et
          </Link>
        </div>

        <div className="rounded-2xl bg-[#f4f7f4] p-5 border border-[#bcd2bf]">
          <div className="flex items-center gap-4">
             <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6f8f73] text-white">
                <FaTruck className="h-5 w-5" />
             </div>
             <div>
               <p className="text-xs font-black text-zinc-800 uppercase tracking-tight">Hızlı Teslimat</p>
               <p className="text-[10px] text-zinc-500 font-medium">Siparişleriniz 24 saat içinde kargoya verilir.</p>
             </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
