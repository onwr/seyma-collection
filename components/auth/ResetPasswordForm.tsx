"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, Suspense } from "react"
import { motion } from "framer-motion"

function ResetPasswordFormInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlToken = searchParams.get("token")?.trim() ?? ""
  /** null = henüz düzenlenmedi; URL’deki token gösterilir. */
  const [editedToken, setEditedToken] = useState<string | null>(null)
  const token = editedToken !== null ? editedToken : urlToken

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (password !== confirm) {
      setError("Şifreler eşleşmiyor.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() || urlToken, password }),
      })
      const json = (await res.json()) as { message?: string }
      if (!res.ok) {
        setError(json.message ?? "İşlem başarısız.")
        return
      }
      setMessage(json.message ?? "Şifreniz güncellendi.")
      setTimeout(() => router.replace("/login"), 2000)
    } catch {
      setError("Bağlantı hatası.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Yeni şifre</h1>
        <p className="text-sm text-zinc-400">E-postadaki bağlantıdan geldiyseniz aşağıdan devam edin.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {message ? (
          <div className="rounded bg-emerald-50 p-3 text-xs font-medium text-emerald-800">{message}</div>
        ) : null}
        {error ? <div className="rounded bg-rose-50 p-3 text-xs text-rose-600">{error}</div> : null}

        <div className="space-y-1">
          <label className="text-[11px] text-zinc-500">Sıfırlama kodu (bağlantıdan gelir)</label>
          <input
            type="text"
            value={token}
            onChange={(e) => setEditedToken(e.target.value)}
            required
            autoComplete="off"
            className="h-11 w-full border border-zinc-300 bg-white px-3 font-mono text-xs outline-none focus:border-[#6f8f73]"
            placeholder="E-postadaki bağlantıyı kullanın veya yapıştırın"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-zinc-500">Yeni şifre (en az 6 karakter)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="h-11 w-full border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#6f8f73]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-zinc-500">Yeni şifre (tekrar)</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="h-11 w-full border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#6f8f73]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-10 w-full bg-[#6f8f73] text-sm font-semibold text-white transition hover:bg-[#5f7f64] disabled:opacity-40"
        >
          {loading ? "Kaydediliyor…" : "Şifreyi güncelle"}
        </button>

        <p className="pt-2 text-center text-xs text-zinc-500">
          <Link href="/login" className="font-bold text-[#6f8f73] hover:underline">
            Girişe dön
          </Link>
        </p>
      </form>
    </motion.div>
  )
}

export function ResetPasswordForm() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-[#6f8f73]" />
        </div>
      }
    >
      <ResetPasswordFormInner />
    </Suspense>
  )
}
