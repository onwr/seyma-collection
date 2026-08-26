"use client"

import { useState, useEffect } from "react"
import {
  FaPlus,
  FaQuestionCircle,
  FaTrash,
  FaEdit,
  FaCheckCircle,
  FaExclamationTriangle,
  FaEye,
  FaHome,
} from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"

type FaqRow = {
  id: number
  category: string | null
  question: string
  answer: string
  sortOrder: number
  isActive: boolean
  showOnHome: boolean
  createdAt: string
  updatedAt: string
}

async function requestFaqList(): Promise<FaqRow[]> {
  const res = await fetch("/api/admin/faqs")
  const data = await res.json()
  return data.items || []
}

export default function AdminFaqsPage() {
  const [items, setItems] = useState<FaqRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    question: "",
    answer: "",
    category: "",
    sortOrder: "0",
    isActive: true,
    showOnHome: false,
  })
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const fetchItems = async () => {
    try {
      const list = await requestFaqList()
      setItems(list)
    } catch {
      setToast({ msg: "Liste yüklenemedi.", ok: false })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    requestFaqList()
      .then((list) => {
        if (!cancelled) setItems(list)
      })
      .catch(() => {
        if (!cancelled) setToast({ msg: "Liste yüklenemedi.", ok: false })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const openModal = (row?: FaqRow) => {
    if (row) {
      setEditingId(row.id)
      setForm({
        question: row.question,
        answer: row.answer,
        category: row.category ?? "",
        sortOrder: String(row.sortOrder),
        isActive: row.isActive,
        showOnHome: row.showOnHome,
      })
    } else {
      setEditingId(null)
      setForm({
        question: "",
        answer: "",
        category: "",
        sortOrder: "0",
        isActive: true,
        showOnHome: false,
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const method = editingId ? "PUT" : "POST"
    const url = editingId ? `/api/admin/faqs/${editingId}` : "/api/admin/faqs"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: form.question,
          answer: form.answer,
          category: form.category.trim() || null,
          sortOrder: parseInt(form.sortOrder, 10) || 0,
          isActive: form.isActive,
          showOnHome: form.showOnHome,
        }),
      })
      const data = await res.json()

      if (res.ok) {
        setToast({ msg: editingId ? "SSS güncellendi." : "SSS eklendi.", ok: true })
        setIsModalOpen(false)
        fetchItems()
        setTimeout(() => setToast(null), 3000)
      } else {
        setToast({ msg: data.message || "İşlem başarısız.", ok: false })
      }
    } catch {
      setToast({ msg: "Bağlantı hatası.", ok: false })
    }
  }

  const deleteRow = async (id: number) => {
    if (!confirm("Bu soruyu silmek istediğinize emin misiniz?")) return
    try {
      const res = await fetch(`/api/admin/faqs/${id}`, { method: "DELETE" })
      if (res.ok) {
        setToast({ msg: "Silindi.", ok: true })
        fetchItems()
        setTimeout(() => setToast(null), 3000)
      } else {
        setToast({ msg: "Silinemedi.", ok: false })
      }
    } catch {
      setToast({ msg: "Silme hatası.", ok: false })
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl bg-[#fcfcfc] p-6">
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

      <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-4 text-3xl font-black tracking-tight text-zinc-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary shadow-sm">
              <FaQuestionCircle />
            </div>
            Sıkça sorulan sorular
          </h1>
          <p className="mt-1 text-[13px] font-medium text-zinc-500">
            Tüm SSS sayfası ve anasayfa bölümü buradan yönetilir. &quot;Anasayfada göster&quot; yalnızca seçili
            kayıtları anasayfadaki akordeonda listeler.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openModal()}
          className="flex h-12 items-center gap-2 rounded-2xl bg-zinc-900 px-6 text-sm font-bold text-white shadow-xl shadow-zinc-900/10 transition-all hover:-translate-y-0.5 hover:bg-primary active:translate-y-0"
        >
          <FaPlus className="text-xs" /> YENİ SORU
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400">Yükleniyor…</p>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-zinc-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    Soru
                  </th>
                  <th className="hidden px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 md:table-cell">
                    Kategori
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    Sıra
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    Durum
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50/50">
                    <td className="max-w-md px-4 py-3">
                      <p className="line-clamp-2 font-bold text-zinc-800">{row.question}</p>
                    </td>
                    <td className="hidden px-4 py-3 text-zinc-500 md:table-cell">
                      {row.category || "—"}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-zinc-600">{row.sortOrder}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        {row.isActive ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700">
                            Yayında
                          </span>
                        ) : (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-black uppercase text-zinc-500">
                            Pasif
                          </span>
                        )}
                        {row.showOnHome && (
                          <span
                            title="Anasayfada gösteriliyor"
                            className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-black uppercase text-violet-700"
                          >
                            <FaHome className="text-[8px]" />
                            Anasayfa
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openModal(row)}
                        className="mr-1 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-50 text-zinc-500 transition hover:bg-zinc-900 hover:text-white"
                        aria-label="Düzenle"
                      >
                        <FaEdit className="text-xs" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRow(row.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-500 transition hover:bg-rose-500 hover:text-white"
                        aria-label="Sil"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 && (
            <p className="p-8 text-center text-sm text-zinc-400">Henüz kayıt yok.</p>
          )}
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-150 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-4xl bg-white shadow-2xl"
            >
              <form onSubmit={handleSubmit} className="p-6 md:p-8">
                <h2 className="text-2xl font-black tracking-tight text-zinc-900">
                  {editingId ? "Düzenle" : "Yeni soru"}
                </h2>
                <p className="mt-1 text-[12px] font-bold text-zinc-400">
                  Yayında olmayan kayıtlar sitede görünmez.
                </p>

                <div className="mt-6 space-y-4">
                  <div>
                    <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-zinc-400">
                      Soru
                    </label>
                    <input
                      required
                      className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-[13px] font-bold outline-none focus:border-zinc-900"
                      value={form.question}
                      onChange={(e) => setForm({ ...form, question: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-zinc-400">
                      Cevap
                    </label>
                    <textarea
                      required
                      rows={5}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[13px] font-medium leading-relaxed outline-none focus:border-zinc-900"
                      value={form.answer}
                      onChange={(e) => setForm({ ...form, answer: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-zinc-400">
                      Kategori (opsiyonel)
                    </label>
                    <input
                      className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-[13px] font-bold outline-none focus:border-zinc-900"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      placeholder="Örn: Sipariş & Kargo"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-zinc-400">
                      Sıra
                    </label>
                    <input
                      type="number"
                      className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-[13px] font-bold outline-none focus:border-zinc-900"
                      value={form.sortOrder}
                      onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                    />
                  </div>

                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-zinc-300"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                    <span className="text-[13px] font-bold text-zinc-800">Yayında (sitede listelensin)</span>
                  </label>

                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-zinc-300"
                      checked={form.showOnHome}
                      onChange={(e) => setForm({ ...form, showOnHome: e.target.checked })}
                    />
                    <span className="flex items-center gap-2 text-[13px] font-bold text-zinc-800">
                      <FaEye className="text-zinc-400" />
                      Anasayfada göster (ayrıca yayında olmalı)
                    </span>
                  </label>
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="h-12 flex-1 rounded-xl border border-zinc-100 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition hover:bg-zinc-50"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="h-12 flex-2 rounded-xl bg-zinc-900 text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition hover:bg-zinc-800"
                  >
                    Kaydet
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
