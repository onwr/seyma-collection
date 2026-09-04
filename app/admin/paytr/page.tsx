"use client"

import { useState, useEffect } from "react"
import { FaCheckCircle, FaCreditCard, FaExclamationTriangle } from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"

type PaytrForm = {
  merchantId: string
  merchantKey: string
  merchantSalt: string
  testMode: boolean
  hasMerchantKey: boolean
  hasMerchantSalt: boolean
}

const defaultForm: PaytrForm = {
  merchantId: "",
  merchantKey: "",
  merchantSalt: "",
  testMode: false,
  hasMerchantKey: false,
  hasMerchantSalt: false,
}

export default function AdminPaytrPage() {
  const [form, setForm] = useState<PaytrForm>(defaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/admin/paytr")
      .then((r) => r.json())
      .then(
        (d: {
          merchantId?: string
          hasMerchantKey?: boolean
          hasMerchantSalt?: boolean
          testMode?: boolean
          message?: string
        }) => {
          if (cancelled || d.message) return
          setForm({
            merchantId: d.merchantId ?? "",
            merchantKey: "",
            merchantSalt: "",
            testMode: d.testMode ?? false,
            hasMerchantKey: d.hasMerchantKey ?? false,
            hasMerchantSalt: d.hasMerchantSalt ?? false,
          })
        }
      )
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
      const body: Record<string, unknown> = {
        merchantId: form.merchantId,
        testMode: form.testMode,
      }
      if (form.merchantKey.trim().length > 0) body.merchantKey = form.merchantKey
      if (form.merchantSalt.trim().length > 0) body.merchantSalt = form.merchantSalt

      const res = await fetch("/api/admin/paytr", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        setToast({ msg: "PayTR ayarları kaydedildi.", ok: true })
        setForm((f) => ({
          ...f,
          merchantKey: "",
          merchantSalt: "",
          hasMerchantKey: typeof data.hasMerchantKey === "boolean" ? data.hasMerchantKey : f.hasMerchantKey,
          hasMerchantSalt: typeof data.hasMerchantSalt === "boolean" ? data.hasMerchantSalt : f.hasMerchantSalt,
        }))
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
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#813d50]/10 bg-[#813d50]/10 text-[#813d50] shadow-sm">
          <FaCreditCard className="text-lg" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900">PayTR</h1>
          <p className="mt-2 text-[13px] font-medium leading-relaxed text-zinc-600">
            Kredi kartı ile ödemede kullanılan PayTR mağaza bilgileri. Bu bilgileri{" "}
            <a
              href="https://www.paytr.com/magaza/bilgi"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#813d50] underline underline-offset-2"
            >
              PayTR mağaza panelinden
            </a>{" "}
            (Bilgilerim → Mağaza Bilgileri) kopyalayabilirsiniz. Kaydedilen değerler `.env` dosyasındaki
            değerlerin yerine geçer.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400">Yükleniyor…</p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm md:p-8"
        >
          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300"
                checked={form.testMode}
                onChange={(e) => setForm({ ...form, testMode: e.target.checked })}
              />
              <span>
                <span className="block text-[13px] font-black text-zinc-900">Test modu</span>
                <span className="mt-1 block text-[12px] font-medium leading-relaxed text-zinc-600">
                  Açıkken PayTR gerçek tahsilat yapmaz, test kartlarıyla ödeme akışını deneyebilirsiniz. Canlıya
                  almadan önce kapatmayı unutmayın.
                </span>
              </span>
            </label>
          </div>

          <div>
            <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-zinc-400">
              Mağaza No (Merchant ID)
            </label>
            <input
              type="text"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-[13px] font-medium outline-none focus:border-zinc-900"
              value={form.merchantId}
              onChange={(e) => setForm({ ...form, merchantId: e.target.value })}
              placeholder="123456"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-zinc-400">
              Mağaza Parolası (Merchant Key)
            </label>
            <p className="mb-2 text-[11px] text-zinc-500">
              {form.hasMerchantKey
                ? "Değer veritabanında saklıdır. Yalnızca değiştirmek istediğinizde yeni değer girin."
                : "Henüz kayıtlı değer yok."}
            </p>
            <input
              type="password"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-[13px] font-medium outline-none focus:border-zinc-900"
              value={form.merchantKey}
              onChange={(e) => setForm({ ...form, merchantKey: e.target.value })}
              placeholder={form.hasMerchantKey ? "•••••••• (değiştirmek için yazın)" : "Merchant Key"}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-zinc-400">
              Mağaza Gizli Anahtarı (Merchant Salt)
            </label>
            <p className="mb-2 text-[11px] text-zinc-500">
              {form.hasMerchantSalt
                ? "Değer veritabanında saklıdır. Yalnızca değiştirmek istediğinizde yeni değer girin."
                : "Henüz kayıtlı değer yok."}
            </p>
            <input
              type="password"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-[13px] font-medium outline-none focus:border-zinc-900"
              value={form.merchantSalt}
              onChange={(e) => setForm({ ...form, merchantSalt: e.target.value })}
              placeholder={form.hasMerchantSalt ? "•••••••• (değiştirmek için yazın)" : "Merchant Salt"}
              autoComplete="new-password"
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
