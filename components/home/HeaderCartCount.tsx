"use client"

import { useCallback, useEffect, useState } from "react"
import { CART_UPDATED_EVENT } from "@/lib/cartEvents"

export function HeaderCartCount() {
  const [count, setCount] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/cart", { cache: "no-store", credentials: "same-origin" })
      if (!res.ok) {
        setCount(0)
        return
      }
      const data = (await res.json()) as { summary?: { itemCount?: number } }
      setCount(data.summary?.itemCount ?? 0)
    } catch {
      setCount(0)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const onUpdate = () => void refresh()
    window.addEventListener(CART_UPDATED_EVENT, onUpdate)
    return () => window.removeEventListener(CART_UPDATED_EVENT, onUpdate)
  }, [refresh])

  const text = count === null ? "…" : `${count} Ürün`

  return (
    <span
      className="text-sm text-zinc-600 tabular-nums transition-colors hover:text-[#ddb1bd]"
      aria-live="polite"
      aria-atomic="true"
      suppressHydrationWarning
    >
      {text}
    </span>
  )
}
