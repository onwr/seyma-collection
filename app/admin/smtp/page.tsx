"use client"

import { useState, useEffect } from "react"
import {
  FaCheckCircle,
  FaEnvelope,
  FaExclamationTriangle,
  FaPaperPlane,
  FaShoppingBag,
} from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"
import { normalizeSmtpHost } from "@/lib/smtpHostNormalize"

type Encryption = "none" | "ssl" | "tls"
type TestTemplate = "simple" | "order_placed"
type TestPaymentMethod = "CARD" | "CASH_ON_DELIVERY" | "BANK_TRANSFER"

type SmtpForm = {
  host: string
  port: string
  encryption: Encryption
  user: string
  password: string
  fromEmail: string
  fromName: string
  autoTls: boolean
  mailEnabled: boolean
  hasPassword: boolean
}

const defaultForm: SmtpForm = {
  host: "",
  port: "587",
  encryption: "tls",
  user: "",
  password: "",
  fromEmail: "",
  fromName: "",
  autoTls: true,
  mailEnabled: false,
  hasPassword: false,
}

export default function AdminSmtpPage() {
  const [form, setForm] = useState<SmtpForm>(defaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testTo, setTestTo] = useState("")
  const [testTemplate, setTestTemplate] = useState<TestTemplate>("simple")
  const [testPaymentMethod, setTestPaymentMethod] = useState<TestPaymentMethod>("BANK_TRANSFER")
  const [testing, setTesting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/admin/smtp")
      .then((r) => r.json())
      .then(
        (d: SmtpForm & { message?: string; hasPassword?: boolean; ok?: boolean }) => {
          if (cancelled || d.message) return
          setForm({
            host: d.host ?? "",
            port: String(d.port ?? 587),
            encryption: (d.encryption as Encryption) || "tls",
            user: d.user ?? "",
            password: "",
            fromEmail: d.fromEmail ?? "",
            fromName: d.fromName ?? "",
            autoTls: d.autoTls ?? true,
            mailEnabled: d.mailEnabled ?? false,
            hasPassword: d.hasPassword ?? false,
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
      const port = parseInt(form.port, 10)
      const body: Record<string, unknown> = {
        host: form.host,
        port: Number.isFinite(port) ? port : 587,
        encryption: form.encryption,
        user: form.user,
        fromEmail: form.fromEmail,
        fromName: form.fromName,
        autoTls: form.autoTls,
        mailEnabled: form.mailEnabled,
      }
      if (form.password.trim().length > 0) {
        body.password = form.password
      }

      const res = await fetch("/api/admin/smtp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        setToast({ msg: "SMTP ayarları kaydedildi.", ok: true })
        setForm((f) => ({
          ...f,
          password: "",
          hasPassword:
            typeof data.hasPassword === "boolean"
              ? data.hasPassword
              : f.hasPassword || form.password.trim().length > 0,
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

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testTo.trim()) {
      setToast({ msg: "Test için alıcı e-postası girin.", ok: false })
      return
    }
    setTesting(true)
    setToast(null)
    try {
      const body: Record<string, unknown> = {
        to: testTo.trim(),
        template: testTemplate,
      }
      if (testTemplate === "order_placed") {
        body.paymentMethod = testPaymentMethod
      }
      const res = await fetch("/api/admin/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        setToast({ msg: data.message || "Test e-postası gönderildi.", ok: true })
        setTimeout(() => setToast(null), 4000)
      } else {
        setToast({ msg: data.message || "Gönderilemedi.", ok: false })
      }
    } catch {
      setToast({ msg: "Bağlantı hatası.", ok: false })
    } finally {
      setTesting(false)
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
          <FaEnvelope className="text-lg" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900">E-posta (SMTP)</h1>
          <p className="mt-2 text-[13px] font-medium leading-relaxed text-zinc-600">
            Diğer SMTP ile sunucunuz üzerinden e-posta gönderebilirsiniz. API tabanlı göndericilere göre kurulumu
            basittir; sağlayıcınızın günlük gönderim limitlerine dikkat edin. Çoğu sunucuda{" "}
            <strong className="text-zinc-800">TLS</strong> (genelde 587) önerilir; SSL için çoğunlukla{" "}
            <strong className="text-zinc-800">465</strong> kullanılır. Host alanına yalnızca sunucu adını yazın (
            <code className="rounded bg-zinc-100 px-1 text-[12px]">ssl://</code> öneki kullanmayın).
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400">Yükleniyor…</p>
      ) : (
        <>
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm md:p-8"
          >
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300"
                  checked={form.mailEnabled}
                  onChange={(e) => setForm({ ...form, mailEnabled: e.target.checked })}
                />
                <span>
                  <span className="block text-[13px] font-black text-zinc-900">
                    E-posta gönderimini aç
                  </span>
                  <span className="mt-1 block text-[12px] font-medium leading-relaxed text-zinc-600">
                    Kapalıyken otomatik mailler (şifre sıfırlama, sipariş bildirimleri) ve test e-postası gönderilmez.
                    SMTP bilgilerini kaydettikten sonra bu seçeneği açın.
                  </span>
                </span>
              </label>
            </div>

            <div>
              <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-zinc-400">
                SMTP sunucusu (host)
              </label>
              <p className="mb-2 text-[11px] text-zinc-500">
                Yalnızca sunucu adı yazın (<code className="rounded bg-zinc-100 px-1">smtp.yandex.com.tr</code>).
                <code className="rounded bg-zinc-100 px-1">ssl://</code> veya{" "}
                <code className="rounded bg-zinc-100 px-1">smtp://</code> önekleri kayıt veya test sırasında otomatik
                kaldırılır.
              </p>
              <input
                type="text"
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-[13px] font-medium outline-none focus:border-zinc-900"
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                onBlur={() => setForm((f) => ({ ...f, host: normalizeSmtpHost(f.host) }))}
                placeholder="smtp.yandex.com.tr"
                autoComplete="off"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  Şifreleme
                </label>
                <select
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-[13px] font-bold outline-none focus:border-zinc-900"
                  value={form.encryption}
                  onChange={(e) =>
                    setForm({ ...form, encryption: e.target.value as Encryption })
                  }
                >
                  <option value="none">Yok</option>
                  <option value="ssl">SSL</option>
                  <option value="tls">TLS (önerilen)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  Port
                </label>
                <input
                  type="number"
                  min={1}
                  max={65535}
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-[13px] font-medium outline-none focus:border-zinc-900"
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: e.target.value })}
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300"
                checked={form.autoTls}
                onChange={(e) => setForm({ ...form, autoTls: e.target.checked })}
              />
              <span className="text-[13px] font-bold text-zinc-800">
                Otomatik TLS (TLS şifrelemesinde sunucu destekliyorsa kullanılır; bağlantı sorununda kapatmayı
                deneyin)
              </span>
            </label>

            <div>
              <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-zinc-400">
                SMTP kullanıcı adı
              </label>
              <input
                type="text"
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-[13px] font-medium outline-none focus:border-zinc-900"
                value={form.user}
                onChange={(e) => setForm({ ...form, user: e.target.value })}
                placeholder="noreply@ornek.com"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-zinc-400">
                SMTP şifresi
              </label>
              <p className="mb-2 text-[11px] text-zinc-500">
                {form.hasPassword
                  ? "Parola veritabanında saklıdır. Yalnızca değiştirmek istediğinizde yeni değer girin."
                  : "Henüz kayıtlı şifre yok."}
              </p>
              <input
                type="password"
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-[13px] font-medium outline-none focus:border-zinc-900"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={form.hasPassword ? "•••••••• (değiştirmek için yazın)" : "Uygulama şifresi"}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-zinc-400">
                Gönderen e-posta
              </label>
              <input
                type="email"
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-[13px] font-medium outline-none focus:border-zinc-900"
                value={form.fromEmail}
                onChange={(e) => setForm({ ...form, fromEmail: e.target.value })}
                placeholder="noreply@seymacollection.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-zinc-400">
                Gönderen adı (isteğe bağlı)
              </label>
              <input
                type="text"
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-[13px] font-medium outline-none focus:border-zinc-900"
                value={form.fromName}
                onChange={(e) => setForm({ ...form, fromName: e.target.value })}
                placeholder="Şeyma Collection"
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

          <div className="mt-8 rounded-3xl border border-zinc-200 border-dashed bg-zinc-50/50 p-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-500">Test e-postası</h2>
            <p className="mt-2 text-[13px] text-zinc-600">
              Ayarları kaydettikten sonra bir adrese test mesajı gönderin (önce kayıt önerilir). İsterseniz checkout
              sonrası müşteriye giden <strong className="text-zinc-800">sipariş alındı</strong> şablonunu da aynı
              içerikle simüle edebilirsiniz (gerçek sipariş oluşturulmaz).
            </p>
            <form onSubmit={handleTest} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  Şablon
                </label>
                <select
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-[13px] font-semibold outline-none focus:border-zinc-900 sm:max-w-md"
                  value={testTemplate}
                  onChange={(e) => setTestTemplate(e.target.value as TestTemplate)}
                >
                  <option value="simple">Basit — SMTP bağlantı doğrulaması</option>
                  <option value="order_placed">Sipariş alındı — checkout ile aynı e-posta şablonu</option>
                </select>
              </div>
              {testTemplate === "order_placed" && (
                <div>
                  <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-zinc-400">
                    Ödeme yöntemi (şablondaki metin buna göre değişir)
                  </label>
                  <select
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-[13px] font-semibold outline-none focus:border-zinc-900 sm:max-w-md"
                    value={testPaymentMethod}
                    onChange={(e) => setTestPaymentMethod(e.target.value as TestPaymentMethod)}
                  >
                    <option value="BANK_TRANSFER">Havale / EFT</option>
                    <option value="CASH_ON_DELIVERY">Kapıda ödeme</option>
                    <option value="CARD">Kredi kartı (ödeme sayfası metni)</option>
                  </select>
                  <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                    Örnek sipariş no: <code className="rounded bg-zinc-100 px-1">DEMO-SMTP-TEST</code>, örnek tutar{" "}
                    <code className="rounded bg-zinc-100 px-1">1499.99</code> TL. İçerideki sipariş linki bu demo
                    numarasına gider; gerçek sipariş yoktur.
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-zinc-400">
                    Alıcı e-posta
                  </label>
                  <input
                    type="email"
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-[13px] outline-none focus:border-zinc-900"
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                    placeholder="sizin@email.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={testing}
                  className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-6 text-[12px] font-black uppercase tracking-widest text-zinc-800 transition hover:bg-zinc-900 hover:text-white disabled:opacity-60"
                >
                  {testTemplate === "order_placed" ? (
                    <FaShoppingBag className="text-xs" />
                  ) : (
                    <FaPaperPlane className="text-xs" />
                  )}
                  {testing ? "Gönderiliyor…" : testTemplate === "order_placed" ? "Şablon gönder" : "Test gönder"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
