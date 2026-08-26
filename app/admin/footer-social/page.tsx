"use client"

import { useState, useEffect } from "react"
import { FaCheckCircle, FaExclamationTriangle, FaShareAlt } from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"
import type { FooterSocialUrls } from "@/lib/footerSocialSettings"

const emptyForm: FooterSocialUrls = {
  facebook: "",
  twitter: "",
  instagram: "",
  youtube: "",
  google: "",
}

export default function AdminFooterSocialPage() {
  const [form, setForm] = useState<FooterSocialUrls>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/admin/footer-social")
      .then((r) => r.json())
      .then((d: FooterSocialUrls & { message?: string }) => {
        if (cancelled || d.message) return
        setForm({
          facebook: d.facebook ?? "",
          twitter: d.twitter ?? "",
          instagram: d.instagram ?? "",
          youtube: d.youtube ?? "",
          google: d.google ?? "",
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
      const res = await fetch("/api/admin/footer-social", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        setToast({ msg: "Kaydedildi.", ok: true })
        setForm({
          facebook: data.facebook ?? form.facebook,
          twitter: data.twitter ?? form.twitter,
          instagram: data.instagram ?? form.instagram,
          youtube: data.youtube ?? form.youtube,
          google: data.google ?? form.google,
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

  const field = (
    label: string,
    hint: string,
    key: keyof FooterSocialUrls,
    placeholder: string
  ) => (
    <div>
      <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-zinc-400">
        {label}
      </label>
      <p className="mb-2 text-[11px] text-zinc-500">{hint}</p>
      <input
        type="url"
        className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-[13px] font-medium outline-none focus:border-zinc-900"
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
      />
    </div>
  )

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
          <FaShareAlt className="text-lg" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900">Sosyal Medya</h1>
          <p className="mt-1 text-[13px] font-medium text-zinc-500">
            Anasayfa altındaki &quot;Bizi Takip Edin&quot; ikonlarının bağlantıları. Boş bıraktığınız ağ
            gösterilmez. Adresler tam olarak{" "}
            <code className="rounded bg-zinc-100 px-1 text-[12px]">https://...</code> ile başlamalıdır.
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
          {field("Facebook", "Facebook sayfa veya profil URL’si.", "facebook", "https://www.facebook.com/...")}
          {field("X (Twitter)", "X profil bağlantısı.", "twitter", "https://x.com/...")}
          {field("Instagram", "Instagram profil URL’si.", "instagram", "https://www.instagram.com/...")}
          {field("YouTube", "Kanal veya kullanıcı URL’si.", "youtube", "https://www.youtube.com/...")}
          {field(
            "Google",
            "İşletme profili veya arama bağlantısı (isteğe bağlı).",
            "google",
            "https://..."
          )}

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
