"use client"

import Link from "next/link"
import { useState } from "react"
import { motion } from "framer-motion"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      const json = (await res.json()) as { message?: string }
      if (!res.ok) {
        setError(json.message ?? "İstek başarısız.")
        return
      }
      setMessage(json.message ?? "İşlem tamamlandı.")
      setEmail("")
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
        <h1 className="text-xl font-semibold">Şifremi unuttum</h1>
        <p className="text-sm text-zinc-400">
          Kayıtlı e-posta adresinize şifre sıfırlama bağlantısı gönderilir.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {message ? (
          <div className="rounded bg-emerald-50 p-3 text-xs font-medium text-emerald-800">{message}</div>
        ) : null}
        {error ? <div className="rounded bg-rose-50 p-3 text-xs text-rose-600">{error}</div> : null}

        <div className="space-y-1">
          <label className="text-[11px] text-zinc-500">E-posta</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-11 w-full border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#6f8f73]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-10 w-full bg-[#6f8f73] text-sm font-semibold text-white transition hover:bg-[#5f7f64] disabled:opacity-40"
        >
          {loading ? "Gönderiliyor…" : "Bağlantı gönder"}
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
