"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { FaInfoCircle, FaSave, FaSpinner, FaTruck } from "react-icons/fa"

function formatTry(n: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export type ShippingSettingsFormLayout = "page" | "embedded"

type ShippingSettingsFormProps = {
  layout: ShippingSettingsFormLayout
  /** Kayıttan sonra üst bileşen verisini yenilemek için. */
  onSaved?: () => void
}

export function ShippingSettingsForm({ layout, onSaved }: ShippingSettingsFormProps) {
  const [freeShippingThreshold, setFreeShippingThreshold] = useState("")
  const [standardShippingCost, setStandardShippingCost] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const idThreshold = layout === "embedded" ? "ship-threshold-emb" : "threshold"
  const idCost = layout === "embedded" ? "ship-cost-emb" : "cost"

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/admin/shipping")
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(data.message ?? "Ayarlar yüklenemedi.")
          return
        }
        setFreeShippingThreshold(String(data.freeShippingThreshold ?? ""))
        setStandardShippingCost(String(data.standardShippingCost ?? ""))
      } catch {
        if (!cancelled) setError("Bağlantı hatası.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const thresholdNum = Number(freeShippingThreshold)
  const costNum = Number(standardShippingCost)
  const validNums =
    Number.isFinite(thresholdNum) &&
    Number.isFinite(costNum) &&
    thresholdNum >= 0 &&
    costNum >= 0

  const examples = useMemo(() => {
    if (!validNums) return null
    const belowSub = Math.max(0, thresholdNum - 0.01)
    const shipBelow = belowSub >= thresholdNum ? 0 : costNum
    return {
      line1: { subtotal: thresholdNum, shipping: 0 },
      line2: { subtotal: belowSub, shipping: shipBelow },
    }
  }, [validNums, thresholdNum, costNum])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch("/api/admin/shipping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freeShippingThreshold: Number(freeShippingThreshold),
          standardShippingCost: Number(standardShippingCost),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? "Kaydedilemedi.")
        return
      }
      setFreeShippingThreshold(String(data.freeShippingThreshold ?? freeShippingThreshold))
      setStandardShippingCost(String(data.standardShippingCost ?? standardShippingCost))
      setSuccess("Kargo ayarları kaydedildi.")
      onSaved?.()
      setTimeout(() => setSuccess(null), 4000)
    } catch {
      setError("Bağlantı hatası.")
    } finally {
      setSaving(false)
    }
  }

  const infoBlock = (
    <div className="mb-6 rounded-2xl border border-sky-100 bg-sky-50/80 p-5 text-sm text-sky-950">
      <div className="mb-2 flex items-center gap-2 font-semibold text-sky-900">
        <FaInfoCircle className="h-4 w-4 shrink-0" />
        Nasıl uygulanır?
      </div>
      <ul className="list-inside list-disc space-y-1.5 text-sky-900/90">
        <li>
          <strong>Ara toplam</strong> (indirim öncesi) ücretsiz kargo eşidine eşit veya büyükse kargo{" "}
          <strong>0 ₺</strong>; aksi halde sabit <strong>standart kargo ücreti</strong> eklenir.
        </li>
        <li>İndirim sonrası genel toplam ayrıca hesaplanır; eşik yine ara toplama göre değerlendirilir.</li>
        <li>Harici kargo firması entegrasyonu yoktur; sabit ücret ve eşik modeli kullanılır.</li>
      </ul>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-zinc-100 bg-white px-6 py-10 text-zinc-500">
        <FaSpinner className="h-5 w-5 animate-spin" />
        Yükleniyor…
      </div>
    )
  }

  return (
    <>
      {layout === "page" && (
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <FaTruck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">Kargo ayarları</h1>
            <p className="text-sm text-zinc-500">
              Ücretsiz kargo eşiği ve standart kargo ücreti veritabanında saklanır; sepet ve ödeme aynı
              değerleri kullanır.
            </p>
          </div>
        </div>
      )}

      {infoBlock}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm"
      >
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
            {success}
          </div>
        )}

        <div>
          <label htmlFor={idThreshold} className="mb-1.5 block text-sm font-semibold text-zinc-800">
            Ücretsiz kargo eşiği (₺, ara toplam)
          </label>
          <input
            id={idThreshold}
            type="number"
            min={0}
            step="0.01"
            required
            value={freeShippingThreshold}
            onChange={(e) => setFreeShippingThreshold(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-zinc-900 outline-none ring-emerald-500/20 focus:border-emerald-500 focus:ring-4"
          />
        </div>

        <div>
          <label htmlFor={idCost} className="mb-1.5 block text-sm font-semibold text-zinc-800">
            Standart kargo ücreti (₺)
          </label>
          <input
            id={idCost}
            type="number"
            min={0}
            step="0.01"
            required
            value={standardShippingCost}
            onChange={(e) => setStandardShippingCost(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-zinc-900 outline-none ring-emerald-500/20 focus:border-emerald-500 focus:ring-4"
          />
        </div>

        {examples && (
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4 text-sm text-zinc-700">
            <p className="mb-2 font-semibold text-zinc-800">Formdaki değerlere göre örnek</p>
            <p>
              Ara toplam {formatTry(examples.line1.subtotal)} → kargo{" "}
              <strong>{formatTry(examples.line1.shipping)}</strong>
            </p>
            <p className="mt-1">
              Ara toplam {formatTry(examples.line2.subtotal)} → kargo{" "}
              <strong>{formatTry(examples.line2.shipping)}</strong>
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
        >
          {saving ? <FaSpinner className="h-4 w-4 animate-spin" /> : <FaSave className="h-4 w-4" />}
          Kaydet
        </button>
      </form>

      {layout === "embedded" && (
        <p className="mt-4 text-sm text-zinc-500">
          <Link href="/admin/shipping" className="font-semibold text-emerald-700 underline-offset-2 hover:underline">
            Tam kargo sayfasına git
          </Link>{" "}
          (aynı form, ayrı URL).
        </p>
      )}
    </>
  )
}
