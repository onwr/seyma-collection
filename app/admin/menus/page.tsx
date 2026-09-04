"use client"

import { useCallback, useEffect, useMemo, useState, startTransition } from "react"
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaBars,
  FaEye,
  FaEyeSlash,
  FaExternalLinkAlt,
  FaGripVertical,
  FaBullhorn,
  FaSync,
} from "react-icons/fa"
import { AnimatePresence, motion, Reorder } from "framer-motion"
import { DEFAULT_HEADER_ANNOUNCEMENTS } from "@/lib/headerAnnouncements"

type NavChild = {
  label: string
  href: string
  openInNewTab: boolean
}

type NavRow = {
  id: number
  label: string
  href: string
  labelUppercase: boolean
  sortOrder: number
  isActive: boolean
  openInNewTab: boolean
  children?: NavChild[]
}

type ToastState = {
  msg: string
  ok: boolean
}

const emptyForm: NavRow = {
  id: 0,
  label: "",
  href: "/",
  labelUppercase: true,
  sortOrder: 0,
  isActive: true,
  openInNewTab: false,
  children: [],
}

function rowToPayload(row: NavRow) {
  return {
    label: row.label,
    href: row.href,
    labelUppercase: row.labelUppercase,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    openInNewTab: row.openInNewTab,
    children: row.children ?? [],
  }
}

export default function AdminMenusPage() {
  const [items, setItems] = useState<NavRow[]>([])
  const [orderedItems, setOrderedItems] = useState<NavRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<NavRow | null>(null)
  const [form, setForm] = useState<NavRow>(emptyForm)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [isPersistingOrder, setIsPersistingOrder] = useState(false)
  const [announcements, setAnnouncements] = useState<string[]>(
    DEFAULT_HEADER_ANNOUNCEMENTS
  )
  const [savingAnnouncements, setSavingAnnouncements] = useState(false)
  const [syncingCategories, setSyncingCategories] = useState(false)

  const pushToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok })
    window.setTimeout(() => setToast(null), 2600)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/navigation")
      if (!res.ok) throw new Error("fetch")
      const data = await res.json()
      const rows = Array.isArray(data) ? data : []
      setItems(rows)
      setOrderedItems(rows)
    } catch {
      pushToast("Menüler yüklenemedi.", false)
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  const loadAnnouncements = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/navigation/announcements")
      if (!res.ok) throw new Error("fetch")
      const data = await res.json()
      const items = Array.isArray(data?.items) ? data.items : []
      if (items.length > 0) setAnnouncements(items)
    } catch {
      pushToast("Duyurular yüklenemedi.", false)
    }
  }, [pushToast])

  useEffect(() => {
    startTransition(() => {
      void load()
    })
  }, [load])

  useEffect(() => {
    startTransition(() => {
      void loadAnnouncements()
    })
  }, [loadAnnouncements])

  const saveAnnouncements = async () => {
    const cleaned = announcements.map((x) => x.trim()).filter(Boolean)
    if (cleaned.length === 0) {
      pushToast("En az bir duyuru gerekli.", false)
      return
    }
    setSavingAnnouncements(true)
    try {
      const res = await fetch("/api/admin/navigation/announcements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cleaned }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        pushToast(data?.message || "Duyurular kaydedilemedi.", false)
        return
      }
      setAnnouncements(cleaned)
      pushToast("Duyuru barı güncellendi.", true)
    } catch {
      pushToast("Duyuru kaydetme hatası.", false)
    } finally {
      setSavingAnnouncements(false)
    }
  }

  const openNew = () => {
    const maxOrder = items.reduce((m, r) => Math.max(m, r.sortOrder), -1)
    setEditing(null)
    setForm({ ...emptyForm, sortOrder: maxOrder + 1, children: [] })
    setModalOpen(true)
  }

  const openEdit = (row: NavRow) => {
    setEditing(row)
    setForm({
      ...row,
      children: Array.isArray(row.children) ? row.children : [],
    })
    setModalOpen(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = rowToPayload(form)
      const url = editing
        ? `/api/admin/navigation/${editing.id}`
        : "/api/admin/navigation"
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          typeof data.message === "object"
            ? "Alan doğrulama hatası."
            : data.message || "Kayıt başarısız"
        pushToast(msg, false)
        return
      }
      pushToast(editing ? "Menü güncellendi." : "Yeni menü eklendi.", true)
      setModalOpen(false)
      await load()
    } catch {
      pushToast("Bağlantı hatası.", false)
    }
  }

  const remove = async (id: number) => {
    if (!confirm("Bu menü öğesini silmek istiyor musunuz?")) return
    try {
      const res = await fetch(`/api/admin/navigation/${id}`, { method: "DELETE" })
      if (!res.ok) {
        pushToast("Silinemedi.", false)
        return
      }
      pushToast("Menü silindi.", true)
      await load()
    } catch {
      pushToast("Silme sırasında hata oluştu.", false)
    }
  }

  const toggleActive = async (row: NavRow) => {
    try {
      const res = await fetch(`/api/admin/navigation/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          rowToPayload({ ...row, isActive: !row.isActive })
        ),
      })
      if (res.ok) {
        pushToast(
          !row.isActive ? "Menü yayına alındı." : "Menü pasife alındı.",
          true
        )
        await load()
      } else {
        pushToast("Durum güncellenemedi.", false)
      }
    } catch {
      pushToast("Durum güncelleme hatası.", false)
    }
  }

  const syncFromCategories = async () => {
    if (
      !confirm(
        "Mevcut üst menüdeki tüm öğeler silinir; kök kategoriler ana menü, alt kategoriler (ve varsa daha alt seviyeler) açılır menüde `/categories/...` linkleriyle yeniden oluşturulur. Devam edilsin mi?"
      )
    ) {
      return
    }
    setSyncingCategories(true)
    try {
      const res = await fetch("/api/admin/navigation/sync-categories", {
        method: "POST",
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        pushToast(
          typeof data?.message === "string" ? data.message : "Senkronizasyon başarısız.",
          false
        )
        return
      }
      const rows = Array.isArray(data) ? (data as NavRow[]) : []
      setItems(rows)
      setOrderedItems(rows)
      pushToast(
        rows.length === 0
          ? "Kategori yok; menü boşaltıldı."
          : `Menü kategorilerle güncellendi (${rows.length} ana öğe).`,
        true
      )
    } catch {
      pushToast("Senkronizasyon sırasında hata oluştu.", false)
    } finally {
      setSyncingCategories(false)
    }
  }

  const persistReorder = async (next: NavRow[]) => {
    setIsPersistingOrder(true)
    try {
      await Promise.all(
        next.map((row, idx) =>
          fetch(`/api/admin/navigation/${row.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              rowToPayload({
                ...row,
                sortOrder: idx,
              })
            ),
          })
        )
      )
      pushToast("Sıralama güncellendi.", true)
      await load()
    } catch {
      pushToast("Sıralama kaydedilemedi.", false)
    } finally {
      setIsPersistingOrder(false)
    }
  }

  const addChild = () => {
    setForm((prev) => ({
      ...prev,
      children: [...(prev.children ?? []), { label: "", href: "/", openInNewTab: false }],
    }))
  }

  const updateChild = (index: number, patch: Partial<NavChild>) => {
    setForm((prev) => ({
      ...prev,
      children: (prev.children ?? []).map((child, i) =>
        i === index ? { ...child, ...patch } : child
      ),
    }))
  }

  const removeChild = (index: number) => {
    setForm((prev) => ({
      ...prev,
      children: (prev.children ?? []).filter((_, i) => i !== index),
    }))
  }

  const description = useMemo(() => {
    if (isPersistingOrder) return "Sıralama kaydediliyor..."
    return "Kartları sürükleyip bırakın. Bıraktığınızda sıra otomatik kaydedilir."
  }, [isPersistingOrder])

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            className={`fixed top-6 right-6 z-200 rounded-xl px-4 py-3 text-sm font-bold shadow-lg border ${
              toast.ok
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">
            <FaBars /> İçerik
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight">
            Üst menü
          </h1>
          <p className="text-sm text-zinc-500 mt-1 font-medium">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => void syncFromCategories()}
            disabled={syncingCategories || loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 transition-colors hover:border-[#813d50] hover:text-[#813d50] disabled:opacity-50"
          >
            <FaSync className={`text-xs ${syncingCategories ? "animate-spin" : ""}`} />
            {syncingCategories ? "Senkronize…" : "Kategorilerden senkronize et"}
          </button>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 text-white px-5 py-3 text-sm font-bold hover:bg-zinc-800 transition-colors"
          >
            <FaPlus className="text-xs" /> Yeni öğe
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 md:p-5 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-500">
            <FaBullhorn /> Duyuru Barı
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAnnouncements((prev) => [...prev, ""])}
              className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-900"
            >
              + Satır
            </button>
            <button
              type="button"
              onClick={() => void saveAnnouncements()}
              disabled={savingAnnouncements}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
            >
              {savingAnnouncements ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {announcements.map((line, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                value={line}
                onChange={(e) =>
                  setAnnouncements((prev) =>
                    prev.map((v, i) => (i === idx ? e.target.value : v))
                  )
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                placeholder="Duyuru metni"
              />
              <button
                type="button"
                onClick={() =>
                  setAnnouncements((prev) => prev.filter((_, i) => i !== idx))
                }
                className="rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-2 text-xs font-bold text-rose-600"
              >
                Sil
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 md:p-5">
        {loading ? (
          <div className="p-12 text-center text-zinc-400 text-sm font-medium">
            Yükleniyor…
          </div>
        ) : orderedItems.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 text-sm font-medium">
            Henüz menü yok.
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={orderedItems}
            onReorder={setOrderedItems}
            className="space-y-3"
          >
            {orderedItems.map((row, idx) => (
              <Reorder.Item
                key={row.id}
                value={row}
                onDragEnd={() => void persistReorder(orderedItems)}
                className="list-none"
              >
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 md:p-4"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="cursor-grab active:cursor-grabbing rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:text-zinc-900 bg-white"
                      aria-label="Sürükleyerek sırala"
                    >
                      <FaGripVertical />
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-zinc-900 truncate">
                        {row.labelUppercase ? row.label.toUpperCase() : row.label}
                      </p>
                      <p className="text-xs font-mono text-zinc-500 truncate">
                        {row.href}
                      </p>
                    </div>

                    <span className="text-xs font-mono text-zinc-400">
                      #{idx + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() => void toggleActive(row)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                        row.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                      }`}
                    >
                      {row.isActive ? <FaEye /> : <FaEyeSlash />}
                      {row.isActive ? "Aktif" : "Pasif"}
                    </button>

                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="p-2 rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-900 hover:text-white transition-colors"
                      aria-label="Düzenle"
                    >
                      <FaEdit className="text-xs" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(row.id)}
                      className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors"
                      aria-label="Sil"
                    >
                      <FaTrash className="text-xs" />
                    </button>
                  </div>

                  {Array.isArray(row.children) && row.children.length > 0 && (
                    <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-2.5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">
                        Alt linkler
                      </p>
                      <div className="space-y-1">
                        {row.children.map((child, childIdx) => (
                          <p key={`${row.id}-${childIdx}`} className="text-xs text-zinc-600 truncate">
                            - {child.label} ({child.href})
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-150 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-900/40"
              onClick={() => setModalOpen(false)}
            />
            <motion.form
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              onSubmit={save}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-zinc-100 p-6 space-y-4 max-h-[88vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-black text-zinc-900">
                {editing ? "Menü öğesini düzenle" : "Yeni menü öğesi"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                    Etiket
                  </label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium outline-none focus:border-zinc-900"
                    value={form.label}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, label: e.target.value }))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                    Link
                  </label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm font-mono outline-none focus:border-zinc-900"
                    value={form.href}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, href: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-zinc-700">
                  <input
                    type="checkbox"
                    checked={form.labelUppercase}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, labelUppercase: e.target.checked }))
                    }
                  />
                  Büyük harf
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-zinc-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isActive: e.target.checked }))
                    }
                  />
                  Yayında
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-zinc-700">
                  <FaExternalLinkAlt className="text-zinc-400 text-xs" />
                  <input
                    type="checkbox"
                    checked={form.openInNewTab}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, openInNewTab: e.target.checked }))
                    }
                  />
                  Yeni sekmede aç
                </label>
              </div>

              <div className="rounded-xl border border-zinc-100 p-3 bg-zinc-50/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    Alt linkler (dropdown)
                  </p>
                  <button
                    type="button"
                    onClick={addChild}
                    className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-bold text-zinc-600 hover:text-zinc-900"
                  >
                    + Alt link
                  </button>
                </div>
                <div className="space-y-2">
                  {(form.children ?? []).map((child, index) => (
                    <div key={index} className="rounded-lg border border-zinc-200 bg-white p-2.5 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                          placeholder="Alt link etiketi"
                          className="w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-sm outline-none focus:border-zinc-900"
                          value={child.label}
                          onChange={(e) => updateChild(index, { label: e.target.value })}
                        />
                        <input
                          placeholder="/categories/..."
                          className="w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-sm font-mono outline-none focus:border-zinc-900"
                          value={child.href}
                          onChange={(e) => updateChild(index, { href: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs font-bold text-zinc-600">
                          <input
                            type="checkbox"
                            checked={child.openInNewTab}
                            onChange={(e) =>
                              updateChild(index, { openInNewTab: e.target.checked })
                            }
                          />
                          Yeni sekmede aç
                        </label>
                        <button
                          type="button"
                          onClick={() => removeChild(index)}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700"
                        >
                          Alt linki sil
                        </button>
                      </div>
                    </div>
                  ))}
                  {(form.children ?? []).length === 0 && (
                    <p className="text-xs text-zinc-400">Bu menü öğesi için alt link yok.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-bold text-zinc-500 hover:bg-zinc-50"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-zinc-900 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
                >
                  Kaydet
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
