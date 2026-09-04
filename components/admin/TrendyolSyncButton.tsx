"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FaSync } from "react-icons/fa"

export function TrendyolSyncButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleClick = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/trendyol/sync", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(typeof data.message === "string" ? data.message : "Senkronizasyon başarısız.")
      }
      router.refresh()
    } catch {
      alert("Bağlantı hatası")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={loading}
      className="flex items-center gap-2 rounded-lg bg-[#813d50] px-4 py-2 text-[12px] font-medium text-white transition hover:bg-[#673040] disabled:opacity-50"
    >
      <FaSync className={loading ? "animate-spin" : ""} />
      {loading ? "Senkronize ediliyor..." : "Şimdi Senkronize Et"}
    </button>
  )
}
