"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { dispatchCartUpdated } from "@/lib/cartEvents"
import { sanitizePostAuthPath } from "@/lib/safeCallbackUrl"
import { cities, getDistrictsByCityId } from "@/utils/turkiye"

const steps = [
  { title: "Hesap Bilgileri" },
  { title: "İletişim" },
  { title: "Adres" },
]

type RegisterFormProps = {
  /** Kayıt sonrası güvenli site-içi path (örn. `/cart`). */
  postAuthRedirect?: string
}

export default function RegisterForm({ postAuthRedirect = "/cart" }: RegisterFormProps) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    city: "",
    district: "",
    neighborhood: "",
    doorNo: "",
  })

  const districts = useMemo(() => {
    const selected = cities.find(c => c.name === form.city)
    if (!selected) return []
    return getDistrictsByCityId(selected.id)
  }, [form.city])

  const update = (k: string, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }))

  // Phone mask: 000 000 00 00
  const formatPhone = (val: string) => {
    const numbers = val.replace(/\D/g, "").slice(0, 10)
    let formatted = ""
    if (numbers.length > 0) formatted += numbers.slice(0, 3)
    if (numbers.length > 3) formatted += " " + numbers.slice(3, 6)
    if (numbers.length > 6) formatted += " " + numbers.slice(6, 8)
    if (numbers.length > 8) formatted += " " + numbers.slice(8, 10)
    return formatted
  }

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${form.firstName} ${form.lastName}`.trim(),
          email: form.email,
          password: form.password,
          phone: form.phone.replace(/\s/g, ""),
          city: form.city,
          district: form.district,
          neighborhood: form.neighborhood,
          doorNo: form.doorNo
        }),
      })
      const json = (await res.json()) as { message?: string }
      if (!res.ok) {
        throw new Error(json.message ?? "Kayıt başarısız.")
      }
      dispatchCartUpdated()
      router.replace(sanitizePostAuthPath(postAuthRedirect))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt sırasında bir hata oluştu.")
    } finally {
      setLoading(false)
    }
  }

  const next = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      void handleSubmit()
    }
  }

  const back = () => {
    if (step > 0) setStep(step - 1)
  }

  const isStepValid = () => {
    if (step === 0)
      return form.firstName && form.lastName && form.email && form.password
    if (step === 1) return form.phone.replace(/\s/g, "").length === 10
    if (step === 2) return form.city && form.district && form.neighborhood && form.doorNo
    return false
  }

  return (
    <div className="w-full max-w-md">
      {error && (
        <div className="mb-4 rounded bg-rose-50 p-3 text-xs text-rose-600">
          {error}
        </div>
      )}

      {/* HEADER */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-zinc-400 mb-2">
          <span>Adım {step + 1}</span>
          <span>{steps.length}</span>
        </div>

        {/* PROGRESS */}
        <div className="h-1 w-full bg-zinc-200">
          <div
            className="h-full bg-[#ad516b] transition-all"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <h1 className="mt-3 text-lg font-semibold">
          {steps[step].title}
        </h1>
      </div>

      {/* CONTENT */}
      <div className="relative h-[360px] overflow-hidden">

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute w-full space-y-3"
          >

            {step === 0 && (
              <>
                <Input label="Ad" value={form.firstName} onChange={(v: string) => update("firstName", v)} />
                <Input label="Soyad" value={form.lastName} onChange={(v: string) => update("lastName", v)} />
                <Input label="E-posta" value={form.email} onChange={(v: string) => update("email", v)} />
                <Input label="Şifre" type="password" value={form.password} onChange={(v: string) => update("password", v)} />
              </>
            )}

            {step === 1 && (
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-500">Telefon</label>
                <div className="flex border border-zinc-300 h-11 px-3 items-center bg-white">
                  <span className="text-sm text-zinc-400 mr-2">+90</span>
                  <input
                    value={form.phone}
                    onChange={(e) =>
                      update("phone", formatPhone(e.target.value))
                    }
                    className="w-full outline-none text-sm"
                    placeholder="5XX XXX XX XX"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-500">İl</label>
                    <select
                      value={form.city}
                      onChange={(e) => {
                        update("city", e.target.value)
                        update("district", "")
                      }}
                      className="h-11 w-full border border-zinc-300 px-3 text-sm bg-white"
                    >
                      <option value="">Seçiniz</option>
                      {cities.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-500">İlçe</label>
                    <select
                      value={form.district}
                      onChange={(e) => update("district", e.target.value)}
                      className="h-11 w-full border border-zinc-300 px-3 text-sm bg-white"
                    >
                      <option value="">Seçiniz</option>
                      {districts.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Input label="Mahalle - Sokak - Cadde" value={form.neighborhood} onChange={(v: string) => update("neighborhood", v)} />
                <Input label="Apartman - Kapı No" value={form.doorNo} onChange={(v: string) => update("doorNo", v)} />
              </>
            )}

          </motion.div>
        </AnimatePresence>

      </div>

      {/* ACTIONS */}
      <div className="mt-6 flex items-center justify-between">

        <button
          type="button"
          onClick={back}
          disabled={step === 0 || loading}
          className="text-sm text-zinc-400 disabled:opacity-30"
        >
          Geri
        </button>

        <button
          type="button"
          onClick={next}
          disabled={!isStepValid() || loading}
          className="bg-[#ad516b] text-white px-5 h-10 text-sm disabled:opacity-40"
        >
          {loading ? "..." : step === steps.length - 1 ? "Tamamla" : "Devam"}
        </button>

      </div>

    </div>
  )
}

interface InputProps {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}

function Input({ label, value, onChange, type = "text" }: InputProps) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] text-zinc-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full border border-zinc-300 px-3 text-sm outline-none focus:border-[#ad516b] bg-white"
      />
    </div>
  )
}