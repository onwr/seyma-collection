"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FaCheckCircle, FaExclamationTriangle, FaPhoneAlt } from "react-icons/fa"

type Form = {
  whatsappNumber: string
  callNumber: string
}

const emptyForm: Form = { whatsappNumber: "", callNumber: "" }

export default function AdminPhoneOrderPage() {
  const [form, setForm] = useState<Form>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/admin/phone-order")
      .then((r) => r.json())
      .then((d: Partial<Form> & { message?: string }) => {
        if (cancelled || d.message) return
        setForm({
          whatsappNumber: d.whatsappNumber ?? "",
          callNumber: d.callNumber ?? "",
        })
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setToast(null)
    try {
      const res = await fetch("/api/admin/phone-order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        setToast({ msg: "Kaydedildi.", ok: true })
        setForm({
          whatsappNumber: data.whatsappNumber ?? form.whatsappNumber,
          callNumber: data.callNumber ?? form.callNumber,
        })
        setTimeout(() => setToast(null), 3000)
      } else {
        setToast({ msg: data.message || "Kayıt başarısız.", ok: false })
      }
    } catch {
      setToast({ msg: "Bağlantı hatası.", ok: false })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-[#fcfcfc] p-6">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-8 right-8 z-200 flex items-center gap-3 rounded-2xl border-l-4 px-6 py-4 shadow-2xl backdrop-blur-md
              ${toast.ok ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-rose-500 bg-rose-50 text-rose-800"}`}
          >
            {toast.ok ? (
              <FaCheckCircle className="text-emerald-500" />
            ) : (
              <FaExclamationTriangle className="text-rose-500" />
            )}
            <span className="text-sm font-bold">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-8 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary shadow-sm">
          <FaPhoneAlt className="text-lg" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900">Telefonla Sipariş</h1>
          <p className="mt-1 text-[13px] font-medium text-zinc-500">
            Ürün detay sayfasındaki “Telefonla / WhatsApp’tan Sipariş Ver” popup’ında kullanılan numaralar.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400">Yükleniyor…</p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm md:p-8"
        >
          <div>
            <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-zinc-400">
              WhatsApp numarası
            </label>
            <p className="mb-2 text-[11px] text-zinc-500">
              Sadece rakam girin. Örn: <code className="rounded bg-zinc-100 px-1">90555XXXXXXX</code>
            </p>
            <input
              inputMode="numeric"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-[13px] font-medium outline-none focus:border-zinc-900"
              value={form.whatsappNumber}
              onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
              placeholder="90555..."
            />
          </div>

          <div>
            <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-zinc-400">
              Arama numarası
            </label>
            <p className="mb-2 text-[11px] text-zinc-500">
              <code className="rounded bg-zinc-100 px-1">+90555...</code> veya <code className="rounded bg-zinc-100 px-1">90555...</code>
            </p>
            <input
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-[13px] font-medium outline-none focus:border-zinc-900"
              value={form.callNumber}
              onChange={(e) => setForm({ ...form, callNumber: e.target.value })}
              placeholder="+90555..."
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="h-12 w-full rounded-2xl bg-zinc-900 text-sm font-black uppercase tracking-widest text-white shadow-xl transition hover:bg-zinc-800 disabled:opacity-60"
          >
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </form>
      )}
    </div>
  )
}

