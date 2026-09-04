"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

type OrderRow = {
  orderNo: string
  createdAt: string
  status: string
  paymentStatus: string
  grandTotal: string
  itemCount: number
}

export function OrdersListClient() {
  const router = useRouter()
  const [orders, setOrders] = useState<OrderRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch("/api/orders", { credentials: "same-origin", cache: "no-store" })
      if (res.status === 401) {
        router.replace("/login?callbackUrl=/siparislerim")
        return
      }
      const json = (await res.json()) as { orders?: OrderRow[]; message?: string }
      if (!res.ok) {
        throw new Error(json.message ?? "Liste yüklenemedi.")
      }
      setOrders(json.orders ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Liste yüklenemedi.")
      setOrders(null)
    }
  }, [router])

  useEffect(() => {
    void load()
  }, [load])

  if (error) {
    return <p className="text-center text-sm text-rose-600">{error}</p>
  }

  if (orders === null) {
    return <p className="text-center text-sm text-zinc-600">Yükleniyor...</p>
  }

  if (!orders?.length) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-600">
        Henüz siparişiniz yok.
        <Link href="/" className="mt-3 block font-medium text-[#ad516b] hover:underline">
          Alışverişe başlayın
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50/80 text-xs font-semibold uppercase tracking-wide text-zinc-600">
            <th className="px-4 py-3">Sipariş no</th>
            <th className="px-4 py-3">Tarih</th>
            <th className="px-4 py-3">Durum</th>
            <th className="px-4 py-3">Ödeme</th>
            <th className="px-4 py-3 text-right">Toplam</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.orderNo} className="border-b border-zinc-100 last:border-0">
              <td className="px-4 py-3 font-mono text-xs">{o.orderNo}</td>
              <td className="px-4 py-3 text-zinc-700">
                {new Date(o.createdAt).toLocaleString("tr-TR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </td>
              <td className="px-4 py-3 text-zinc-700">{o.status}</td>
              <td className="px-4 py-3 text-zinc-700">{o.paymentStatus}</td>
              <td className="px-4 py-3 text-right tabular-nums">{o.grandTotal} ₺</td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/siparislerim/${encodeURIComponent(o.orderNo)}`}
                  className="font-medium text-[#ad516b] hover:underline"
                >
                  Detay
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
