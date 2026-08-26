"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import {
   FaPlus,
   FaEdit,
   FaTrash,
   FaSearch,
   FaChevronRight,
   FaChevronDown,
   FaTag,
   FaLayerGroup,
   FaBoxOpen,
   FaCheckCircle,
   FaExclamationTriangle,
   FaTimes,
   FaArrowRight,
   FaLink,
   FaFolderOpen,
   FaUpload,
   FaImage,
} from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

// ── Tipler ───────────────────────────────────────────────────────────────────
interface Category {
   id: number
   name: string
   slug: string
   description: string | null
   imageUrl: string | null
   parentId: number | null
   _count?: {
      products: number
      children: number
   }
   children?: Category[]
}

// ── BİLEŞENLER ───────────────────────────────────────────────────────────────

function Modal({ isOpen, onClose, title, children }: any) {
   return (
      <AnimatePresence>
         {isOpen && (
            <div className="fixed inset-0 z-150 flex items-center justify-center p-4">
               <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={onClose}
                  className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
               />
               <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative w-full max-w-xl overflow-hidden rounded-[32px] bg-white shadow-2xl"
               >
                  <div className="flex items-center justify-between border-b border-zinc-100 px-8 py-6">
                     <h3 className="text-[17px] font-black text-zinc-900 tracking-tight">{title}</h3>
                     <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                        <FaTimes className="h-4 w-4" />
                     </button>
                  </div>
                  <div className="p-8">{children}</div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
   )
}

function CategoryCard({
   category,
   onEdit,
   onDelete,
   onAddSub,
   allCategories,
}: {
   category: Category
   onEdit: (c: Category) => void
   onDelete: (id: number) => void
   onAddSub: (parentId: number) => void
   allCategories: Category[]
}) {
   const [isExpanded, setIsExpanded] = useState(false)
   const children = allCategories.filter(c => c.parentId === category.id)

   return (
      <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm transition-all hover:shadow-md ring-1 ring-zinc-100">
         <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
               <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#4f6f52]/5 text-[#4f6f52] shadow-sm ring-1 ring-[#4f6f52]/10">
                  {category.imageUrl ? (
                     <img src={category.imageUrl} alt={category.name} className="h-full w-full object-cover" />
                  ) : (
                     <FaFolderOpen className="h-5 w-5" />
                  )}
               </div>
               <div>
                  <h4 className="text-[15px] font-bold text-zinc-800">{category.name}</h4>
                  <div className="flex items-center gap-2">
                     <span className="text-[11px] font-mono text-zinc-400">/{category.slug}</span>
                     {category._count && (
                        <>
                           <span className="h-1 w-1 rounded-full bg-zinc-200" />
                           <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                              {category._count.products} Ürün
                           </span>
                        </>
                     )}
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-2">
               {children.length > 0 && (
                  <button
                     onClick={() => setIsExpanded(!isExpanded)}
                     className={`flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-100 text-zinc-400 transition-all hover:bg-zinc-50
                      ${isExpanded ? "rotate-180 text-[#4f6f52]" : ""}`}
                  >
                     <FaChevronDown className="h-3 w-3" />
                  </button>
               )}
               <button
                  onClick={() => onAddSub(category.id)}
                  title="Alt Kategori Ekle"
                  className="flex h-9 items-center gap-2 rounded-lg bg-zinc-50 px-3 text-[11px] font-bold text-zinc-500 transition-all hover:bg-[#4f6f52] hover:text-white"
               >
                  <FaPlus className="h-2.5 w-2.5" />ALT KATEGORİ EKLE
               </button>
               <button
                  onClick={() => onEdit(category)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-100 text-zinc-400 hover:text-blue-500 transition-all"
               >
                  <FaEdit className="h-3.5 w-3.5" />
               </button>
               <button
                  onClick={() => onDelete(category.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-100 text-zinc-400 hover:text-red-500 transition-all"
               >
                  <FaTrash className="h-3 w-3" />
               </button>
            </div>
         </div>

         <AnimatePresence>
            {isExpanded && children.length > 0 && (
               <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-zinc-50/50 border-t border-zinc-100"
               >
                  <div className="space-y-1 p-4">
                     {children.map(sub => (
                        <div
                           key={sub.id}
                           className="flex items-center justify-between rounded-xl border border-transparent bg-white p-3 shadow-sm ring-1 ring-zinc-200/50 transition-all hover:border-[#4f6f52]/20"
                        >
                           <div className="flex items-center gap-3 pl-2">
                              <FaChevronRight className="h-2 w-2 text-[#4f6f52]" />
                              <span className="text-[13px] font-bold text-zinc-700">{sub.name}</span>
                              <span className="text-[10px] font-mono text-zinc-400">/{sub.slug}</span>
                           </div>
                           <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-md uppercase tracking-widest">
                                 {sub._count?.products || 0} ÜRÜN
                              </span>
                              <div className="flex items-center gap-1">
                                 <button onClick={() => onEdit(sub)} className="p-1.5 text-zinc-300 hover:text-blue-500 transition-colors">
                                    <FaEdit className="h-3 w-3" />
                                 </button>
                                 <button onClick={() => onDelete(sub.id)} className="p-1.5 text-zinc-300 hover:text-red-500 transition-colors">
                                    <FaTrash className="h-3 w-3" />
                                 </button>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </motion.div>
            )}
         </AnimatePresence>
      </div>
   )
}

// ── ANA BİLEŞEN ──────────────────────────────────────────────────────────────

export default function CategoriesPage() {
   const [categories, setCategories] = useState<Category[]>([])
   const [loading, setLoading] = useState(true)
   const [search, setSearch] = useState("")
   const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

   // Modal State
   const [isModalOpen, setIsModalOpen] = useState(false)
   const [editingCategory, setEditingCategory] = useState<Category | null>(null)
   const [isUploading, setIsUploading] = useState(false)
   const [form, setForm] = useState({ name: "", slug: "", description: "", imageUrl: "", parentId: "" as string | number })

   const fileInputRef = useRef<HTMLInputElement>(null)

   const fetchCategories = async () => {
      setLoading(true)
      try {
         const res = await fetch("/api/categories")
         const data = await res.json()
         setCategories(data.items ?? data ?? [])
      } catch {
         showToast("Veriler yüklenirken bir hata oluştu.", false)
      } finally {
         setLoading(false)
      }
   }

   useEffect(() => {
      fetchCategories()
   }, [])

   const showToast = (msg: string, ok: boolean) => {
      setToast({ msg, ok })
      setTimeout(() => setToast(null), 4000)
   }

   const handleOpenModal = (cat?: Category, parentId?: number) => {
      if (cat) {
         setEditingCategory(cat)
         setForm({
            name: cat.name,
            slug: cat.slug,
            description: cat.description || "",
            imageUrl: cat.imageUrl || "",
            parentId: cat.parentId || "",
         })
      } else {
         setEditingCategory(null)
         setForm({ name: "", slug: "", description: "", imageUrl: "", parentId: parentId || "" })
      }
      setIsModalOpen(true)
   }

   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onloadend = async () => {
         if (typeof reader.result === 'string') {
            const base64 = reader.result
            setIsUploading(true)
            try {
               const res = await fetch("/api/admin/upload", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ image: base64, folder: "categories" })
               })
               const data = await res.json()
               if (res.ok && data.url) {
                  setForm(prev => ({ ...prev, imageUrl: data.url }))
               } else {
                  alert(data.message || "Yükleme başarısız.")
               }
            } catch (error) {
               console.error("Upload error:", error)
               alert("Görsel yüklenirken bir hata oluştu.")
            } finally {
               setIsUploading(false)
            }
         }
      }
      reader.readAsDataURL(file)
      if (fileInputRef.current) fileInputRef.current.value = ""
   }

   const handleNameChange = (name: string) => {
      const slug = name
         .toLowerCase()
         .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
         .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
         .replace(/[^a-z0-9]+/g, "-")
         .replace(/^-|-$/g, "")
      setForm(prev => ({ ...prev, name, slug: prev.slug === "" || prev.slug === toSlug(prev.name) ? slug : prev.slug }))
   }

   const toSlug = (val: string) => val.toLowerCase().replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      const method = editingCategory ? "PUT" : "POST"
      const url = editingCategory ? `/api/admin/categories/${editingCategory.id}` : "/api/categories"

      try {
         const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               ...form,
               parentId: form.parentId === "" ? null : Number(form.parentId),
            }),
         })

         const data = await res.json()
         if (res.ok) {
            showToast(editingCategory ? "Kategori güncellendi." : "Yeni kategori eklendi.", true)
            setIsModalOpen(false)
            fetchCategories()
         } else {
            showToast(data.message || "Bir hata oluştu.", false)
         }
      } catch {
         showToast("Sunucu hatası.", false)
      }
   }

   const handleDelete = async (id: number) => {
      if (!window.confirm("Bu kategoriyi silmek istediğinizden emin misiniz?")) return

      try {
         const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" })
         const data = await res.json()
         if (res.ok) {
            showToast("Kategori silindi.", true)
            fetchCategories()
         } else {
            showToast(data.message || "Silme işlemi başarısız.", false)
         }
      } catch {
         showToast("Sunucu hatası.", false)
      }
   }

   const filteredCategories = useMemo(() => {
      return categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
   }, [categories, search])

   const rootCategories = useMemo(() => {
      return filteredCategories.filter(c => c.parentId === null)
   }, [filteredCategories])

   return (
      <div className="mx-auto max-w-7xl pb-24 px-4 sm:px-6">

         {/* ── TOAST ──────────────────────────────────────────────────────── */}
         <AnimatePresence>
            {toast && (
               <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`fixed right-6 top-8 z-200 flex items-center gap-3 rounded-2xl px-6 py-4 shadow-2xl backdrop-blur-md border-l-4
               ${toast.ok ? "border-emerald-500 bg-emerald-50/95 text-emerald-800" : "border-red-500 bg-red-50/95 text-red-800"}`}
               >
                  {toast.ok ? <FaCheckCircle className="h-4 w-4" /> : <FaExclamationTriangle className="h-4 w-4" />}
                  <span className="text-[14px] font-bold">{toast.msg}</span>
               </motion.div>
            )}
         </AnimatePresence>

         {/* ── BREADCRUMB ─────────────────────────────────────────────────── */}
         <nav className="mb-8 flex items-center gap-2 text-[11.5px] font-medium text-zinc-400">
            <Link href="/admin" className="hover:text-zinc-600 transition-colors">Dashboard</Link>
            <FaArrowRight className="h-2 w-2 opacity-50" />
            <span className="text-[#4f6f52] font-bold">Kategori Yönetimi</span>
         </nav>

         {/* ── HEADER ─────────────────────────────────────────────────────── */}
         <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
               <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Kategori & Alt Kategoriler</h1>
               <p className="mt-1 text-[13px] text-zinc-400 font-medium">Ürünlerinizi organize edin, SEO odaklı kategoriler oluşturun.</p>
            </div>
            <div className="flex items-center gap-3">
               <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-300" />
                  <input
                     type="text"
                     value={search}
                     onChange={e => setSearch(e.target.value)}
                     placeholder="Kategori ara..."
                     className="h-11 w-64 rounded-xl border border-zinc-200 bg-white pl-9 pr-4 text-[13px] outline-none transition-all focus:border-[#4f6f52] focus:ring-4 focus:ring-[#4f6f52]/5"
                  />
               </div>
               <button
                  onClick={() => handleOpenModal()}
                  className="flex items-center gap-3 rounded-xl bg-[#4f6f52] px-6 py-3 text-[14px] font-black text-white shadow-xl shadow-[#4f6f52]/20 transition-all hover:bg-[#3d5a3f] hover:translate-y-[-2px] active:translate-y-0"
               >
                  <FaPlus className="h-3 w-3" /> Yeni Kategori
               </button>
            </div>
         </div>

         {/* ── LİSTE ──────────────────────────────────────────────────────── */}
         {loading ? (
            <div className="flex h-[40vh] flex-col items-center justify-center gap-4">
               <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-100 border-t-[#4f6f52]" />
               <p className="text-[13px] font-medium text-zinc-400">Kategoriler taranıyor...</p>
            </div>
         ) : rootCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-zinc-200 bg-white py-24 text-center">
               <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-50 text-zinc-200 mb-6">
                  <FaTag className="h-10 w-10" />
               </div>
               <h3 className="text-[17px] font-black text-zinc-900">Henüz kategori bulunmuyor</h3>
               <p className="mt-2 max-w-[300px] text-[13px] text-zinc-400">Ürünlerinizi doğru gruplandırmak için ilk ana kategorinizi oluşturun.</p>
               <button onClick={() => handleOpenModal()} className="mt-8 rounded-xl bg-[#4f6f52] px-8 py-3 text-[13px] font-black text-white transition-all hover:scale-105">
                  İLK KATEGORİYİ EKLE
               </button>
            </div>
         ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
               {rootCategories.map(cat => (
                  <CategoryCard
                     key={cat.id}
                     category={cat}
                     allCategories={categories}
                     onEdit={handleOpenModal}
                     onDelete={handleDelete}
                     onAddSub={parentId => handleOpenModal(undefined, parentId)}
                  />
               ))}
            </div>
         )}

         {/* ── MODAL ──────────────────────────────────────────────────────── */}
         <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={editingCategory ? "Kategoriyi Düzenle" : "Yeni Kategori Ekle"}
         >
            <form onSubmit={handleSubmit} className="space-y-6">
               <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
               />
               <div className="space-y-2">
                  <label className="text-[12.5px] font-bold text-zinc-700">Kategori Adı</label>
                  <input
                     required
                     type="text"
                     value={form.name}
                     onChange={e => handleNameChange(e.target.value)}
                     placeholder="Örn: Yeni Doğan Bebek"
                     className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-[14px] outline-none focus:border-[#4f6f52] focus:bg-white"
                  />
               </div>

               <div className="space-y-2">
                  <div className="flex items-center justify-between">
                     <label className="text-[12.5px] font-bold text-zinc-700">URL Uzantısı (Slug)</label>
                     <span className="text-[10px] font-black text-zinc-300 uppercase">Arama Motoru Dostu</span>
                  </div>
                  <div className="relative">
                     <FaLink className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-300" />
                     <input
                        required
                        type="text"
                        value={form.slug}
                        onChange={e => setForm({ ...form, slug: toSlug(e.target.value) })}
                        className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-11 pr-4 text-[13px] font-mono text-zinc-500 outline-none focus:border-[#4f6f52] focus:bg-white"
                     />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[12.5px] font-bold text-zinc-700">Üst Kategori</label>
                  <select
                     value={form.parentId}
                     onChange={e => setForm({ ...form, parentId: e.target.value })}
                     className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-[14px] outline-none focus:border-[#4f6f52] focus:bg-white appearance-none cursor-pointer"
                  >
                     <option value="">Ana Kategori Olarak Kalsın</option>
                     {categories
                        .filter(c => c.parentId === null && (!editingCategory || c.id !== editingCategory.id))
                        .map(c => (
                           <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                  </select>
               </div>

               <div className="space-y-2">
                  <div className="flex items-center justify-between">
                     <label className="text-[12.5px] font-bold text-zinc-700">Kategori Görseli</label>
                     <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[11px] font-black text-[#4f6f52] uppercase hover:underline"
                     >
                        DOSYA YÜKLE
                     </button>
                  </div>
                  <div className="flex gap-4">
                     <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/50 flex items-center justify-center text-zinc-300">
                        {form.imageUrl ? (
                           <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                           <FaImage className="h-5 w-5" />
                        )}
                     </div>
                     <div className="relative flex-1">
                        <FaLink className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-300" />
                        <input
                           type="text"
                           value={form.imageUrl}
                           onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                           placeholder="Veya görsel URL'si yapıştırın..."
                           className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-11 pr-4 text-[13px] outline-none focus:border-[#4f6f52] focus:bg-white"
                        />
                     </div>
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[12.5px] font-bold text-zinc-700">Açıklama (Opsiyonel)</label>
                  <textarea
                     rows={3}
                     value={form.description}
                     onChange={e => setForm({ ...form, description: e.target.value })}
                     className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 text-[13.5px] outline-none focus:border-[#4f6f52] focus:bg-white resize-none"
                     placeholder="Kategori hakkında kısa bir bilgi..."
                  />
               </div>

               <div className="pt-4">
                  <button
                     type="submit"
                     className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#4f6f52] py-4 text-[15px] font-black text-white shadow-xl shadow-[#4f6f52]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                     {editingCategory ? "DEĞİŞİKLİKLERİ KAYDET" : "KATEGORİYİ OLUŞTUR"}
                  </button>
               </div>
            </form>
         </Modal>

         <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #e4e4e7; border-radius: 10px; }
         `}</style>
      </div>
   )
}
