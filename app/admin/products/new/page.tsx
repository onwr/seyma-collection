"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
   FaChevronLeft,
   FaPlus,
   FaTrash,
   FaSave,
   FaImage,
   FaTag,
   FaInfoCircle,
   FaLayerGroup,
   FaCheckCircle,
   FaTimes,
   FaGlobe,
   FaBold,
   FaItalic,
   FaUnderline,
   FaListUl,
   FaListOl,
   FaQuoteLeft,
   FaLink,
   FaAlignLeft,
   FaAlignCenter,
   FaAlignRight,
   FaRedo,
   FaUndo,
   FaBarcode,
   FaEye,
   FaStar,
   FaGripVertical,
   FaExclamationTriangle,
   FaQuestionCircle,
   FaArrowRight,
} from "react-icons/fa"
import { motion, AnimatePresence, Reorder } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import CharacterCount from "@tiptap/extension-character-count"
import Placeholder from "@tiptap/extension-placeholder"
import LinkExtension from "@tiptap/extension-link"

// ── Tipler ───────────────────────────────────────────────────────────────────
interface Variant {
   id: string
   name: string
   sku: string
   price: string
   stock: string
   lowStockThreshold: string
}

interface SubCategory {
   id: number
   name: string
   categoryId: number
}

// ── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({
   checked,
   onChange,
   label,
   description,
}: {
   checked: boolean
   onChange: (v: boolean) => void
   label: string
   description?: string
}) {
   return (
      <div className="flex items-center justify-between gap-4 p-1">
         <div>
            <p className="text-[13px] font-medium text-zinc-700">{label}</p>
            {description && <p className="text-[11.5px] text-zinc-400 mt-0.5">{description}</p>}
         </div>
         <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative h-6 w-10 shrink-0 rounded-full transition-all duration-300
          ${checked ? "bg-[#4f6f52] shadow-[0_0_10px_rgba(79,111,82,0.3)]" : "bg-zinc-200"}`}
         >
            <span
               className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center
            ${checked ? "translate-x-4" : "translate-x-0"}`}
            >
               {checked && <div className="h-1.5 w-1.5 rounded-full bg-[#4f6f52]" />}
            </span>
         </button>
      </div>
   )
}

// ── TipTap Toolbar ────────────────────────────────────────────────────────────
function EditorToolbar({ editor }: { editor: any }) {
   if (!editor) return null

   const setLink = () => {
      const previousUrl = editor.getAttributes("link").href
      const url = window.prompt("URL giriniz:", previousUrl)

      if (url === null) return
      if (url === "") {
         editor.chain().focus().extendMarkRange("link").unsetLink().run()
         return
      }
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
   }

   const btn = (active: boolean, onClick: () => void, icon: React.ReactNode, title?: string) => (
      <button
         type="button"
         title={title}
         onMouseDown={(e) => e.preventDefault()}
         onClick={onClick}
         className={`flex h-8 w-8 items-center justify-center rounded-lg text-[13px] transition-all duration-200
        ${active
               ? "bg-[#4f6f52] text-white shadow-sm scale-105"
               : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"}`}
      >
         {icon}
      </button>
   )

   const toggleBold = () => {
      const chain = editor.chain().focus()
      if (editor.isActive("bold")) chain.unsetBold().run()
      else chain.setBold().run()
   }

   const toggleItalic = () => {
      const chain = editor.chain().focus()
      if (editor.isActive("italic")) chain.unsetItalic().run()
      else chain.setItalic().run()
   }

   const toggleUnderline = () => {
      const chain = editor.chain().focus()
      if (editor.isActive("underline")) chain.unsetUnderline().run()
      else chain.setUnderline().run()
   }

   return (
      <div className="flex flex-wrap items-center gap-1 rounded-t-xl border border-zinc-200
                    bg-zinc-50/80 px-3 py-2 backdrop-blur-sm">
         {/* Geçmiş */}
         <div className="flex items-center gap-0.5">
            {btn(false, () => editor.chain().focus().undo().run(), <FaUndo />, "Geri Al")}
            {btn(false, () => editor.chain().focus().redo().run(), <FaRedo />, "İleri Al")}
         </div>

         <div className="mx-2 h-5 w-px bg-zinc-200" />

         {/* Başlık seçici */}
         <div className="relative group">
            <select
               onChange={e => {
                  const v = e.target.value
                  if (v === "p") editor.chain().focus().setParagraph().run()
                  else editor.chain().focus().toggleHeading({ level: Number(v) as any }).run()
               }}
               value={
                  editor.isActive("heading", { level: 2 }) ? "2"
                     : editor.isActive("heading", { level: 3 }) ? "3"
                        : editor.isActive("heading", { level: 4 }) ? "4"
                           : "p"
               }
               className="h-8 rounded-lg border border-zinc-200 bg-white px-3 pr-8 text-[12px] font-medium text-zinc-600 outline-none transition-all focus:border-[#4f6f52] appearance-none cursor-pointer"
            >
               <option value="p">Gövde Metni</option>
               <option value="2">Büyük Başlık (H2)</option>
               <option value="3">Orta Başlık (H3)</option>
               <option value="4">Küçük Başlık (H4)</option>
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400">▼</div>
         </div>

         <div className="mx-2 h-5 w-px bg-zinc-200" />

         {/* Metin biçimi */}
         <div className="flex items-center gap-0.5">
            {btn(editor.isActive("bold"), toggleBold, <FaBold />, "Kalın")}
            {btn(editor.isActive("italic"), toggleItalic, <FaItalic />, "İtalik")}
            {btn(editor.isActive("underline"), toggleUnderline, <FaUnderline />, "Altı Çizili")}
            {btn(editor.isActive("link"), setLink, <FaLink />, "Link Ekle")}
         </div>

         <div className="mx-2 h-5 w-px bg-zinc-200" />

         {/* Hizalama */}
         <div className="flex items-center gap-0.5">
            {btn(editor.isActive({ textAlign: "left" }), () => editor.chain().focus().setTextAlign("left").run(), <FaAlignLeft />, "Sola Yasla")}
            {btn(editor.isActive({ textAlign: "center" }), () => editor.chain().focus().setTextAlign("center").run(), <FaAlignCenter />, "Ortala")}
            {btn(editor.isActive({ textAlign: "right" }), () => editor.chain().focus().setTextAlign("right").run(), <FaAlignRight />, "Sağa Yasla")}
         </div>

         <div className="mx-2 h-5 w-px bg-zinc-200" />

         {/* Liste */}
         <div className="flex items-center gap-0.5">
            {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), <FaListUl />, "Madde İşaretli Liste")}
            {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), <FaListOl />, "Numaralı Liste")}
            {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), <FaQuoteLeft />, "Alıntı")}
         </div>
      </div>
   )
}

// ── Rich Text Editor ──────────────────────────────────────────────────────────
function RichEditor({
   value,
   onChange,
}: {
   value: string
   onChange: (html: string) => void
}) {
   const editor = useEditor({
      immediatelyRender: false,
      extensions: [
         StarterKit,
         Underline,
         TextAlign.configure({ types: ["heading", "paragraph"] }),
         CharacterCount,
         LinkExtension.configure({
            openOnClick: false,
            HTMLAttributes: { class: 'text-blue-600 underline cursor-pointer' },
            validate: (url) => /^https?:\/\//.test(url),
         }),
         Placeholder.configure({ placeholder: "Ürün özelliklerini, malzeme bilgilerini ve kullanım talimatlarını buraya detaylıca yazın..." }),
      ],
      content: value,
      onUpdate: ({ editor }) => onChange(editor.getHTML()),
      editorProps: {
         attributes: {
            class:
               "min-h-[300px] max-h-[600px] overflow-y-auto px-6 py-5 text-[14px] leading-relaxed text-zinc-700 outline-none",
         },
      },
   })

   const charCount = editor?.storage.characterCount?.characters() ?? 0

   return (
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all duration-300 focus-within:border-[#4f6f52] focus-within:ring-2 focus-within:ring-[#4f6f52]/5">
         <EditorToolbar editor={editor} />

         {/* Editör içeriği — TipTap global stilleri */}
         <style>{`
        .tiptap h2 { font-size:1.4rem; font-weight:700; margin:1.5rem 0 0.75rem; color:#111827; line-height: 1.2 }
        .tiptap h3 { font-size:1.2rem; font-weight:700; margin:1.25rem 0 0.5rem; color:#111827 }
        .tiptap h4 { font-size:1.1rem; font-weight:700; margin:1rem 0 0.5rem; color:#111827 }
        .tiptap ul  { list-style:disc;   padding-left:1.5rem; margin:0.75rem 0 }
        .tiptap ol  { list-style:decimal; padding-left:1.5rem; margin:0.75rem 0 }
        .tiptap li  { margin:0.35rem 0 }
        .tiptap blockquote { border-left:4px solid #4f6f52; padding-left:1.25rem; color:#4b5563; font-style:italic; margin:1.25rem 0; background:#f9fafb; padding-top:0.5rem; padding-bottom:0.5rem; border-radius:0 4px 4px 0 }
        .tiptap p.is-editor-empty:first-child::before { content:attr(data-placeholder); color:#9ca3af; pointer-events:none; float:left; height:0 }
        .tiptap p { margin: 0.75rem 0 }
        .tiptap a { color: #2563eb; text-decoration: underline; font-weight: 500 }
      `}</style>

         <EditorContent editor={editor} className="tiptap" />

         <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/50 px-4 py-2">
            <div className="flex items-center gap-2">
               <div className={`h-2 w-2 rounded-full ${charCount > 100 ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
               <span className="text-[11px] text-zinc-400 font-medium">Tip: Detaylı açıklamalar SEO için daha iyidir.</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400 bg-white px-2 py-0.5 rounded border border-zinc-200 shadow-sm">{charCount} Karakter</span>
         </div>
      </div>
   )
}

// ── Görsel satırı ─────────────────────────────────────────────────────────────
function ImageRow({
   url,
   index,
   isFirst,
   onRemove,
   onMoveUp,
   onMoveDown,
   isLast,
}: {
   url: string
   index: number
   isFirst: boolean
   onRemove: () => void
   onMoveUp: () => void
   onMoveDown: () => void
   isLast: boolean
}) {
   return (
      <motion.div
         layout
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         exit={{ opacity: 0, scale: 0.95 }}
         className="group relative flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3
                 transition-all hover:bg-white hover:shadow-md hover:border-[#4f6f52]/20"
      >
         <div className="cursor-grab active:cursor-grabbing p-1 text-zinc-300 hover:text-zinc-500 transition-colors">
            <FaGripVertical className="h-3.5 w-3.5" />
         </div>

         <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 border-white shadow-sm ring-1 ring-zinc-200 bg-white">
            <img src={url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
            {isFirst && (
               <div className="absolute top-0 left-0 right-0 bg-[#4f6f52] py-0.5 flex items-center justify-center">
                  <span className="text-[7.5px] font-bold uppercase tracking-wider text-white">ANA GÖRSEL</span>
               </div>
            )}
         </div>

         <div className="flex-1 overflow-hidden">
            <p className="truncate text-[11.5px] font-mono text-zinc-500">{url}</p>
            <div className="mt-1 flex items-center gap-2">
               <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${isFirst ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-200 text-zinc-500'}`}>
                  {isFirst ? 'Vitrin' : `Sıra: ${index + 1}`}
               </span>
               <span className="text-[9px] text-zinc-400 italic">Orijinal Boyut</span>
            </div>
         </div>

         <div className="flex items-center gap-1.5 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 translate-x-2">
            <div className="flex flex-col gap-1">
               <button
                  type="button"
                  onClick={onMoveUp}
                  disabled={isFirst}
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-white border border-zinc-200 text-zinc-400 hover:text-[#4f6f52] hover:border-[#4f6f52] transition-all disabled:opacity-30 disabled:pointer-events-none shadow-sm"
                  title="Yukarı Taşı"
               >
                  <span className="text-[10px]">▲</span>
               </button>
               <button
                  type="button"
                  onClick={onMoveDown}
                  disabled={isLast}
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-white border border-zinc-200 text-zinc-400 hover:text-[#4f6f52] hover:border-[#4f6f52] transition-all disabled:opacity-30 disabled:pointer-events-none shadow-sm"
                  title="Aşağı Taşı"
               >
                  <span className="text-[10px]">▼</span>
               </button>
            </div>
            <button
               type="button"
               onClick={onRemove}
               className="flex h-12 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
               title="Sil"
            >
               <FaTrash className="h-3 w-3" />
            </button>
         </div>
      </motion.div>
   )
}

// ── Bölüm başlığı ─────────────────────────────────────────────────────────────
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
   return (
      <div className="group/tip relative flex items-center">
         {children}
         <div className="absolute bottom-full left-1/2 mb-2.5 hidden -translate-x-1/2 rounded-xl bg-zinc-900 px-3.5 py-2 text-[10.5px] font-medium leading-relaxed text-white shadow-2xl group-hover/tip:block whitespace-normal w-48 z-100 border border-white/10 ring-1 ring-black/5 text-center">
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
               {text}
               <div className="absolute top-full left-1/2 -ml-1.5 border-[6px] border-transparent border-t-zinc-900" />
            </motion.div>
         </div>
      </div>
   )
}

function SectionHeader({ icon, title, action, subtitle }: { icon: React.ReactNode; title: string; action?: React.ReactNode; subtitle?: string }) {
   return (
      <div className="mb-6 flex flex-col gap-1 border-b border-zinc-100 pb-4">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4f6f52]/5 text-[#4f6f52] shadow-sm ring-1 ring-[#4f6f52]/10">
                  {icon}
               </div>
               <div>
                  <h2 className="text-[15px] font-bold text-zinc-800 tracking-tight">{title}</h2>
                  {subtitle && <p className="text-[11.5px] text-zinc-400 mt-0.5">{subtitle}</p>}
               </div>
            </div>
            {action}
         </div>
      </div>
   )
}

// ── Form input ────────────────────────────────────────────────────────────────
function Field({
   label,
   required,
   hint,
   children,
   tooltip,
}: {
   label: string
   required?: boolean
   hint?: string
   children: React.ReactNode
   tooltip?: string
}) {
   return (
      <div className="group/field">
         <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
               <label className="text-[12.5px] font-semibold text-zinc-600 group-focus-within/field:text-[#4f6f52] transition-colors">
                  {label}
               </label>
               {required && <span className="text-[14px] leading-none text-red-500 font-bold">*</span>}
               {tooltip && (
                  <Tooltip text={tooltip}>
                     <FaQuestionCircle className="h-3 w-3 text-zinc-300 hover:text-zinc-500 transition-colors cursor-help" />
                  </Tooltip>
               )}
            </div>
            {hint && <span className="text-[10.5px] font-medium text-zinc-400 italic">{hint}</span>}
         </div>
         {children}
      </div>
   )
}

const INPUT_CLS = "h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/30 px-4 text-[13.5px] text-zinc-800 outline-none transition-all duration-300 focus:border-[#4f6f52] focus:bg-white focus:ring-4 focus:ring-[#4f6f52]/5 placeholder:text-zinc-300"
const SELECT_CLS = "h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/30 px-4 text-[13.5px] text-zinc-800 outline-none transition-all duration-300 focus:border-[#4f6f52] focus:bg-white focus:ring-4 focus:ring-[#4f6f52]/5 cursor-pointer appearance-none"
const TEXTAREA_CLS = "w-full rounded-xl border border-zinc-200 bg-zinc-50/30 p-4 text-[13.5px] text-zinc-800 outline-none transition-all duration-300 focus:border-[#4f6f52] focus:bg-white focus:ring-4 focus:ring-[#4f6f52]/5 resize-none placeholder:text-zinc-300"

// ── Yeni UUID ─────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9)

// ── ANA BİLEŞEN ──────────────────────────────────────────────────────────────
export default function NewProduct() {
   const router = useRouter()
   const [loading, setLoading] = useState(false)
   const [categories, setCategories] = useState<any[]>([])
   const [subCategories, setSubCategories] = useState<SubCategory[]>([])
   const [extraCategoryIds, setExtraCategoryIds] = useState<number[]>([])
   const [extraCatsOpen, setExtraCatsOpen] = useState(false)
   const [isUploading, setIsUploading] = useState(false)
   const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
   const [activeTab, setActiveTab] = useState<"info" | "seo">("info")
   const [isDraggingFile, setIsDraggingFile] = useState(false)
   const [isPreviewOpen, setIsPreviewOpen] = useState(false)

   const fileInputRef = useRef<HTMLInputElement>(null)

   // ── Form state ──────────────────────────────────────────────────────────
   const [form, setForm] = useState({
      name: "",
      shortDescription: "",
      categoryId: "",
      subCategoryId: "",
      basePrice: "",
      compareAtPrice: "",
      sku: "",
      barcode: "",
      isActive: true,
      isFeatured: false,
      // Vergi
      taxRate: "10",
      isTaxIncluded: true,
      // SEO
      metaTitle: "",
      metaDescription: "",
      slug: "",
   })
   const [description, setDescription] = useState("")
   const [images, setImages] = useState<string[]>([])
   const [imageUrl, setImageUrl] = useState("")
   const [variants, setVariants] = useState<Variant[]>([
      { id: uid(), name: "Standart", sku: "", price: "", stock: "0", lowStockThreshold: "5" },
   ])

   useEffect(() => {
      fetch("/api/categories")
         .then(r => r.json())
         .then(d => {
            const all = d.items ?? d ?? []
            setCategories(all.filter((c: any) => c.parentId === null))
         })
         .catch(() => { })
   }, [])

   // Alt kategorileri getir
   useEffect(() => {
      if (!form.categoryId) {
         setSubCategories([])
         set("subCategoryId", "")
         return
      }

      fetch(`/api/admin/categories/${form.categoryId}/subcategories`)
         .then(r => r.json())
         .then(d => {
            setSubCategories(d.items ?? d ?? [])
         })
         .catch(() => {
            setSubCategories([])
         })
   }, [form.categoryId])

   // Slug otomatik üret (Gelişmiş)
   useEffect(() => {
      if (!form.name) return
      const slug = form.name
         .toLowerCase()
         .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
         .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
         .replace(/[^a-z0-9]+/g, "-")
         .replace(/^-|-$/g, "")
      setForm(prev => ({
         ...prev,
         slug: prev.slug || slug,
         metaTitle: prev.metaTitle || form.name,
         metaDescription: prev.metaDescription || (prev.shortDescription || ""),
      }))
   }, [form.name])

   const set = (name: string, value: any) => setForm(prev => ({ ...prev, [name]: value }))

   const toggleExtraRoot = (root: any, checked: boolean) => {
      const rootId = Number(root.id)
      const children: any[] = Array.isArray(root.children) ? root.children : []
      if (!Number.isInteger(rootId)) return

      if (checked) {
         setExtraCategoryIds(prev => Array.from(new Set([...prev, rootId])))
      } else {
         const childIds = children.map((c) => Number(c.id)).filter((n) => Number.isInteger(n))
         setExtraCategoryIds(prev => prev.filter((id) => id !== rootId && !childIds.includes(id)))
      }
   }

   const toggleExtraChild = (root: any, child: any, checked: boolean) => {
      const rootId = Number(root.id)
      const childId = Number(child.id)
      if (!Number.isInteger(rootId) || !Number.isInteger(childId)) return
      setExtraCategoryIds(prev => {
         if (checked) return Array.from(new Set([...prev, rootId, childId]))
         return prev.filter((id) => id !== childId)
      })
   }

   // ── Görseller ──────────────────────────────────────────────────────────
   const addImage = () => {
      if (!imageUrl.trim()) return
      setImages(prev => [...prev, imageUrl.trim()])
      setImageUrl("")
   }

   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files) return

      setIsUploading(true)
      Array.from(files).forEach(file => {
         const reader = new FileReader()
         reader.onloadend = async () => {
            if (typeof reader.result === 'string') {
               const base64 = reader.result
               try {
                  const res = await fetch("/api/admin/upload", {
                     method: "POST",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({ image: base64, folder: "products" })
                  })
                  const data = await res.json()
                  if (res.ok && data.url) {
                     setImages(prev => [...prev, data.url])
                  }
               } catch (error) {
                  console.error("Upload error:", error)
               } finally {
                  setIsUploading(false)
               }
            }
         }
         reader.readAsDataURL(file)
      })

      if (fileInputRef.current) fileInputRef.current.value = ""
   }

   const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDraggingFile(true)
   }

   const handleDragLeave = () => {
      setIsDraggingFile(false)
   }

   const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDraggingFile(false)
      const files = e.dataTransfer.files
      if (files && files.length > 0) {
         setIsUploading(true)
         Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return
            const reader = new FileReader()
            reader.onloadend = async () => {
               if (typeof reader.result === 'string') {
                  const base64 = reader.result
                  try {
                     const res = await fetch("/api/admin/upload", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ image: base64, folder: "products" })
                     })
                     const data = await res.json()
                     if (res.ok && data.url) {
                        setImages(prev => [...prev, data.url])
                     }
                  } catch (error) {
                     console.error("Upload error:", error)
                  } finally {
                     setIsUploading(false)
                  }
               }
            }
            reader.readAsDataURL(file)
         })
      }
   }

   const removeImage = (i: number) => setImages(prev => prev.filter((_, j) => j !== i))
   const moveImage = (i: number, dir: -1 | 1) => {
      setImages(prev => {
         const arr = [...prev]
         const to = i + dir
         if (to < 0 || to >= arr.length) return arr
            ;[arr[i], arr[to]] = [arr[to], arr[i]]
         return arr
      })
   }

   const generateBarcode = () => {
      // 13 haneli rastgele bir barkod üret (EAN-13 formatına yakın)
      const prefix = "869" // Türkiye prefixi (isteğe bağlı)
      const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')
      const codeWithoutCheck = prefix + random
      
      // Basit bir checksum hesapla (opsiyonel ama daha profesyonel durur)
      let sum = 0
      for (let i = 0; i < 12; i++) {
         sum += parseInt(codeWithoutCheck[i]) * (i % 2 === 0 ? 1 : 3)
      }
      const checkDigit = (10 - (sum % 10)) % 10
      const finalBarcode = codeWithoutCheck + checkDigit
      
      set("barcode", finalBarcode)
   }

   // ── Varyantlar ─────────────────────────────────────────────────────────
   const addVariant = () => {
      // Ana SKU varsa onun sonuna numara ekleyerek otomatik üret
      const newSku = form.sku ? `${form.sku}-V${variants.length + 1}` : ""
      setVariants(prev => [
         ...prev,
         { id: uid(), name: "", sku: newSku, price: form.basePrice, stock: "0", lowStockThreshold: "5" },
      ])
   }
   const removeVariant = (id: string) => {
      if (variants.length <= 1) {
         setToast({ msg: "En az bir varyant bulunmalıdır.", ok: false })
         setTimeout(() => setToast(null), 3000)
         return
      }
      setVariants(prev => prev.filter(v => v.id !== id))
   }
   const setVariantField = (id: string, field: keyof Variant, value: string) =>
      setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v))

   const handleBulkPriceUpdate = () => {
      if (!form.basePrice) return
      if (window.confirm("Tüm varyant fiyatlarını temel fiyata eşitlemek istiyor musunuz?")) {
         setVariants(prev => prev.map(v => ({ ...v, price: form.basePrice })))
      }
   }

   // ── Kaydet ─────────────────────────────────────────────────────────────
   const handleSubmit = async (e?: React.FormEvent) => {
      e?.preventDefault()
      if (!form.name.trim() || !form.basePrice) {
         setToast({ msg: "Lütfen zorunlu alanları (Ad, Fiyat) doldurun.", ok: false })
         setActiveTab("info")
         setTimeout(() => setToast(null), 4000)
         return
      }

      // Ek kategoriler opsiyonel; seçtiysen kural: en az 1 ana kategori, ana kategori altında child varsa en az 1 child
      if (extraCategoryIds.length > 0) {
         const selectedRoots = categories.filter((r: any) => extraCategoryIds.includes(Number(r.id)))
         if (selectedRoots.length === 0) {
            setToast({ msg: "Ek kategoriler için en az 1 ana kategori seçmelisiniz.", ok: false })
            setActiveTab("info")
            setTimeout(() => setToast(null), 4000)
            return
         }
         for (const root of selectedRoots) {
            const children: any[] = Array.isArray(root.children) ? root.children : []
            if (children.length > 0) {
               const ok = children.some((ch) => extraCategoryIds.includes(Number(ch.id)))
               if (!ok) {
                  setToast({ msg: `"${root.name}" için en az 1 alt kategori seçmelisiniz.`, ok: false })
                  setActiveTab("info")
                  setTimeout(() => setToast(null), 5000)
                  return
               }
            }
         }
      }

      setLoading(true)
      try {
         const res = await fetch("/api/admin/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               ...form,
               description,
               images,
               categoryIds: extraCategoryIds,
               variants: variants.map(v => ({
                  ...v,
                  price: v.price || form.basePrice, // Boşsa temel fiyatı al
               }))
            }),
         })

         const data = await res.json()
         if (res.ok) {
            setToast({ msg: "Ürün başarıyla oluşturuldu! Yönlendiriliyorsunuz...", ok: true })
            setTimeout(() => router.push("/admin/products"), 2000)
         } else {
            setToast({ msg: data.message || "Bir hata oluştu. Lütfen tekrar deneyin.", ok: false })
            setTimeout(() => setToast(null), 5000)
         }
      } catch {
         setToast({ msg: "Sunucu bağlantısı kurulamadı. Lütfen internetinizi kontrol edin.", ok: false })
         setTimeout(() => setToast(null), 5000)
      } finally {
         setLoading(false)
      }
   }

   const totalStock = variants.reduce((s, v) => s + Number(v.stock || 0), 0)
   const hasDiscount = form.compareAtPrice && form.basePrice &&
      Number(form.compareAtPrice) < Number(form.basePrice)
   const discountPct = hasDiscount
      ? Math.round(((Number(form.basePrice) - Number(form.compareAtPrice)) / Number(form.basePrice)) * 100)
      : 0

   const profitMargin = useMemo(() => {
      if (!form.basePrice) return null
      const sellPrice = hasDiscount ? Number(form.compareAtPrice) : Number(form.basePrice)
      return sellPrice
   }, [form.basePrice, form.compareAtPrice, hasDiscount])

   return (
      <div className="mx-auto max-w-7xl pb-24 px-4 sm:px-6">

         {/* ── TOAST ──────────────────────────────────────────────────────── */}
         <AnimatePresence>
            {toast && (
               <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  className={`fixed right-6 top-8 z-100 flex items-center gap-3 rounded-2xl px-6 py-4 shadow-2xl backdrop-blur-md border-l-4
              ${toast.ok
                        ? "border-emerald-500 bg-emerald-50/95 text-emerald-800"
                        : "border-red-500 bg-red-50/95 text-red-800"}`}
               >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full
                ${toast.ok ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
                     {toast.ok ? <FaCheckCircle className="h-4 w-4" /> : <FaExclamationTriangle className="h-4 w-4" />}
                  </div>
                  <div className="flex flex-col">
                     <p className="text-[14px] font-bold">{toast.ok ? "Başarılı" : "Hata Oluştu"}</p>
                     <p className="text-[12px] opacity-90">{toast.msg}</p>
                  </div>
                  <button onClick={() => setToast(null)} className="ml-4 text-zinc-400 hover:text-zinc-600">
                     <FaTimes className="h-3 w-3" />
                  </button>
               </motion.div>
            )}
         </AnimatePresence>

         {/* ── BREADCRUMB ─────────────────────────────────────────────────── */}
         <nav className="mb-8 flex items-center gap-2 text-[11.5px] font-medium text-zinc-400">
            <Link href="/admin" className="hover:text-zinc-600 transition-colors">Dashboard</Link>
            <FaArrowRight className="h-2 w-2 opacity-50" />
            <Link href="/admin/products" className="hover:text-zinc-600 transition-colors">Ürün Yönetimi</Link>
            <FaArrowRight className="h-2 w-2 opacity-50" />
            <span className="text-[#4f6f52] font-bold">Yeni Ürün Ekle</span>
         </nav>

         {/* ── HEADER ─────────────────────────────────────────────────────── */}
         <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
               <Link
                  href="/admin/products"
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200
                       bg-white text-zinc-400 shadow-sm transition-all hover:text-zinc-700 hover:shadow-md active:scale-95"
               >
                  <FaChevronLeft className="h-4 w-4" />
               </Link>
               <div>
                  <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Ürün Kataloğu Oluştur</h1>
                  <div className="mt-1 flex items-center gap-3">
                     <p className="text-[13px] text-zinc-400 font-medium">Mağazanız için en ince ayrıntılarıyla yeni bir vitrin ürünü tanımlayın.</p>
                     <span className="h-1 w-1 rounded-full bg-zinc-300" />
                     <span className="text-[11px] font-bold text-[#4f6f52] uppercase tracking-wider bg-[#4f6f52]/10 px-2 py-0.5 rounded-md">Taslak</span>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-3">
               <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-5 py-3
                       text-[13px] font-bold text-zinc-600 shadow-sm transition-all hover:bg-zinc-50 hover:shadow-md"
               >
                  <FaEye className="h-3.5 w-3.5" /> Ön İzleme
               </button>
               <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={loading}
                  className="flex items-center gap-3 rounded-xl bg-[#4f6f52] px-8 py-3 text-[14px]
                       font-black text-white shadow-[0_10px_20px_-5px_rgba(79,111,82,0.4)] transition-all
                       hover:bg-[#3d5a3f] hover:translate-y-[-2px] active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none"
               >
                  {loading
                     ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                     : <FaSave className="h-4 w-4" />}
                  Ürünü Kaydet ve Yayınla
               </button>
            </div>
         </div>

         {/* ── SEKMELER ───────────────────────────────────────────────────── */}
         <div className="mb-8 flex gap-2 rounded-2xl border border-zinc-200/60 bg-white p-1.5 w-fit shadow-sm ring-1 ring-zinc-100">
            {([
               { key: "info", label: "Genel Ürün Bilgileri", icon: <FaInfoCircle className="h-3.5 w-3.5" /> },
               { key: "seo", label: "Arama Motoru (SEO)", icon: <FaGlobe className="h-3.5 w-3.5" /> },
            ] as const).map(tab => (
               <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2.5 rounded-xl px-6 py-2.5 text-[13px] font-bold transition-all duration-300
              ${activeTab === tab.key
                        ? "bg-zinc-900 text-white shadow-lg -translate-y-px"
                        : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"}`}
               >
                  {tab.icon}
                  {tab.label}
                  {activeTab === tab.key && <motion.div layoutId="activeTab" className="h-1.5 w-1.5 rounded-full bg-[#4f6f52]" />}
               </button>
            ))}
         </div>

         <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">

               {/* ══════════════════════════════════════════════════════════════ */}
               {activeTab === "info" && (
                  <motion.div
                     key="info"
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
                     className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]"
                  >
                     {/* SOL KOLON ─────────────────────────────────────────── */}
                     <div className="space-y-8">

                        {/* Kimlik & İçerik */}
                        <section className="rounded-2xl border border-zinc-100 bg-white p-8 shadow-sm ring-1 ring-zinc-100">
                           <SectionHeader
                              icon={<FaInfoCircle className="h-5 w-5" />}
                              title="Ürün Kimliği"
                              subtitle="Ürünün temel tanımlayıcı özelliklerini girin."
                           />
                           <div className="space-y-6">
                              <Field
                                 label="Ürün Adı"
                                 required
                                 tooltip="Müşterilerin göreceği ana başlık. SEO için önemlidir."
                              >
                                 <input
                                    required
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={e => set("name", e.target.value)}
                                    placeholder="Örn: Bebek Pamuklu Zıbın Seti (10 Parça)"
                                    className={INPUT_CLS}
                                 />
                              </Field>

                              <div className="grid grid-cols-2 gap-4">
                                 <Field label="Kategori">
                                    <select
                                       value={form.categoryId}
                                       onChange={e => set("categoryId", e.target.value)}
                                       className={INPUT_CLS + " cursor-pointer"}
                                    >
                                       <option value="">Seçiniz</option>
                                       {categories.map(c => (
                                          <option key={c.id} value={c.id}>{c.name}</option>
                                       ))}
                                    </select>
                                 </Field>
                                 <Field label="Alt Kategori">
                                    <select
                                       value={form.subCategoryId}
                                       onChange={e => set("subCategoryId", e.target.value)}
                                       className={INPUT_CLS + " cursor-pointer disabled:opacity-50 disabled:bg-zinc-100"}
                                       disabled={!form.categoryId || subCategories.length === 0}
                                    >
                                       <option value="">{form.categoryId ? (subCategories.length > 0 ? "Seçiniz" : "Alt kategori yok") : "Önce kategori seçin"}</option>
                                       {subCategories.map(sc => (
                                          <option key={sc.id} value={sc.id}>{sc.name}</option>
                                       ))}
                                    </select>
                                 </Field>
                              </div>

                              <Field
                                 label="Ek Kategoriler (Unisex)"
                                 hint="Ürün birden fazla kategoride listelensin istiyorsanız işaretleyin."
                              >
                                 <button
                                    type="button"
                                    onClick={() => setExtraCatsOpen((v) => !v)}
                                    className="flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/30 px-4 text-[13px] font-medium text-zinc-700 transition hover:bg-zinc-50"
                                 >
                                    <span className="truncate">
                                       {extraCategoryIds.length > 0
                                          ? `${extraCategoryIds.length} seçim`
                                          : "Seçmek için tıklayın"}
                                    </span>
                                    <span className="text-zinc-400">{extraCatsOpen ? "▲" : "▼"}</span>
                                 </button>

                                 {extraCatsOpen && (
                                    <div className="mt-2 max-h-72 overflow-auto rounded-xl border border-zinc-200 bg-white p-3">
                                       <div className="space-y-3">
                                          {categories.map((root: any) => {
                                             const rootId = Number(root.id)
                                             const rootChecked = extraCategoryIds.includes(rootId)
                                             const children: any[] = Array.isArray(root.children) ? root.children : []
                                             return (
                                                <div key={root.id} className="rounded-xl border border-zinc-100 bg-zinc-50/30 p-3">
                                                   <label className="flex items-center gap-2 text-[12.5px] font-semibold text-zinc-800 cursor-pointer">
                                                      <input
                                                         type="checkbox"
                                                         checked={rootChecked}
                                                         onChange={(e) => toggleExtraRoot(root, e.target.checked)}
                                                         className="h-4 w-4 accent-[#4f6f52]"
                                                      />
                                                      <span className="truncate">{root.name}</span>
                                                      {children.length > 0 && (
                                                         <span className="ml-auto text-[11px] font-medium text-zinc-400">
                                                            Alt kategori zorunlu
                                                         </span>
                                                      )}
                                                   </label>

                                                   {children.length > 0 && (
                                                      <div className="mt-2 grid grid-cols-2 gap-2 pl-1">
                                                         {children.map((ch: any) => {
                                                            const childId = Number(ch.id)
                                                            const childChecked = extraCategoryIds.includes(childId)
                                                            return (
                                                               <label
                                                                  key={ch.id}
                                                                  className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[12px] font-medium text-zinc-700 shadow-sm ring-1 ring-zinc-100 cursor-pointer"
                                                               >
                                                                  <input
                                                                     type="checkbox"
                                                                     checked={childChecked}
                                                                     onChange={(e) => toggleExtraChild(root, ch, e.target.checked)}
                                                                     className="h-4 w-4 accent-[#4f6f52]"
                                                                  />
                                                                  <span className="truncate">{ch.name}</span>
                                                               </label>
                                                            )
                                                         })}
                                                      </div>
                                                   )}
                                                </div>
                                             )
                                          })}
                                       </div>
                                    </div>
                                 )}
                              </Field>

                              <div className="grid grid-cols-2 gap-4">
                                 <Field label="SKU (Stok Kodu)">
                                    <input
                                       type="text"
                                       value={form.sku}
                                       onChange={e => set("sku", e.target.value)}
                                       placeholder="Örn: BM-102"
                                       className={INPUT_CLS}
                                    />
                                 </Field>
                                 <Field label="Barkod" hint="EAN, UPC veya ISBN">
                                    <div className="relative flex gap-2">
                                       <div className="relative flex-1">
                                          <FaBarcode className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-300" />
                                          <input
                                             type="text"
                                             value={form.barcode}
                                             onChange={e => set("barcode", e.target.value)}
                                             placeholder="8690000000000"
                                             className={INPUT_CLS + " pl-9"}
                                          />
                                       </div>
                                       <button
                                          type="button"
                                          onClick={generateBarcode}
                                          className="h-11 px-4 rounded-xl border border-zinc-200 bg-zinc-50 text-[11px] font-bold text-zinc-500 hover:bg-zinc-100 transition-colors"
                                       >
                                          OTOMATİK ÜRET
                                       </button>
                                    </div>
                                 </Field>
                              </div>

                              <Field
                                 label="Kısa Özet Açıklama"
                                 hint="Max 250 karakter"
                                 tooltip="Liste sayfasında görselin altında görünen etkileyici metin."
                              >
                                 <textarea
                                    rows={3}
                                    value={form.shortDescription}
                                    onChange={e => set("shortDescription", e.target.value)}
                                    placeholder="Ürününüzü en vurucu şekilde bir iki cümlede anlatın..."
                                    className={TEXTAREA_CLS}
                                    maxLength={250}
                                 />
                                 <div className="mt-2 flex items-center justify-end">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${form.shortDescription.length > 200 ? 'bg-amber-100 text-amber-600' : 'bg-zinc-100 text-zinc-400'}`}>
                                       {form.shortDescription.length} / 250
                                    </span>
                                 </div>
                              </Field>
                           </div>
                        </section>

                        {/* Editör */}
                        <section className="rounded-2xl border border-zinc-100 bg-white p-8 shadow-sm ring-1 ring-zinc-100">
                           <SectionHeader
                              icon={<FaInfoCircle className="h-5 w-5" />}
                              title="Ürün Hikayesi & Detaylar"
                              subtitle="Zengin metin editörünü kullanarak ürününüzün özelliklerini, kullanım talimatlarını ve detaylarını anlatın."
                           />
                           <RichEditor value={description} onChange={setDescription} />
                           <div className="mt-4 flex items-center gap-3 rounded-xl bg-amber-50 p-4 border border-amber-100">
                              <FaStar className="h-4 w-4 text-amber-500 shrink-0" />
                              <p className="text-[12px] leading-relaxed text-amber-800">
                                 <span className="font-bold">Öneri:</span> Detaylı ve anahtar kelime zengini bir açıklama, hem müşterilerinizin güvenini artırır hem de Google sıralamanızı yükseltir.
                              </p>
                           </div>
                        </section>

                        {/* Varyantlar */}
                        <section className="rounded-2xl border border-zinc-100 bg-white p-8 shadow-sm ring-1 ring-zinc-100 overflow-hidden">
                           <SectionHeader
                              icon={<FaLayerGroup className="h-5 w-5" />}
                              title="Varyasyonlar & Stok Havuzu"
                              subtitle="Ürününüzün farklı beden, renk veya paket seçeneklerini buradan yönetin."
                              action={
                                 <div className="flex items-center gap-2">
                                    <button
                                       type="button"
                                       onClick={handleBulkPriceUpdate}
                                       className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-[12px] font-bold text-zinc-600 transition-all hover:bg-zinc-200"
                                    >
                                       Fiyatları Eşitle
                                    </button>
                                    <button
                                       type="button"
                                       onClick={addVariant}
                                       className="flex items-center gap-2 rounded-xl bg-[#4f6f52] px-4 py-2.5 text-[12px] font-bold text-white transition-all hover:bg-[#3d5a3f] shadow-lg shadow-[#4f6f52]/20"
                                    >
                                       <FaPlus className="h-3 w-3" /> Yeni Seçenek
                                    </button>
                                 </div>
                              }
                           />

                           <div className="space-y-4">
                              <div className="grid grid-cols-[1fr_1fr_120px_100px_100px_40px] gap-4 px-4 py-2 bg-zinc-50 rounded-xl">
                                 <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Özellik</span>
                                    <Tooltip text="Beden, Renk veya Paket gibi ürünü ayrıştıran nitelik (Örn: XL, Kırmızı).">
                                       <FaQuestionCircle className="h-2.5 w-2.5 text-zinc-300" />
                                    </Tooltip>
                                 </div>
                                 <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Özel SKU</span>
                                    <Tooltip text="Her varyant için stok takibi yapmanızı sağlayan benzersiz kod. Boş bırakılırsa ana SKU kullanılır.">
                                       <FaQuestionCircle className="h-2.5 w-2.5 text-zinc-300" />
                                    </Tooltip>
                                 </div>
                                 <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Fiyat (₺)</span>
                                    <Tooltip text="Bu varyanta özel fiyat. Boş bırakılırsa temel fiyat geçerli olur.">
                                       <FaQuestionCircle className="h-2.5 w-2.5 text-zinc-300" />
                                    </Tooltip>
                                 </div>
                                 <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Stok</span>
                                    <Tooltip text="Bu seçeneğe ait güncel stok miktarı.">
                                       <FaQuestionCircle className="h-2.5 w-2.5 text-zinc-300" />
                                    </Tooltip>
                                 </div>
                                 <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Kritik</span>
                                    <Tooltip text="Stok bu seviyenin altına düştüğünde sistem sizi uyarır.">
                                       <FaQuestionCircle className="h-2.5 w-2.5 text-zinc-300" />
                                    </Tooltip>
                                 </div>
                                 <span className=""></span>
                              </div>

                              <AnimatePresence mode="popLayout">
                                 {variants.map((v, i) => (
                                    <motion.div
                                       key={v.id}
                                       layout
                                       initial={{ opacity: 0, x: -10 }}
                                       animate={{ opacity: 1, x: 0 }}
                                       exit={{ opacity: 0, x: 10, scale: 0.95 }}
                                       className="group relative grid grid-cols-[1fr_1fr_120px_100px_100px_40px] items-center gap-4
                                     rounded-2xl border border-zinc-100 bg-white px-4 py-3.5
                                     transition-all hover:shadow-xl hover:border-[#4f6f52]/20 hover:translate-x-1"
                                    >
                                       <div className="relative">
                                          <input
                                             type="text"
                                             value={v.name}
                                             onChange={e => setVariantField(v.id, "name", e.target.value)}
                                             placeholder="Örn: 3-6 Ay / Kırmızı"
                                             className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-[13px] font-medium
                                          text-zinc-700 outline-none focus:border-[#4f6f52] focus:bg-white"
                                          />
                                       </div>
                                       <input
                                          type="text"
                                          value={v.sku}
                                          onChange={e => setVariantField(v.id, "sku", e.target.value)}
                                          placeholder="Varyant SKU"
                                          className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-[12px]
                                       text-zinc-500 outline-none focus:border-[#4f6f52] focus:bg-white"
                                       />
                                       <div className="relative">
                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-zinc-400">₺</span>
                                          <input
                                             type="number"
                                             value={v.price}
                                             onChange={e => setVariantField(v.id, "price", e.target.value)}
                                             placeholder={form.basePrice || "0"}
                                             className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-7 pr-2 text-[13px] font-bold
                                         text-zinc-800 outline-none focus:border-[#4f6f52] focus:bg-white"
                                          />
                                       </div>
                                       <div className="relative">
                                          <input
                                             type="number"
                                             value={v.stock}
                                             onChange={e => setVariantField(v.id, "stock", e.target.value)}
                                             min={0}
                                             className={`h-10 w-full rounded-xl border px-3 text-[13px] font-black outline-none focus:border-[#4f6f52]
                                 ${Number(v.stock) === 0
                                                   ? "border-red-200 bg-red-50 text-red-500"
                                                   : Number(v.stock) <= Number(v.lowStockThreshold)
                                                      ? "border-amber-200 bg-amber-50 text-amber-600"
                                                      : "border-zinc-200 bg-zinc-50/50 text-zinc-800 focus:bg-white"}`}
                                          />
                                          {Number(v.stock) <= Number(v.lowStockThreshold) && (
                                             <div className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white animate-bounce shadow-sm">
                                                <span className="text-[10px]">!</span>
                                             </div>
                                          )}
                                       </div>
                                       <input
                                          type="number"
                                          value={v.lowStockThreshold}
                                          onChange={e => setVariantField(v.id, "lowStockThreshold", e.target.value)}
                                          min={0}
                                          className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-[12px] font-medium
                                       text-zinc-500 outline-none focus:border-[#4f6f52] focus:bg-white"
                                       />
                                       <button
                                          type="button"
                                          onClick={() => removeVariant(v.id)}
                                          className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-300
                                       opacity-0 transition-all hover:bg-red-50 hover:text-red-500 hover:rotate-90
                                       group-hover:opacity-100"
                                       >
                                          <FaTimes className="h-3.5 w-3.5" />
                                       </button>
                                    </motion.div>
                                 ))}
                              </AnimatePresence>
                           </div>

                           <div className="mt-8 flex items-center justify-between rounded-2xl bg-zinc-900 px-8 py-6 text-white shadow-2xl">
                              <div className="flex items-center gap-6">
                                 <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Seçenek Sayısı</span>
                                    <span className="mt-1 text-xl font-black">{variants.length}</span>
                                 </div>
                                 <div className="h-10 w-px bg-white/10" />
                                 <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Toplam Stok Adedi</span>
                                    <span className={`mt-1 text-xl font-black ${totalStock === 0 ? 'text-red-400' : 'text-emerald-400'}`}>{totalStock}</span>
                                 </div>
                              </div>
                              <div className="flex items-center gap-3 rounded-xl bg-white/5 px-5 py-3 border border-white/10">
                                 <FaExclamationTriangle className="h-4 w-4 text-amber-400" />
                                 <span className="text-[12px] font-medium text-zinc-300">Stok seviyesi düştüğünde sistem otomatik bildirim gönderecektir.</span>
                              </div>
                           </div>
                        </section>
                     </div>

                     {/* SAĞ KOLON ─────────────────────────────────────────── */}
                     <div className="space-y-8">

                        {/* Görsel Galerisi */}
                        <section className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm ring-1 ring-zinc-100">
                           <SectionHeader
                              icon={<FaImage className="h-4 w-4" />}
                              title="Ürün Görselleri"
                              subtitle="Cihazınızdan seçin veya link yapıştırın."
                           />

                           <div className="mb-6 space-y-4">
                              {/* Dosya Yükleme Butonu (Sürükle-Bırak Destekli) */}
                              <button
                                 type="button"
                                 onClick={() => fileInputRef.current?.click()}
                                 onDragOver={handleDragOver}
                                 onDragLeave={handleDragLeave}
                                 onDrop={handleDrop}
                                 className={`relative flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-10 transition-all
                                    ${isDraggingFile
                                       ? "border-[#4f6f52] bg-[#4f6f52]/10 scale-[1.02] shadow-xl shadow-[#4f6f52]/10"
                                       : "border-[#4f6f52]/20 bg-[#4f6f52]/5 hover:bg-[#4f6f52]/10 hover:border-[#4f6f52]/40"
                                    }`}
                              >
                                 <motion.div
                                    animate={isDraggingFile ? { y: [0, -10, 0] } : {}}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    className={`flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg text-[#4f6f52] mb-2
                                       ${isDraggingFile ? "ring-4 ring-[#4f6f52]/20" : ""}`}
                                 >
                                    <FaPlus className="h-6 w-6" />
                                 </motion.div>
                                    <div className="text-center">
                                       <p className={`text-[14px] font-bold ${isDraggingFile ? "text-[#4f6f52]" : "text-[#4f6f52]/80"}`}>
                                          {isDraggingFile ? "BURAYA BIRAKIN" : "GÖRSELLERİ BURAYA SÜRÜKLEYİN"}
                                       </p>
                                       <p className="mt-1 text-[11px] text-zinc-400 font-medium">PNG, JPG, WEBP (Max 5MB)</p>
                                    </div>
                                    {isUploading && (
                                       <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-2">
                                          <div className="w-8 h-8 border-4 border-[#4f6f52] border-t-transparent rounded-full animate-spin"></div>
                                          <p className="text-[11px] font-bold text-[#4f6f52] animate-pulse">YÜKLENİYOR...</p>
                                       </div>
                                    )}
                              </button>

                              <input
                                 type="file"
                                 ref={fileInputRef}
                                 onChange={handleFileUpload}
                                 multiple
                                 accept="image/*"
                                 className="hidden"
                              />

                              <div className="relative group">
                                 <input
                                    type="text"
                                    value={imageUrl}
                                    onChange={e => setImageUrl(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addImage())}
                                    placeholder="Veya görsel linki yapıştırın..."
                                    className={INPUT_CLS + " pr-12"}
                                 />
                                 <button
                                    type="button"
                                    onClick={addImage}
                                    className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[#4f6f52]
                                    text-white shadow-lg transition-all hover:scale-110 active:scale-95"
                                 >
                                    <FaPlus className="h-3 w-3" />
                                 </button>
                              </div>

                              <div className="rounded-xl bg-[#4f6f52]/5 p-4 border border-[#4f6f52]/10">
                                 <p className="text-[11px] text-[#4f6f52] font-bold leading-relaxed">
                                    Tip: Görselleri sürükleyerek sıralamasını değiştirebilirsiniz. En üstteki görsel vitrin görseli olur.
                                 </p>
                              </div>
                           </div>

                           <div className="space-y-3">
                              <Reorder.Group axis="y" values={images} onReorder={setImages} className="space-y-3">
                                 {images.length > 0 ? (
                                    images.map((url, i) => (
                                       <Reorder.Item
                                          key={url}
                                          value={url}
                                          initial={{ opacity: 0, scale: 0.95 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          exit={{ opacity: 0, scale: 0.95 }}
                                       >
                                          <ImageRow
                                             url={url}
                                             index={i}
                                             isFirst={i === 0}
                                             isLast={i === images.length - 1}
                                             onRemove={() => removeImage(i)}
                                             onMoveUp={() => moveImage(i, -1)}
                                             onMoveDown={() => moveImage(i, 1)}
                                          />
                                       </Reorder.Item>
                                    ))
                                 ) : (
                                    <div className="flex h-48 flex-col items-center justify-center rounded-2xl border-2
                                          border-dashed border-zinc-200 bg-zinc-50/50 text-zinc-400 group hover:bg-white hover:border-[#4f6f52]/30 transition-all">
                                       <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-zinc-200 transition-transform group-hover:scale-110">
                                          <FaImage className="h-5 w-5" />
                                       </div>
                                       <p className="text-[13px] font-bold text-zinc-500">Görsel Bulunamadı</p>
                                       <p className="mt-1 text-[11px]">Henüz bir ürün görseli eklemediniz.</p>
                                    </div>
                                 )}
                              </Reorder.Group>
                           </div>
                        </section>

                        {/* Fiyatlandırma Paneli */}
                        <section className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm ring-1 ring-zinc-100">
                           <SectionHeader
                              icon={<FaTag className="h-4 w-4" />}
                              title="Finansal Bilgiler"
                           />
                           <div className="space-y-5">
                              <Field label="Standart Satış Fiyatı" required tooltip="Herhangi bir varyant fiyatı girilmediğinde kullanılacak varsayılan fiyat.">
                                 <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-zinc-300 transition-colors group-focus-within:text-[#4f6f52]">₺</span>
                                    <input
                                       required
                                       type="number"
                                       value={form.basePrice}
                                       onChange={e => set("basePrice", e.target.value)}
                                       placeholder="0.00"
                                       step="0.01"
                                       min="0"
                                       className="h-14 w-full rounded-xl border border-zinc-200 bg-zinc-50/30 pl-10 pr-4
                                     text-xl font-black text-zinc-800 outline-none transition-all
                                     focus:border-[#4f6f52] focus:bg-white focus:ring-4 focus:ring-[#4f6f52]/5"
                                    />
                                 </div>
                              </Field>

                              <Field label="İndirimli Fiyat (Karşılaştırmalı)" hint="Opsiyonel">
                                 <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-zinc-300">₺</span>
                                    <input
                                       type="number"
                                       value={form.compareAtPrice}
                                       onChange={e => set("compareAtPrice", e.target.value)}
                                       placeholder="0.00"
                                       step="0.01"
                                       min="0"
                                       className="h-14 w-full rounded-xl border border-zinc-200 bg-zinc-50/30 pl-10 pr-4
                                     text-xl font-black text-zinc-800 outline-none transition-all
                                     focus:border-[#4f6f52] focus:bg-white focus:ring-4 focus:ring-[#4f6f52]/5"
                                    />
                                 </div>
                              </Field>

                              {hasDiscount && (
                                 <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center justify-between rounded-2xl bg-emerald-500 p-6 shadow-xl shadow-emerald-500/20 text-white"
                                 >
                                    <div>
                                       <p className="text-[11px] font-black uppercase tracking-widest opacity-80">Net İndirim Oranı</p>
                                       <p className="mt-1 text-[13px] font-bold">
                                          ₺{(Number(form.basePrice) - Number(form.compareAtPrice)).toLocaleString("tr-TR")} daha ucuz!
                                       </p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                       <span className="text-3xl font-black">%{discountPct}</span>
                                       <span className="text-[10px] font-bold opacity-80">İNDİRİM</span>
                                    </div>
                                 </motion.div>
                              )}

                              <div className="rounded-xl bg-zinc-50 p-4 space-y-3">
                                 <div className="flex justify-between items-center text-[12px]">
                                    <span className="text-zinc-500 font-medium italic">Seçilen Fiyat Stratejisi:</span>
                                    <span className="font-bold text-[#4f6f52]">
                                       {form.isTaxIncluded ? "Vergi Dahil" : "Vergi Hariç (+KDV)"}
                                    </span>
                                 </div>
                                 <div className="h-px bg-zinc-200/50" />
                                 <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[13px]">
                                       <span className="text-zinc-500 font-medium">Matrah (Net Fiyat)</span>
                                       <span className="font-bold text-zinc-800">
                                          ₺{(() => {
                                             const price = Number(hasDiscount ? form.compareAtPrice : form.basePrice)
                                             const rate = Number(form.taxRate) / 100
                                             const net = form.isTaxIncluded ? (price / (1 + rate)) : price
                                             return net.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                          })()}
                                       </span>
                                    </div>
                                    <div className="flex justify-between items-center text-[13px]">
                                       <span className="text-zinc-500 font-medium">KDV (%{form.taxRate})</span>
                                       <span className="font-bold text-zinc-400">
                                          ₺{(() => {
                                             const price = Number(hasDiscount ? form.compareAtPrice : form.basePrice)
                                             const rate = Number(form.taxRate) / 100
                                             const vat = form.isTaxIncluded ? (price - (price / (1 + rate))) : (price * rate)
                                             return vat.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                          })()}
                                       </span>
                                    </div>
                                 </div>
                                 <div className="h-px bg-zinc-200/50" />
                                 <div className="flex justify-between items-center text-[14px]">
                                    <span className="text-zinc-800 font-black">Müşteri Ödeyecek</span>
                                    <span className="font-black text-[#4f6f52]">
                                       ₺{(() => {
                                          const price = Number(hasDiscount ? form.compareAtPrice : form.basePrice)
                                          const rate = Number(form.taxRate) / 100
                                          const total = form.isTaxIncluded ? price : (price * (1 + rate))
                                          return total.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                       })()}
                                    </span>
                                 </div>
                              </div>
                           </div>
                        </section>

                        {/* Vergi Ayarları (YENİ) */}
                        <section className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm ring-1 ring-zinc-100">
                           <SectionHeader icon={<FaTag className="h-4 w-4" />} title="Vergi Yapılandırması" />
                           <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-4">
                                 <Field label="Vergi Oranı (%)">
                                    <select
                                       value={form.taxRate}
                                       onChange={e => set("taxRate", e.target.value)}
                                       className={SELECT_CLS}
                                    >
                                       <option value="20">%20 (Standart)</option>
                                       <option value="10">%10 (Gıda vb.)</option>
                                       <option value="1">%1 (Temel Gıda)</option>
                                       <option value="0">%0 (Muaf)</option>
                                    </select>
                                 </Field>
                                 <div className="flex items-center pt-6">
                                    <Toggle
                                       label="Vergi Dahil"
                                       checked={form.isTaxIncluded}
                                       onChange={v => set("isTaxIncluded", v)}
                                       description="Fiyatlara vergi dahil mi?"
                                    />
                                 </div>
                              </div>
                           </div>
                        </section>

                        {/* Yayın Paneli */}
                        <section className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm ring-1 ring-zinc-100">
                           <SectionHeader icon={<FaEye className="h-4 w-4" />} title="Yayın & Görünürlük" />
                           <div className="space-y-6">
                              <Toggle
                                 checked={form.isActive}
                                 onChange={v => set("isActive", v)}
                                 label="Satış Durumu"
                                 description="Ürün mağazada aktif olarak satışa sunulsun mu?"
                              />
                              <div className="h-px bg-zinc-50" />
                              <Toggle
                                 checked={form.isFeatured}
                                 onChange={v => set("isFeatured", v)}
                                 label="Öne Çıkan Ürün"
                                 description="Ürün ana sayfa vitrininde ve kampanyalarda gösterilsin mi?"
                              />
                           </div>
                        </section>
                     </div>
                  </motion.div>
               )}

               {/* ══════════════════════════════════════════════════════════════ */}
               {activeTab === "seo" && (
                  <motion.div
                     key="seo"
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
                     className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]"
                  >
                     <div className="space-y-8">
                        <section className="rounded-2xl border border-zinc-100 bg-white p-8 shadow-sm ring-1 ring-zinc-100">
                           <SectionHeader
                              icon={<FaGlobe className="h-5 w-5" />}
                              title="Arama Motoru Optimizasyonu"
                              subtitle="Ürününüzün Google ve diğer arama motorlarında nasıl görüneceğini yapılandırın."
                           />
                           <div className="space-y-8">
                              <Field
                                 label="Sayfa Başlığı (Meta Title)"
                                 hint="Önerilen: 50-60 karakter"
                                 tooltip="Arama sonuçlarında mavi başlık olarak görünen kısımdır."
                              >
                                 <input
                                    type="text"
                                    value={form.metaTitle}
                                    onChange={e => set("metaTitle", e.target.value)}
                                    placeholder={form.name || "Arama sonuçlarında görünecek başlık..."}
                                    maxLength={70}
                                    className={INPUT_CLS}
                                 />
                                 <div className="mt-2 flex items-center justify-between px-1">
                                    <div className="flex gap-1">
                                       <div className={`h-1 w-6 rounded-full ${form.metaTitle.length >= 30 && form.metaTitle.length <= 60 ? 'bg-emerald-500' : 'bg-zinc-200'}`} />
                                       <div className={`h-1 w-6 rounded-full ${form.metaTitle.length >= 45 && form.metaTitle.length <= 60 ? 'bg-emerald-500' : 'bg-zinc-200'}`} />
                                    </div>
                                    <span className={`text-[10px] font-black ${form.metaTitle.length > 60 ? "text-amber-500" : "text-zinc-400"}`}>
                                       {form.metaTitle.length} / 70 Karakter
                                    </span>
                                 </div>
                              </Field>

                              <Field
                                 label="Sayfa Açıklaması (Meta Description)"
                                 hint="Önerilen: 120-160 karakter"
                                 tooltip="Arama sonuçlarında başlığın altında görünen özet metindir."
                              >
                                 <textarea
                                    rows={4}
                                    value={form.metaDescription}
                                    onChange={e => set("metaDescription", e.target.value)}
                                    placeholder="Ürününüzü arama motorları için özetleyin..."
                                    maxLength={200}
                                    className={TEXTAREA_CLS}
                                 />
                                 <div className="mt-2 flex items-center justify-between px-1">
                                    <div className="flex gap-1">
                                       <div className={`h-1 w-6 rounded-full ${form.metaDescription.length >= 100 && form.metaDescription.length <= 160 ? 'bg-emerald-500' : 'bg-zinc-200'}`} />
                                       <div className={`h-1 w-6 rounded-full ${form.metaDescription.length >= 130 && form.metaDescription.length <= 160 ? 'bg-emerald-500' : 'bg-zinc-200'}`} />
                                    </div>
                                    <span className={`text-[10px] font-black ${form.metaDescription.length > 160 ? "text-amber-500" : "text-zinc-400"}`}>
                                       {form.metaDescription.length} / 200 Karakter
                                    </span>
                                 </div>
                              </Field>

                              <Field label="Kalıcı Bağlantı (URL Slug)" tooltip="Ürünün tarayıcı adres çubuğundaki adı. Otomatik oluşturulur ama düzenlenebilir.">
                                 <div className="flex items-center overflow-hidden rounded-xl border border-zinc-200 bg-white ring-offset-2 focus-within:ring-4 focus-within:ring-[#4f6f52]/5 focus-within:border-[#4f6f52] transition-all">
                                    <div className="flex h-12 items-center bg-zinc-50 px-4 text-[13px] font-bold text-zinc-400 border-r border-zinc-200 whitespace-nowrap">
                                       littlemoms.com/p/
                                    </div>
                                    <input
                                       type="text"
                                       value={form.slug}
                                       onChange={e => set("slug", e.target.value)}
                                       className="h-12 flex-1 px-4 text-[13px] font-medium text-zinc-800 outline-none bg-transparent"
                                    />
                                    <div className="pr-4">
                                       <FaLink className="h-3.5 w-3.5 text-zinc-300" />
                                    </div>
                                 </div>
                              </Field>
                           </div>
                        </section>

                        {/* Google simülasyonu */}
                        <section className="rounded-2xl border border-zinc-100 bg-white p-8 shadow-sm ring-1 ring-zinc-100">
                           <SectionHeader icon={<FaSearch className="h-4 w-4" />} title="Google Arama Önizlemesi" />
                           <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-6 shadow-inner">
                              <div className="flex flex-col gap-1">
                                 <div className="flex items-center gap-2">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-zinc-200">
                                       <span className="text-[10px] font-black text-zinc-400">LM</span>
                                    </div>
                                    <div className="flex flex-col">
                                       <span className="text-[12px] font-medium text-zinc-800">Little Mom's Store</span>
                                       <span className="text-[10px] text-zinc-400">https://littlemoms.com › products › {form.slug || 'urun-adi'}</span>
                                    </div>
                                 </div>
                                 <h3 className="mt-2 text-[18px] font-bold text-[#1a0dab] hover:underline cursor-pointer leading-tight">
                                    {form.metaTitle || form.name || "Ürününüzün Başlığı Burada Görünecek"}
                                 </h3>
                                 <p className="mt-1 text-[13px] leading-relaxed text-[#4d5156] line-clamp-2">
                                    {form.metaDescription || form.shortDescription || "Ürününüzün arama sonuçlarındaki meta açıklaması burada görüntülenecek. Etkileyici bir açıklama girerek tıklanma oranınızı artırabilirsiniz."}
                                 </p>
                              </div>
                           </div>
                           <div className="mt-6 flex items-center gap-3 rounded-xl bg-blue-50 p-4 border border-blue-100">
                              <FaInfoCircle className="h-4 w-4 text-blue-500 shrink-0" />
                              <p className="text-[11.5px] text-blue-800 leading-relaxed">
                                 Bu görünüm, ürününüzün Google arama sonuçlarındaki yaklaşık görünümüdür. Anahtar kelimelerinizi başlıkta kullanmayı unutmayın.
                              </p>
                           </div>
                        </section>
                     </div>

                     {/* SAĞ KOLON (SEO) ─────────────────────────────────────── */}
                     <div className="space-y-8">
                        <section className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm ring-1 ring-zinc-100">
                           <SectionHeader icon={<FaStar className="h-4 w-4" />} title="SEO Puanı & İpuçları" />
                           <div className="space-y-6">
                              <div className="flex flex-col items-center justify-center py-6">
                                 <div className="relative flex h-32 w-32 items-center justify-center">
                                    <svg className="h-full w-full -rotate-90">
                                       <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-zinc-100" />
                                       <circle
                                          cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent"
                                          strokeDasharray={364.4}
                                          strokeDashoffset={364.4 - (364.4 * ([
                                             form.metaTitle.length >= 30 && form.metaTitle.length <= 60,
                                             form.metaDescription.length >= 100 && form.metaDescription.length <= 160,
                                             Boolean(form.slug),
                                             images.length >= 3,
                                             description.length > 300,
                                             Boolean(form.categoryId)
                                          ].filter(Boolean).length / 6))}
                                          className="text-[#4f6f52] transition-all duration-1000 ease-out"
                                       />
                                    </svg>
                                    <div className="absolute flex flex-col items-center">
                                       <span className="text-3xl font-black text-zinc-800">
                                          {Math.round([
                                             form.metaTitle.length >= 30 && form.metaTitle.length <= 60,
                                             form.metaDescription.length >= 100 && form.metaDescription.length <= 160,
                                             Boolean(form.slug),
                                             images.length >= 3,
                                             description.length > 300,
                                             Boolean(form.categoryId)
                                          ].filter(Boolean).length / 6 * 100)}
                                       </span>
                                       <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Puan</span>
                                    </div>
                                 </div>
                              </div>

                              <div className="space-y-3">
                                 {[
                                    { ok: form.metaTitle.length >= 30 && form.metaTitle.length <= 60, text: "İdeal Başlık Uzunluğu (30-60)" },
                                    { ok: form.metaDescription.length >= 100 && form.metaDescription.length <= 160, text: "İdeal Meta Açıklama (100-160)" },
                                    { ok: Boolean(form.slug), text: "SEO Dostu URL Yapısı" },
                                    { ok: images.length >= 3, text: "Yeterli Görsel Sayısı (Min 3)" },
                                    { ok: description.length > 300, text: "Zengin İçerik (Min 300 Karakter)" },
                                    { ok: Boolean(form.categoryId), text: "Kategori Ataması" },
                                 ].map((tip, i) => (
                                    <div key={i} className="flex items-center gap-3 rounded-xl bg-zinc-50/50 p-3 ring-1 ring-zinc-100">
                                       <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]
                                ${tip.ok ? "bg-emerald-100 text-emerald-600" : "bg-zinc-100 text-zinc-400"}`}>
                                          {tip.ok ? "✓" : "○"}
                                       </div>
                                       <span className={`text-[12px] font-medium ${tip.ok ? "text-zinc-700" : "text-zinc-400"}`}>{tip.text}</span>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        </section>

                        <div className="rounded-2xl bg-zinc-900 p-6 text-white shadow-xl">
                           <h4 className="text-[13px] font-black uppercase tracking-widest text-zinc-500">SEO Nedir?</h4>
                           <p className="mt-3 text-[12px] leading-relaxed text-zinc-300 opacity-80">
                              Arama Motoru Optimizasyonu (SEO), ürününüzün Google aramalarında daha üst sıralarda yer almasını sağlar. Doğru yapılandırılmış bir SEO, reklam bütçesi harcamadan binlerce müşteriye ulaşmanızı sağlayabilir.
                           </p>
                           <button type="button" className="mt-4 flex items-center gap-2 text-[11px] font-black text-[#4f6f52] hover:text-[#3d5a3f] transition-colors">
                              Eğitim Videosunu İzle <FaArrowRight className="h-2 w-2" />
                           </button>
                        </div>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>
         </form>

         {/* ── ÖN İZLEME MODALI ───────────────────────────────────────────── */}
         <AnimatePresence>
            {isPreviewOpen && (
               <div className="fixed inset-0 z-200 flex items-center justify-center p-4 sm:p-8">
                  <motion.div
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     onClick={() => setIsPreviewOpen(false)}
                     className="absolute inset-0 bg-zinc-900/80 backdrop-blur-md"
                  />
                  <motion.div
                     initial={{ opacity: 0, scale: 0.9, y: 20 }}
                     animate={{ opacity: 1, scale: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.9, y: 20 }}
                     className="relative h-full max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[32px] bg-white shadow-2xl"
                  >
                     {/* Modal Header */}
                     <div className="absolute right-6 top-6 z-10">
                        <button
                           onClick={() => setIsPreviewOpen(false)}
                           className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-xl backdrop-blur-sm transition-transform hover:scale-110 active:scale-95"
                        >
                           <FaTimes className="h-5 w-5" />
                        </button>
                     </div>

                     <div className="h-full overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 lg:grid-cols-2">
                           {/* SOL: Görsel Galerisi Simülasyonu */}
                           <div className="bg-zinc-50 p-8 lg:p-12">
                              {images.length > 0 ? (
                                 <div className="space-y-6">
                                    <div className="aspect-square overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-zinc-200">
                                       <img src={images[0]} alt="Preview" className="h-full w-full object-cover" />
                                    </div>
                                    <div className="grid grid-cols-4 gap-4">
                                       {images.slice(1, 5).map((img, i) => (
                                          <div key={i} className="aspect-square overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
                                             <img src={img} alt="" className="h-full w-full object-cover" />
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              ) : (
                                 <div className="flex aspect-square items-center justify-center rounded-3xl border-2 border-dashed border-zinc-300 bg-white text-zinc-300">
                                    <FaImage className="h-16 w-16" />
                                 </div>
                              )}
                           </div>

                           {/* SAĞ: Ürün Bilgileri */}
                           <div className="p-8 lg:p-12">
                              <div className="mb-2 flex items-center gap-2">
                                 <span className="rounded-full bg-[#4f6f52]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#4f6f52]">
                                    {categories.find(c => c.id === form.categoryId)?.name || "Kategori Seçilmedi"}
                                 </span>
                                 {form.isFeatured && (
                                    <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-600">
                                       Öne Çıkan
                                    </span>
                                 )}
                              </div>
                              <h2 className="text-3xl font-black text-zinc-900 leading-tight">
                                 {form.name || "Ürün Adı Henüz Girilmedi"}
                              </h2>
                              <p className="mt-4 text-[15px] leading-relaxed text-zinc-500">
                                 {form.shortDescription || "Ürün için kısa açıklama henüz girilmedi."}
                              </p>

                              <div className="mt-8 flex items-baseline gap-4">
                                 <span className="text-4xl font-black text-[#4f6f52]">
                                    ₺{Number(hasDiscount ? form.compareAtPrice : form.basePrice).toLocaleString("tr-TR")}
                                 </span>
                                 {hasDiscount && (
                                    <>
                                       <span className="text-xl text-zinc-400 line-through">
                                          ₺{Number(form.basePrice).toLocaleString("tr-TR")}
                                       </span>
                                       <span className="rounded-lg bg-red-100 px-2 py-1 text-sm font-bold text-red-600">
                                          %{discountPct} İndirim
                                       </span>
                                    </>
                                 )}
                              </div>

                              <div className="mt-10 space-y-6">
                                 {/* Varyant Simülasyonu */}
                                 <div>
                                    <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-zinc-400">Seçenekler</p>
                                    <div className="flex flex-wrap gap-2">
                                       {variants.map((v, i) => (
                                          <button
                                             key={v.id}
                                             type="button"
                                             className={`rounded-xl border-2 px-4 py-2 text-[13px] font-bold transition-all
                                                ${i === 0 ? "border-[#4f6f52] bg-[#4f6f52]/5 text-[#4f6f52]" : "border-zinc-100 text-zinc-400"}`}
                                          >
                                             {v.name || "Standart"}
                                          </button>
                                       ))}
                                    </div>
                                 </div>

                                 <button
                                    type="button"
                                    className="w-full rounded-2xl bg-zinc-900 py-4 text-[15px] font-black text-white shadow-xl transition-transform hover:scale-[1.02] active:scale-[0.98]"
                                 >
                                    SEPETE EKLE
                                 </button>
                              </div>

                              <div className="mt-12">
                                 <div className="mb-4 flex border-b border-zinc-100 pb-2">
                                    <span className="border-b-2 border-[#4f6f52] pb-2 text-[13px] font-bold text-[#4f6f52]">Ürün Detayları</span>
                                 </div>
                                 <div
                                    className="prose prose-zinc prose-sm max-w-none text-zinc-600 tiptap-preview"
                                    dangerouslySetInnerHTML={{ __html: description || "Ürün detayı bulunmuyor." }}
                                 />
                              </div>
                           </div>
                        </div>
                     </div>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>

         <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #e4e4e7; border-radius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d4d4d8; }
            .tiptap-preview h2 { font-size:1.25rem; font-weight:700; margin:1rem 0 0.5rem; color:#111827 }
            .tiptap-preview h3 { font-size:1.1rem; font-weight:700; margin:0.75rem 0 0.4rem; color:#111827 }
            .tiptap-preview ul { list-style:disc; padding-left:1.2rem; margin:0.5rem 0 }
            .tiptap-preview ol { list-style:decimal; padding-left:1.2rem; margin:0.5rem 0 }
            .tiptap-preview p { margin:0.5rem 0 }
         `}</style>
      </div>
   )
}

function FaSearch(props: any) {
   return <svg {...props} stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z"></path></svg>
}