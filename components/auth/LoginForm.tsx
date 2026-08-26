"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { motion } from "framer-motion"
import { dispatchCartUpdated } from "@/lib/cartEvents"

function safeCallbackUrl(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/"
  }
  return raw
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const registered = searchParams.get("registered") === "1"
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"))

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      })
      const json = (await res.json()) as { message?: string }
      if (!res.ok) {
        throw new Error(json.message ?? "Giriş başarısız.")
      }
      dispatchCartUpdated()
      router.replace(callbackUrl)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız.")
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
        <h1 className="text-xl font-semibold">Üye Girişi</h1>
        <p className="text-sm text-zinc-400">Hesabına erişmek için bilgilerini gir.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {registered ? (
          <div className="rounded bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
            Kayıt tamamlandı. Giriş yapabilirsiniz.
          </div>
        ) : null}

        {error ? (
          <div className="rounded bg-rose-50 p-3 text-xs text-rose-600">
            {error}
          </div>
        ) : null}

        <Input 
          label="E-posta" 
          type="email" 
          value={email} 
          onChange={(v) => setEmail(v)} 
          required 
          autoComplete="email"
        />

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] text-zinc-500">Şifre</label>
            <Link href="/forgot-password" title="Şifremi Unuttum" className="text-[11px] text-[#6f8f73] hover:underline">
               Şifremi Unuttum
            </Link>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="h-11 w-full border border-zinc-300 px-3 text-sm outline-none focus:border-[#6f8f73] bg-white"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#6f8f73] text-white h-10 text-sm font-semibold transition hover:bg-[#5f7f64] disabled:opacity-40"
        >
          {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
        </button>

        <p className="text-center text-xs text-zinc-500 pt-2">
          Hesabın yok mu?{" "}
          <Link href="/register" className="font-bold text-[#6f8f73] hover:underline">
            Hemen Üye Ol
          </Link>
        </p>
      </form>
    </motion.div>
  )
}

interface InputProps {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  autoComplete?: string
}

function Input({ label, value, onChange, type = "text", required, autoComplete }: InputProps) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] text-zinc-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        className="h-11 w-full border border-zinc-300 px-3 text-sm outline-none focus:border-[#6f8f73] bg-white"
      />
    </div>
  )
}
