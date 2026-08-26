"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

type OrderDetailJson = {
  order: {
    orderNo: string
    createdAt: string
    status: string
    paymentStatus: string
    subtotal: string
    shippingCost: string
    grandTotal: string
    note: string | null
    shippingFullName: string
    shippingPhone: string
    shippingLine1: string
    shippingLine2: string | null
    shippingDistrict: string
    shippingCity: string
    shippingPostalCode: string
    shippingCountry: string
    items: {
      name: string
      sku: string | null
      unitPrice: string
      quantity: number
      lineTotal: string
    }[]
    payments: { method: string; status: string; amount: string; createdAt: string }[]
    shipment: {
      cargoCompany: string | null
      trackingNo: string | null
      shippedAt: string | null
      deliveredAt: string | null
    } | null
  }
}

type Props = {
  orderNo: string
}

export function OrderDetailClient({ orderNo }: Props) {
  const router = useRouter()
  const [data, setData] = useState<OrderDetailJson["order"] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderNo)}`, {
        credentials: "same-origin",
        cache: "no-store",
      })
      if (res.status === 401) {
        router.replace(`/login?callbackUrl=/siparislerim/${encodeURIComponent(orderNo)}`)
        return
      }
      const json = (await res.json()) as OrderDetailJson & { message?: string }
      if (res.status === 404) {
        setError(json.message ?? "Sipariş bulunamadı.")
        return
      }
      if (!res.ok) {
        throw new Error(json.message ?? "Yüklenemedi.")
      }
      setData(json.order)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi.")
    }
  }, [orderNo, router])

  useEffect(() => {
    void load()
  }, [load])

  if (!data && !error) {
    return <p className="text-sm text-zinc-600">Yükleniyor...</p>
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-6 text-sm text-rose-800">
        {error ?? "Sipariş bulunamadı."}
        <Link href="/siparislerim" className="mt-3 block font-medium text-[#6f8f73] hover:underline">
          Sipariş listesine dön
        </Link>
      </div>
    )
  }

  const o = data

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-4 md:grid-cols-2 md:p-5">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Sipariş</h2>
          <p className="mt-1 font-mono text-sm">{o.orderNo}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {new Date(o.createdAt).toLocaleString("tr-TR", {
              dateStyle: "long",
              timeStyle: "short",
            })}
          </p>
          <p className="mt-2 text-sm text-zinc-700">
            Durum: <strong>{o.status}</strong> · Ödeme: <strong>{o.paymentStatus}</strong>
          </p>
        </div>
        <div className="text-sm text-zinc-700">
          <p>
            Ara toplam: <span className="tabular-nums">{o.subtotal} ₺</span>
          </p>
          <p>
            Kargo: <span className="tabular-nums">{o.shippingCost} ₺</span>
          </p>
          <p className="mt-2 text-base font-semibold text-zinc-900">
            Genel toplam: <span className="tabular-nums">{o.grandTotal} ₺</span>
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 md:p-5">
        <h2 className="text-sm font-semibold text-zinc-900">Teslimat</h2>
        <p className="mt-2 text-sm text-zinc-700">
          {o.shippingFullName} · {o.shippingPhone}
        </p>
        <p className="text-sm text-zinc-700">
          {o.shippingLine1}
          {o.shippingLine2 ? `, ${o.shippingLine2}` : ""}
        </p>
        <p className="text-sm text-zinc-700">
          {o.shippingDistrict} / {o.shippingCity} {o.shippingPostalCode} · {o.shippingCountry}
        </p>
      </div>

      {o.shipment?.trackingNo || o.shipment?.cargoCompany ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 md:p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Kargo</h2>
          <p className="mt-2 text-sm text-zinc-700">
            {o.shipment.cargoCompany ?? "—"} · Takip: {o.shipment.trackingNo ?? "—"}
          </p>
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-200 bg-white p-4 md:p-5">
        <h2 className="text-sm font-semibold text-zinc-900">Ürünler</h2>
        <ul className="mt-3 divide-y divide-zinc-100">
          {o.items.map((item, idx) => (
            <li key={idx} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
              <span className="text-zinc-800">
                {item.name}
                {item.sku ? (
                  <span className="ml-2 text-xs text-zinc-500">SKU: {item.sku}</span>
                ) : null}
              </span>
              <span className="tabular-nums text-zinc-700">
                {item.quantity} × {item.unitPrice} ₺ = {item.lineTotal} ₺
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 md:p-5">
        <h2 className="text-sm font-semibold text-zinc-900">Ödeme kayıtları</h2>
        <ul className="mt-2 space-y-1 text-sm text-zinc-700">
          {o.payments.map((p, i) => (
            <li key={`${p.createdAt}-${i}`}>
              {p.method} — {p.status} — {p.amount} ₺
            </li>
          ))}
        </ul>
      </div>

      {o.note ? (
        <p className="text-sm text-zinc-600">
          <strong>Not:</strong> {o.note}
        </p>
      ) : null}

      <Link href="/siparislerim" className="inline-block text-sm font-medium text-[#6f8f73] hover:underline">
        Tüm siparişler
      </Link>
    </div>
  )
}
