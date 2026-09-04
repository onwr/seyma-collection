"use client"

import { useState, useEffect, useCallback, useRef, useMemo, use } from "react"
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
   FaChevronDown,
} from "react-icons/fa"
import { motion, AnimatePresence, Reorder } from "framer-motion"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

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
   compareAtPrice: string
   stock: string
   lowStockThreshold: string
}

interface SubCategory {
   id: number
   name: string
   categoryId: number
}

type ImageItem = {
   id: string
   url: string
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
          ${checked ? "bg-[#813d50] shadow-[0_0_10px_rgba(79,111,82,0.3)]" : "bg-zinc-200"}`}
         >
            <span
               className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center
            ${checked ? "translate-x-4" : "translate-x-0"}`}
            >
               {checked && <div className="h-1.5 w-1.5 rounded-full bg-[#813d50]" />}
            </span>
         </button>
      </div>
   )
}

// ── TipTap Toolbar ────────────────────────────────────────────────────────────
function EditorToolbar({ editor }: { editor: any }) {
   if (!editor) return null

   const setLink = useCallback(() => {
      const previousUrl = editor.getAttributes("link").href
      const url = window.prompt("URL giriniz:", previousUrl)

      if (url === null) return
      if (url === "") {
         editor.chain().focus().extendMarkRange("link").unsetLink().run()
         return
      }
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
   }, [editor])

   const btn = (active: boolean, onClick: () => void, icon: React.ReactNode, title?: string) => (
      <button
         type="button"
         title={title}
         onClick={onClick}
         className={`flex h-8 w-8 items-center justify-center rounded-lg text-[13px] transition-all duration-200
        ${active
               ? "bg-[#813d50] text-white shadow-sm scale-105"
               : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"}`}
      >
         {icon}
      </button>
   )

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
               className="h-8 rounded-lg border border-zinc-200 bg-white px-3 pr-8 text-[12px] font-medium text-zinc-600 outline-none transition-all focus:border-[#813d50] appearance-none cursor-pointer"
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
            {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <FaBold />, "Kalın")}
            {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <FaItalic />, "İtalik")}
            {btn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), <FaUnderline />, "Altı Çizili")}
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

   // Content değişince editörü güncelle (Düzenleme sayfası için kritik)
   useEffect(() => {
      if (editor && value !== editor.getHTML()) {
         editor.commands.setContent(value)
      }
   }, [value, editor])

   const charCount = editor?.storage.characterCount?.characters() ?? 0

   return (
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all duration-300 focus-within:border-[#813d50] focus-within:ring-2 focus-within:ring-[#813d50]/5">
         <EditorToolbar editor={editor} />

         {/* Editör içeriği — TipTap global stilleri */}
         <style>{`
        .tiptap h2 { font-size:1.4rem; font-weight:700; margin:1.5rem 0 0.75rem; color:#111827; line-height: 1.2 }
        .tiptap h3 { font-size:1.2rem; font-weight:700; margin:1.25rem 0 0.5rem; color:#111827 }
        .tiptap h4 { font-size:1.1rem; font-weight:700; margin:1rem 0 0.5rem; color:#111827 }
        .tiptap ul  { list-style:disc;   padding-left:1.5rem; margin:0.75rem 0 }
        .tiptap ol  { list-style:decimal; padding-left:1.5rem; margin:0.75rem 0 }
        .tiptap li  { margin:0.35rem 0 }
        .tiptap blockquote { border-left:4px solid #813d50; padding-left:1.25rem; color:#4b5563; font-style:italic; margin:1.25rem 0; background:#f9fafb; padding-top:0.5rem; padding-bottom:0.5rem; border-radius:0 4px 4px 0 }
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
                 transition-all hover:bg-white hover:shadow-md hover:border-[#813d50]/20"
      >
         <div className="cursor-grab active:cursor-grabbing p-1 text-zinc-300 hover:text-zinc-500 transition-colors">
            <FaGripVertical className="h-3.5 w-3.5" />
         </div>

         <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 border-white shadow-sm ring-1 ring-zinc-200 bg-white">
            <img src={url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
            {isFirst && (
               <div className="absolute top-0 left-0 right-0 bg-[#813d50] py-0.5 flex items-center justify-center">
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
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-white border border-zinc-200 text-zinc-400 hover:text-[#813d50] hover:border-[#813d50] transition-all disabled:opacity-30 disabled:pointer-events-none shadow-sm"
                  title="Yukarı Taşı"
               >
                  <span className="text-[10px]">▲</span>
               </button>
               <button
                  type="button"
                  onClick={onMoveDown}
                  disabled={isLast}
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-white border border-zinc-200 text-zinc-400 hover:text-[#813d50] hover:border-[#813d50] transition-all disabled:opacity-30 disabled:pointer-events-none shadow-sm"
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
               <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#813d50]/5 text-[#813d50] shadow-sm ring-1 ring-[#813d50]/10">
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
               <label className="text-[12.5px] font-semibold text-zinc-600 group-focus-within/field:text-[#813d50] transition-colors">
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

const INPUT_CLS = "h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/30 px-4 text-[13.5px] text-zinc-800 outline-none transition-all duration-300 focus:border-[#813d50] focus:bg-white focus:ring-4 focus:ring-[#813d50]/5 placeholder:text-zinc-300"
const SELECT_CLS = "h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/30 px-4 text-[13.5px] text-zinc-800 outline-none transition-all duration-300 focus:border-[#813d50] focus:bg-white focus:ring-4 focus:ring-[#813d50]/5 cursor-pointer appearance-none"
const TEXTAREA_CLS = "w-full rounded-xl border border-zinc-200 bg-zinc-50/30 p-4 text-[13.5px] text-zinc-800 outline-none transition-all duration-300 focus:border-[#813d50] focus:bg-white focus:ring-4 focus:ring-[#813d50]/5 resize-none placeholder:text-zinc-300"

// ── UUID ───────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9)

// ── ANA BİLEŞEN ──────────────────────────────────────────────────────────────
export default function EditProduct({ params }: { params: Promise<{ id: string }> }) {
   const { id } = use(params)
   const router = useRouter()
   const searchParams = useSearchParams()
   const from = searchParams.get("from")
   const [loading, setLoading] = useState(true)
   const [submitting, setSubmitting] = useState(false)
   const [categories, setCategories] = useState<any[]>([])
   const [subCategories, setSubCategories] = useState<SubCategory[]>([])
   const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
   const [activeTab, setActiveTab] = useState<"info" | "seo">("info")
   const [isDraggingFile, setIsDraggingFile] = useState(false)
   const [isUploading, setIsUploading] = useState(false)
   const [isPreviewOpen, setIsPreviewOpen] = useState(false)
   const [extraCategoryIds, setExtraCategoryIds] = useState<number[]>([])
   const [extraCatsOpen, setExtraCatsOpen] = useState(false)

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
      taxRate: "20",
      isTaxIncluded: true,
      metaTitle: "",
      metaDescription: "",
      slug: "",
      createdAt: "",
   })
   const [description, setDescription] = useState("")
   const [images, setImages] = useState<ImageItem[]>([])
   const [imageUrl, setImageUrl] = useState("")
   const [variants, setVariants] = useState<Variant[]>([])
   const [expandedVariantIds, setExpandedVariantIds] = useState<Set<string | number>>(new Set())

   // Verileri Yükle
   useEffect(() => {
      const loadData = async () => {
         try {
            // Kategorileri getir
            const catRes = await fetch("/api/categories")
            const catData = await catRes.json()
            const allCats = catData.items ?? catData ?? []
            setCategories(allCats.filter((c: any) => c.parentId === null))

            // Ürünü getir
            const prodRes = await fetch(`/api/admin/products/${id}`)
            if (!prodRes.ok) throw new Error("Ürün bulunamadı")
            const prod = await prodRes.json()

            // Formu doldur
            setForm({
               name: prod.name || "",
               shortDescription: prod.shortDescription || "",
               categoryId: prod.categoryId?.toString() || "",
               subCategoryId: prod.subCategoryId?.toString() || "",
               basePrice: prod.basePrice?.toString() || "",
               compareAtPrice: prod.compareAtPrice?.toString() || "",
               sku: prod.sku || "",
               barcode: prod.barcode || "",
               isActive: prod.isActive ?? true,
               isFeatured: prod.isFeatured ?? false,
               taxRate: prod.taxRate?.toString() || "10",
               isTaxIncluded: prod.isTaxIncluded ?? true,
               metaTitle: prod.metaTitle || "",
               metaDescription: prod.metaDescription || "",
               slug: prod.slug || "",
               createdAt: prod.createdAt ? (() => {
                  const d = new Date(prod.createdAt)
                  // Kullanıcının yerel saatinde göster (browser local time)
                  const pad = (n: number) => String(n).padStart(2, '0')
                  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
               })() : "",
            })
            setDescription(prod.description || "")
            const allLinked = Array.isArray(prod.categories) ? prod.categories.map((c: any) => Number(c.categoryId)).filter((n: any) => Number.isInteger(n)) : []
            const primary = prod.categoryId ? Number(prod.categoryId) : null
            const sub = prod.subCategoryId ? Number(prod.subCategoryId) : null
            setExtraCategoryIds(
               Array.from(new Set(allLinked.filter((cid: number) => cid !== primary && cid !== sub)))
            )
            setImages(
               (prod.images?.map((img: any, idx: number) => {
                  const url = typeof img === "string" ? img : img?.url
                  if (typeof url !== "string" || !url) return null
                  return { id: `${url}::${idx}::${uid()}`, url }
               }) || []).filter(Boolean)
            )
            const loadedVariants = prod.variants?.map((v: any) => ({
               id: v.id || uid(),
               name: v.name || "",
               sku: v.sku || "",
               price: v.price?.toString() || "",
               compareAtPrice: v.compareAtPrice?.toString() || "",
               stock: v.stock?.toString() || "0",
               lowStockThreshold: v.lowStockThreshold?.toString() || "5"
            })) || [{ id: uid(), name: "Standart", sku: "", price: "", compareAtPrice: "", stock: "0", lowStockThreshold: "5" }]
            
            setVariants(loadedVariants)
            // Varsayılan olarak ilk varyantı veya hepsini kapalı tutalım
            setExpandedVariantIds(new Set(loadedVariants.length === 1 ? [loadedVariants[0].id] : []))

         } catch (err) {
            setToast({ msg: "Ürün bilgileri yüklenirken bir hata oluştu.", ok: false })
         } finally {
            setLoading(false)
         }
      }

      loadData()
   }, [id])

   // Alt kategorileri getir
   useEffect(() => {
      if (!form.categoryId) {
         setSubCategories([])
         return
      }

      fetch(`/api/admin/categories/${form.categoryId}/subcategories`)
         .then(r => r.json())
         .then(d => {
            setSubCategories(d.items ?? d ?? [])
         })
         .catch(() => setSubCategories([]))
   }, [form.categoryId])

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
      const url = imageUrl.trim()
      setImages(prev => [...prev, { id: `${url}::${prev.length}::${uid()}`, url }])
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
                     setImages(prev => [...prev, { id: `${data.url}::${prev.length}::${uid()}`, url: data.url }])
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

   const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingFile(true) }
   const handleDragLeave = () => setIsDraggingFile(false)
   const handleDrop = (e: React.DragEvent) => {
      e.preventDefault(); setIsDraggingFile(false)
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
                        setImages(prev => [...prev, { id: `${data.url}::${prev.length}::${uid()}`, url: data.url }])
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
         const arr = [...prev]; const to = i + dir
         if (to < 0 || to >= arr.length) return arr
            ;[arr[i], arr[to]] = [arr[to], arr[i]]
         return arr
      })
   }

   const generateBarcode = () => {
      // 13 haneli rastgele bir barkod üret (EAN-13 formatına yakın)
      const prefix = "869"
      const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')
      const codeWithoutCheck = prefix + random

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
      const id = uid()
      const newSku = form.sku ? `${form.sku}-V${variants.length + 1}` : ""
      setVariants(prev => [...prev, { id, name: "", sku: newSku, price: form.basePrice, compareAtPrice: form.compareAtPrice, stock: "0", lowStockThreshold: "5" }])
      setExpandedVariantIds(prev => {
         const next = new Set(prev)
         next.add(id)
         return next
      })
   }

   const toggleVariantExpansion = (id: string | number) => {
      setExpandedVariantIds(prev => {
         const next = new Set(prev)
         if (next.has(id)) next.delete(id)
         else next.add(id)
         return next
      })
   }

   const removeVariant = (id: string | number) => {
      if (variants.length <= 1) {
         setToast({ msg: "En az bir varyant bulunmalıdır.", ok: false })
         setTimeout(() => setToast(null), 3000)
         return
      }
      setVariants(prev => prev.filter(v => v.id !== id))
   }

   const setVariantField = (id: string | number, field: keyof Variant, value: string) =>
      setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v))

   const handleBulkPriceUpdate = () => {
      if (!form.basePrice) return
      if (window.confirm("Tüm varyant fiyatlarını temel ve indirimli fiyatlara eşitlemek istiyor musunuz?")) {
         setVariants(prev => prev.map(v => ({
            ...v,
            price: form.basePrice,
            compareAtPrice: form.compareAtPrice
         })))
         setToast({ msg: "Tüm varyasyon fiyatları güncellendi.", ok: true })
         setTimeout(() => setToast(null), 3000)
      }
   }

   // ── Güncelle ────────────────────────────────────────────────────────────
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

      setSubmitting(true)
      try {
         const res = await fetch(`/api/admin/products/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               ...form,
               // createdAt: datetime-local değeri yerel saat olarak gelir,
               // new Date() ile doğru UTC'ye çevrilir
               createdAt: form.createdAt ? new Date(form.createdAt).toISOString() : undefined,
               description,
               images: images.map((img) => img.url),
               categoryIds: extraCategoryIds,
               variants: variants.map(v => ({ ...v, price: v.price || form.basePrice }))
            }),
         })

         const data = await res.json()
         if (res.ok) {
            setToast({ msg: "Ürün başarıyla güncellendi!", ok: true })
            setTimeout(() => router.push("/admin/products"), 1500)
         } else {
            setToast({ msg: data.message || "Güncelleme sırasında bir hata oluştu.", ok: false })
            setTimeout(() => setToast(null), 5000)
         }
      } catch {
         setToast({ msg: "Sunucu bağlantı hatası.", ok: false })
         setTimeout(() => setToast(null), 5000)
      } finally {
         setSubmitting(false)
      }
   }

   const totalStock = variants.reduce((s, v) => s + Number(v.stock || 0), 0)
   const hasDiscount = form.compareAtPrice && form.basePrice && Number(form.compareAtPrice) < Number(form.basePrice)
   const discountPct = hasDiscount ? Math.round(((Number(form.basePrice) - Number(form.compareAtPrice)) / Number(form.basePrice)) * 100) : 0

   if (loading) {
      return (
         <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-100 border-t-[#813d50]" />
            <p className="text-[13px] font-medium text-zinc-400">Ürün verileri yükleniyor...</p>
         </div>
      )
   }

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
               ${toast.ok ? "border-emerald-500 bg-emerald-50/95 text-emerald-800" : "border-red-500 bg-red-50/95 text-red-800"}`}
               >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${toast.ok ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
                     {toast.ok ? <FaCheckCircle className="h-4 w-4" /> : <FaExclamationTriangle className="h-4 w-4" />}
                  </div>
                  <div className="flex flex-col">
                     <p className="text-[14px] font-bold">{toast.ok ? "Başarılı" : "Hata Oluştu"}</p>
                     <p className="text-[12px] opacity-90">{toast.msg}</p>
                  </div>
                  <button onClick={() => setToast(null)} className="ml-4 text-zinc-400 hover:text-zinc-600"><FaTimes className="h-3 w-3" /></button>
               </motion.div>
            )}
         </AnimatePresence>

         {/* ── BREADCRUMB ─────────────────────────────────────────────────── */}
         <nav className="mb-8 flex items-center gap-2 text-[11.5px] font-medium text-zinc-400">
            <Link href="/admin" className="hover:text-zinc-600 transition-colors">Dashboard</Link>
            <FaArrowRight className="h-2 w-2 opacity-50" />
            <button
               type="button"
               onClick={() => router.push(from || "/admin/products")}
               className="hover:text-zinc-600 transition-colors"
            >
               Ürün Yönetimi
            </button>
            <FaArrowRight className="h-2 w-2 opacity-50" />
            <span className="text-[#813d50] font-bold">Ürünü Düzenle</span>
         </nav>

         {/* ── HEADER ─────────────────────────────────────────────────────── */}
         <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
               <button
                  type="button"
                  onClick={() => router.push(from || "/admin/products")}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-400 shadow-sm transition-all hover:text-zinc-700 hover:shadow-md active:scale-95"
               >
                  <FaChevronLeft className="h-4 w-4" />
               </button>
               <div>
                  <h1 className="text-2xl font-black text-zinc-900 tracking-tight">{form.name || "Ürün Düzenle"}</h1>
                  <div className="mt-1 flex items-center gap-3">
                     <p className="text-[13px] text-zinc-400 font-medium">Mevcut ürün bilgilerini güncelleyin ve kaydedin.</p>
                     <span className="h-1 w-1 rounded-full bg-zinc-300" />
                     <span className="text-[11px] font-bold text-[#813d50] uppercase tracking-wider bg-[#813d50]/10 px-2 py-0.5 rounded-md">ID: {id}</span>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-3">
               <button
                  type="button"
                  onClick={() => window.open(`/admin/products/print-barcodes?ids=${id}`, "_blank")}
                  className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-[13px] font-bold text-zinc-600 shadow-sm transition-all hover:bg-zinc-50 hover:shadow-md"
               >
                  <FaBarcode className="h-3.5 w-3.5" /> Barkod Bas
               </button>
               <button type="button" onClick={() => setIsPreviewOpen(true)} className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-[13px] font-bold text-zinc-600 shadow-sm transition-all hover:bg-zinc-50 hover:shadow-md">
                  <FaEye className="h-3.5 w-3.5" /> Ön İzleme
               </button>
               <button type="button" onClick={() => handleSubmit()} disabled={submitting} className="flex items-center gap-3 rounded-xl bg-[#813d50] px-8 py-3 text-[14px] font-black text-white shadow-[0_10px_20px_-5px_rgba(79,111,82,0.4)] transition-all hover:bg-[#673040] hover:translate-y-[-2px] active:translate-y-0 disabled:opacity-50">
                  {submitting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : <FaSave className="h-4 w-4" />}
                  Değişiklikleri Kaydet
               </button>
            </div>
         </div>

         {/* ── SEKMELER ───────────────────────────────────────────────────── */}
         <div className="mb-8 flex gap-2 rounded-2xl border border-zinc-200/60 bg-white p-1.5 w-fit shadow-sm ring-1 ring-zinc-100">
            {([{ key: "info", label: "Genel Ürün Bilgileri", icon: <FaInfoCircle className="h-3.5 w-3.5" /> }, { key: "seo", label: "Arama Motoru (SEO)", icon: <FaGlobe className="h-3.5 w-3.5" /> }] as const).map(tab => (
               <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2.5 rounded-xl px-6 py-2.5 text-[13px] font-bold transition-all duration-300 ${activeTab === tab.key ? "bg-zinc-900 text-white shadow-lg -translate-y-px" : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"}`}>
                  {tab.icon} {tab.label}
                  {activeTab === tab.key && <motion.div layoutId="activeTab" className="h-1.5 w-1.5 rounded-full bg-[#813d50]" />}
               </button>
            ))}
         </div>

         <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
               {activeTab === "info" && (
                  <motion.div key="info" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
                     <div className="space-y-8">
                        <section className="rounded-2xl border border-zinc-100 bg-white p-8 shadow-sm ring-1 ring-zinc-100">
                           <SectionHeader icon={<FaInfoCircle className="h-5 w-5" />} title="Ürün Kimliği" subtitle="Ürünün temel tanımlayıcı özelliklerini girin." />
                           <div className="space-y-6">
                              <Field label="Ürün Adı" required tooltip="Müşterilerin göreceği ana başlık. SEO için önemlidir.">
                                 <input required type="text" name="name" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Ürün adını girin..." className={INPUT_CLS} />
                              </Field>
                              <div className="grid grid-cols-2 gap-4">
                                 <Field label="Kategori">
                                    <select value={form.categoryId} onChange={e => set("categoryId", e.target.value)} className={INPUT_CLS + " cursor-pointer"}>
                                       <option value="">Seçiniz</option>
                                       {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                 </Field>
                                 <Field label="Alt Kategori">
                                    <select value={form.subCategoryId} onChange={e => set("subCategoryId", e.target.value)} className={INPUT_CLS + " cursor-pointer disabled:opacity-50"} disabled={!form.categoryId || subCategories.length === 0}>
                                       <option value="">{form.categoryId ? (subCategories.length > 0 ? "Seçiniz" : "Alt kategori yok") : "Önce kategori seçin"}</option>
                                       {subCategories.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
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
                                                         className="h-4 w-4 accent-[#813d50]"
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
                                                                     className="h-4 w-4 accent-[#813d50]"
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
                                    <input type="text" value={form.sku} onChange={e => set("sku", e.target.value)} placeholder="Örn: BM-102" className={INPUT_CLS} />
                                 </Field>
                                 <Field label="Barkod" hint="EAN, UPC veya ISBN">
                                    <div className="relative flex gap-2">
                                       <div className="relative flex-1">
                                          <FaBarcode className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-300" />
                                          <input type="text" value={form.barcode} onChange={e => set("barcode", e.target.value)} placeholder="8690000000000" className={INPUT_CLS + " pl-9"} />
                                       </div>
                                       <button type="button" onClick={generateBarcode} className="h-11 px-4 rounded-xl border border-zinc-200 bg-zinc-50 text-[11px] font-bold text-zinc-500 hover:bg-zinc-100">OTOMATİK ÜRET</button>
                                    </div>
                                 </Field>
                              </div>
                              <Field label="Oluşturulma Tarihi" hint="Ürünü başa almak için bu tarihi güncelleyebilirsiniz.">
                                 <input type="datetime-local" value={form.createdAt} onChange={e => set("createdAt", e.target.value)} className={INPUT_CLS} />
                              </Field>
                              <Field label="Kısa Özet Açıklama" hint="Max 250 karakter" tooltip="Liste sayfasında görselin altında görünen etkileyici metin.">
                                 <textarea rows={3} value={form.shortDescription} onChange={e => set("shortDescription", e.target.value)} placeholder="Ürünü en vurucu şekilde anlatın..." className={TEXTAREA_CLS} maxLength={250} />
                                 <div className="mt-2 flex justify-end"><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${form.shortDescription.length > 200 ? 'bg-amber-100 text-amber-600' : 'bg-zinc-100 text-zinc-400'}`}>{form.shortDescription.length} / 250</span></div>
                              </Field>
                           </div>
                        </section>

                        <section className="rounded-2xl border border-zinc-100 bg-white p-8 shadow-sm ring-1 ring-zinc-100">
                           <SectionHeader icon={<FaInfoCircle className="h-5 w-5" />} title="Ürün Hikayesi & Detaylar" />
                           <RichEditor value={description} onChange={setDescription} />
                        </section>

                        <section className="rounded-[32px] border border-zinc-100 bg-white p-8 shadow-sm ring-1 ring-zinc-100">
                           <SectionHeader 
                              icon={<FaLayerGroup className="h-5 w-5 text-[#813d50]" />} 
                              title="Varyasyonlar & Stok Havuzu" 
                              action={
                                 <div className="flex items-center gap-3">
                                    <button 
                                       type="button" 
                                       onClick={handleBulkPriceUpdate} 
                                       className="rounded-xl bg-zinc-100 px-5 py-3 text-[11px] font-black text-zinc-600 hover:bg-zinc-200 transition-all uppercase tracking-widest"
                                    >
                                       Fiyatları Eşitle
                                    </button>
                                    <button 
                                       type="button" 
                                       onClick={addVariant} 
                                       className="flex items-center gap-2 rounded-xl bg-[#813d50] px-6 py-3 text-[12px] font-black text-white hover:bg-[#673040] shadow-xl shadow-[#813d50]/20 transition-all active:scale-95"
                                    >
                                       <FaPlus className="h-3 w-3" /> YENİ SEÇENEK
                                    </button>
                                 </div>
                              } 
                           />

                           <div className="space-y-4">
                              <Reorder.Group axis="y" values={variants} onReorder={setVariants} className="space-y-4">
                                 {variants.map((v, idx) => {
                                    const isExpanded = expandedVariantIds.has(v.id)
                                    const isLowStock = Number(v.stock) <= Number(v.lowStockThreshold) && Number(v.stock) > 0
                                    const isOutOfStock = Number(v.stock) === 0

                                    return (
                                       <Reorder.Item 
                                          key={v.id} 
                                          value={v} 
                                          className={`group relative flex flex-col rounded-[24px] border transition-all duration-300 ${
                                             isExpanded ? "border-[#813d50]/30 bg-white shadow-xl" : "border-zinc-100 bg-zinc-50/30 hover:border-zinc-200"
                                          }`}
                                       >
                                          {/* Card Header — Her zaman görünür */}
                                          <div 
                                             onClick={() => toggleVariantExpansion(v.id)}
                                             className="flex cursor-pointer items-center justify-between px-6 py-5"
                                          >
                                             <div className="flex items-center gap-4">
                                                <div className="flex h-10 w-10 cursor-grab items-center justify-center rounded-xl bg-white text-zinc-300 shadow-sm transition-colors hover:text-[#813d50] active:cursor-grabbing" onClick={e => e.stopPropagation()}>
                                                   <svg width="12" height="18" viewBox="0 0 12 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                      <circle cx="2" cy="2" r="1.5" fill="currentColor"/><circle cx="2" cy="9" r="1.5" fill="currentColor"/><circle cx="2" cy="16" r="1.5" fill="currentColor"/>
                                                      <circle cx="10" cy="2" r="1.5" fill="currentColor"/><circle cx="10" cy="9" r="1.5" fill="currentColor"/><circle cx="10" cy="16" r="1.5" fill="currentColor"/>
                                                   </svg>
                                                </div>
                                                <div className="flex flex-col">
                                                   <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Varyasyon #{idx + 1}</span>
                                                   <span className={`text-[15px] font-bold ${v.name ? "text-zinc-800" : "text-zinc-400 italic"}`}>
                                                      {v.name || "İsimsiz Varyasyon"}
                                                   </span>
                                                </div>
                                             </div>

                                             <div className="flex items-center gap-6">
                                                {/* Özet Bilgiler (Kapalıyken de görünür) */}
                                                {!isExpanded && (
                                                   <div className="hidden items-center gap-6 sm:flex">
                                                      <div className="flex flex-col items-end">
                                                         <span className="text-[9px] font-black uppercase text-zinc-400">Fiyat</span>
                                                         <span className="text-[13px] font-bold text-zinc-700">₺{Number(v.compareAtPrice || v.price || 0).toLocaleString("tr-TR")}</span>
                                                      </div>
                                                      <div className="flex flex-col items-end">
                                                         <span className="text-[9px] font-black uppercase text-zinc-400">Stok</span>
                                                         <span className={`text-[13px] font-bold ${isOutOfStock ? "text-rose-500" : isLowStock ? "text-amber-500" : "text-emerald-600"}`}>
                                                            {v.stock} Adet
                                                         </span>
                                                      </div>
                                                   </div>
                                                )}

                                                <div className="flex items-center gap-2">
                                                   <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
                                                      <FaChevronDown className="h-3 w-3" />
                                                   </div>
                                                   <button 
                                                      type="button" 
                                                      onClick={(e) => { e.stopPropagation(); removeVariant(v.id); }} 
                                                      className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-300 hover:bg-rose-50 hover:text-rose-500 transition-all"
                                                   >
                                                      <FaTimes className="h-4 w-4" />
                                                   </button>
                                                </div>
                                             </div>
                                          </div>

                                          {/* Expandable Content */}
                                          {isExpanded && (
                                             <div className="border-t border-zinc-50 p-6 pt-2">
                                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                                                   <div className="space-y-2">
                                                      <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400">Varyant İsmi</label>
                                                      <input 
                                                         type="text" 
                                                         value={v.name} 
                                                         onChange={e => setVariantField(v.id, "name", e.target.value)} 
                                                         placeholder="Örn: M / Mavi" 
                                                         className="h-12 w-full rounded-2xl border border-zinc-100 bg-zinc-50/50 px-4 text-[14px] font-bold text-zinc-800 outline-none transition-all focus:border-[#813d50] focus:bg-white" 
                                                      />
                                                   </div>
                                                   <div className="space-y-2">
                                                      <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400">Varyant SKU</label>
                                                      <input 
                                                         type="text" 
                                                         value={v.sku} 
                                                         onChange={e => setVariantField(v.id, "sku", e.target.value)} 
                                                         placeholder="BK-102-M" 
                                                         className="h-12 w-full rounded-2xl border border-zinc-100 bg-zinc-50/50 px-4 text-[13px] font-medium text-zinc-500 outline-none transition-all focus:border-[#813d50] focus:bg-white" 
                                                      />
                                                   </div>
                                                   <div className="space-y-2">
                                                      <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400">Satış Fiyatı (₺)</label>
                                                      <input 
                                                         type="number" 
                                                         value={v.price || ""} 
                                                         onChange={e => setVariantField(v.id, "price", e.target.value)} 
                                                         placeholder={form.basePrice || "0.00"} 
                                                         className="h-12 w-full rounded-2xl border border-zinc-100 bg-zinc-50/50 px-4 text-[14px] font-black text-zinc-900 outline-none transition-all focus:border-[#813d50] focus:bg-white" 
                                                      />
                                                   </div>
                                                   <div className="space-y-2">
                                                      <label className="text-[11px] font-black uppercase tracking-wider text-rose-400">İndirimli Fiyat (₺)</label>
                                                      <input 
                                                         type="number" 
                                                         value={v.compareAtPrice || ""} 
                                                         onChange={e => setVariantField(v.id, "compareAtPrice", e.target.value)} 
                                                         placeholder={form.compareAtPrice || "0.00"} 
                                                         className="h-12 w-full rounded-2xl border border-rose-100 bg-rose-50/20 px-4 text-[14px] font-black text-rose-600 outline-none transition-all focus:border-[#813d50] focus:bg-white" 
                                                      />
                                                   </div>
                                                </div>

                                                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                                   <div className="space-y-2">
                                                      <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400">Mevcut Stok</label>
                                                      <input 
                                                         type="number" 
                                                         value={v.stock || ""} 
                                                         onChange={e => setVariantField(v.id, "stock", e.target.value)} 
                                                         className={`h-12 w-full rounded-2xl border px-5 text-[15px] font-black outline-none transition-all focus:border-[#813d50] 
                                                            ${isOutOfStock ? "border-rose-200 bg-rose-50 text-rose-500" : "border-zinc-100 bg-zinc-50/50 text-zinc-900"}`} 
                                                      />
                                                   </div>
                                                   <div className="space-y-2">
                                                      <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400">Kritik Stok Eşiği</label>
                                                      <input 
                                                         type="number" 
                                                         value={v.lowStockThreshold || ""} 
                                                         onChange={e => setVariantField(v.id, "lowStockThreshold", e.target.value)} 
                                                         className="h-12 w-full rounded-2xl border border-zinc-100 bg-zinc-50/50 px-5 text-[13px] font-bold text-zinc-400 outline-none transition-all focus:border-[#813d50] focus:bg-white" 
                                                      />
                                                   </div>
                                                   <div className="flex items-end pb-1">
                                                      <button
                                                         type="button"
                                                         onClick={() => window.open(`/admin/products/print-barcodes?variantIds=${v.id}`, "_blank")}
                                                         className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 text-[12px] font-black text-white hover:bg-zinc-800 transition-all active:scale-95"
                                                      >
                                                         <FaBarcode className="h-4 w-4" /> BARKOD YAZDIR
                                                      </button>
                                                   </div>
                                                </div>
                                             </div>
                                          )}
                                       </Reorder.Item>
                                    )
                                 })}
                              </Reorder.Group>
                           </div>

                           {/* Bottom Summary */}
                           <div className="mt-8 flex flex-col gap-6 rounded-[32px] bg-zinc-950 p-8 text-white shadow-2xl lg:flex-row lg:items-center lg:justify-between">
                              <div className="flex items-center gap-10">
                                 <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Seçenek Sayısı</span>
                                    <span className="mt-2 text-3xl font-black tracking-tighter">{variants.length}</span>
                                 </div>
                                 <div className="h-12 w-px bg-white/10 hidden sm:block" />
                                 <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Toplam Stok Kapasitesi</span>
                                    <div className="mt-2 flex items-baseline gap-2">
                                       <span className={`text-3xl font-black tracking-tighter ${totalStock === 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                                          {totalStock.toLocaleString("tr-TR")}
                                       </span>
                                       <span className="text-[10px] font-bold text-zinc-500">ADET</span>
                                    </div>
                                 </div>
                              </div>
                              <div className="flex items-center gap-4 rounded-2xl bg-white/5 px-6 py-4 border border-white/10 backdrop-blur-sm">
                                 <FaInfoCircle className="h-5 w-5 text-zinc-500" />
                                 <p className="max-w-[280px] text-[11px] font-medium leading-relaxed text-zinc-400">
                                    Varyasyonları sürükleyerek sıralayabilirsiniz. Bu sıralama mağaza sayfasındaki listede de geçerli olacaktır.
                                 </p>
                              </div>
                           </div>
                        </section>
                     </div>

                     <div className="space-y-8">
                        <section className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm ring-1 ring-zinc-100">
                           <SectionHeader icon={<FaImage className="h-4 w-4" />} title="Ürün Görselleri" subtitle="Sürükle bırak veya link yapıştır." />
                           <div className="mb-6 space-y-4">
                              <button type="button" onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-10 transition-all ${isDraggingFile ? "border-[#813d50] bg-[#813d50]/10 scale-[1.02]" : "border-[#813d50]/20 bg-[#813d50]/5 hover:bg-[#813d50]/10"}`}>
                                 <motion.div animate={isDraggingFile ? { y: [0, -10, 0] } : {}} className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg text-[#813d50] mb-2"><FaPlus className="h-6 w-6" /></motion.div>
                                 <p className="text-[14px] font-bold text-[#813d50]">{isDraggingFile ? "BIRAKIN" : "SÜRÜKLEYİN"}</p>
                              </button>
                              <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple accept="image/*" className="hidden" />
                              <div className="relative group"><input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addImage())} placeholder="Veya link yapıştırın..." className={INPUT_CLS + " pr-12"} /><button type="button" onClick={addImage} className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[#813d50] text-white transition-all hover:scale-110"><FaPlus className="h-3 w-3" /></button></div>
                           </div>
                           <Reorder.Group axis="y" values={images} onReorder={setImages} className="space-y-3">
                              {images.map((img, i) => (
                                 <Reorder.Item key={img.id} value={img}>
                                    <ImageRow
                                       url={img.url}
                                       index={i}
                                       isFirst={i === 0}
                                       isLast={i === images.length - 1}
                                       onRemove={() => removeImage(i)}
                                       onMoveUp={() => moveImage(i, -1)}
                                       onMoveDown={() => moveImage(i, 1)}
                                    />
                                 </Reorder.Item>
                              ))}
                           </Reorder.Group>
                        </section>

                        <section className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm ring-1 ring-zinc-100">
                           <SectionHeader icon={<FaTag className="h-4 w-4" />} title="Finansal Özet" />
                           <div className="space-y-5">
                              <div className="grid grid-cols-2 gap-4">
                                 <Field label="Temel Fiyat (₺)">
                                    <div className="relative flex gap-2">
                                       <input type="number" value={form.basePrice} onChange={e => set("basePrice", e.target.value)} className={INPUT_CLS + " font-black text-zinc-900"} />
                                       <button type="button" onClick={() => {
                                          if (window.confirm("Bu fiyatı tüm varyasyonlara normal fiyat olarak uygulamak istiyor musunuz?")) {
                                             setVariants(prev => prev.map(v => ({ ...v, price: form.basePrice })))
                                             setToast({ msg: "Normal fiyatlar eşitlendi.", ok: true })
                                             setTimeout(() => setToast(null), 2000)
                                          }
                                       }} className="h-11 px-3 rounded-xl bg-zinc-100 text-zinc-500 hover:bg-zinc-200" title="Tüm Varyasyonlara Uygula"><FaRedo className="h-3 w-3" /></button>
                                    </div>
                                 </Field>
                                 <Field label="İndirimli Fiyat">
                                    <div className="relative flex gap-2">
                                       <input type="number" value={form.compareAtPrice} onChange={e => set("compareAtPrice", e.target.value)} className={INPUT_CLS + " font-bold text-red-500"} />
                                       <button type="button" onClick={() => {
                                          if (window.confirm("Bu indirimli fiyatı tüm varyasyonlara uygulamak istiyor musunuz?")) {
                                             setVariants(prev => prev.map(v => ({ ...v, compareAtPrice: form.compareAtPrice })))
                                             setToast({ msg: "İndirimli fiyatlar eşitlendi.", ok: true })
                                             setTimeout(() => setToast(null), 2000)
                                          }
                                       }} className="h-11 px-3 rounded-xl bg-red-50 text-red-400 hover:bg-red-100" title="Tüm Varyasyonlara Uygula"><FaRedo className="h-3 w-3" /></button>
                                    </div>
                                 </Field>
                              </div>
                              <div className="rounded-xl bg-zinc-50 p-4 space-y-3">
                                 <div className="flex justify-between items-center text-[12px]"><span className="text-zinc-500 font-medium">Strateji:</span><span className="font-bold text-[#813d50]">{form.isTaxIncluded ? "Vergi Dahil" : "Vergi Hariç"}</span></div>
                                 <div className="h-px bg-zinc-200/50" />
                                 <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[13px]"><span className="text-zinc-500 font-medium">Net Fiyat</span><span className="font-bold text-zinc-800">₺{(() => { const p = Number(hasDiscount ? form.compareAtPrice : form.basePrice); const r = Number(form.taxRate) / 100; return (form.isTaxIncluded ? (p / (1 + r)) : p).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) })()}</span></div>
                                    <div className="flex justify-between items-center text-[13px]"><span className="text-zinc-500 font-medium">KDV (%{form.taxRate})</span><span className="font-bold text-zinc-400">₺{(() => { const p = Number(hasDiscount ? form.compareAtPrice : form.basePrice); const r = Number(form.taxRate) / 100; return (form.isTaxIncluded ? (p - (p / (1 + r))) : (p * r)).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) })()}</span></div>
                                 </div>
                                 <div className="h-px bg-zinc-200/50" /><div className="flex justify-between items-center text-[14px]"><span className="text-zinc-800 font-black">Toplam</span><span className="font-black text-[#813d50]">₺{(() => { const p = Number(hasDiscount ? form.compareAtPrice : form.basePrice); const r = Number(form.taxRate) / 100; return (form.isTaxIncluded ? p : (p * (1 + r))).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) })()}</span></div>
                              </div>

                              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                                 <div className="flex gap-3">
                                    <FaInfoCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                    <div className="space-y-1.5">
                                       <p className="text-[12px] font-bold text-blue-900">Fiyatlandırma Rehberi</p>
                                       <ul className="text-[11px] text-blue-800/80 space-y-1 list-disc pl-3 leading-relaxed">
                                          <li><b>Temel Fiyat:</b> Ürünün normal satış fiyatıdır.</li>
                                          <li><b>İndirimli Fiyat:</b> Müşterinin ödeyeceği fiyattır. Temel fiyattan düşükse otomatik indirim etiketi oluşur.</li>
                                          <li>Yandaki <b>kırmızı yenile ikonu</b>, o fiyatı tüm alt varyasyonlara (beden/renk) anında kopyalar.</li>
                                          <li>Varyasyonlara özel farklı fiyatlar vermek isterseniz, aşağıdaki "Varyasyonlar" tablosunu kullanabilirsiniz.</li>
                                       </ul>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </section>

                        <section className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm ring-1 ring-zinc-100">
                           <SectionHeader icon={<FaTag className="h-4 w-4" />} title="Vergi Yapılandırması" />
                           <div className="grid grid-cols-2 gap-4">
                              <Field label="Vergi Oranı (%)"><select value={form.taxRate} onChange={e => set("taxRate", e.target.value)} className={SELECT_CLS}><option value="20">%20</option><option value="10">%10</option><option value="1">%1</option><option value="0">%0</option></select></Field>
                              <div className="pt-6"><Toggle label="Vergi Dahil" checked={form.isTaxIncluded} onChange={v => set("isTaxIncluded", v)} /></div>
                           </div>
                        </section>

                        <section className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm ring-1 ring-zinc-100">
                           <SectionHeader icon={<FaCheckCircle className="h-4 w-4" />} title="Yayın Durumu" />
                           <div className="space-y-4"><Toggle label="Satışa Açık" checked={form.isActive} onChange={v => set("isActive", v)} description="Ürün mağazada listelensin mi?" /><Toggle label="Öne Çıkan" checked={form.isFeatured} onChange={v => set("isFeatured", v)} description="Ana sayfada gösterilsin mi?" /></div>
                        </section>
                     </div>
                  </motion.div>
               )}

               {activeTab === "seo" && (
                  <motion.div key="seo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
                     <div className="space-y-8">
                        <section className="rounded-2xl border border-zinc-100 bg-white p-8 shadow-sm ring-1 ring-zinc-100">
                           <SectionHeader icon={<FaGlobe className="h-5 w-5" />} title="Meta Bilgileri" subtitle="Arama motorlarında nasıl görüneceğinizi belirleyin." />
                           <div className="space-y-6">
                              <Field label="URL Uzantısı (Slug)"><input type="text" value={form.slug} onChange={e => set("slug", e.target.value)} className={INPUT_CLS} placeholder="bebek-zibin-seti" /></Field>
                              <Field label="SEO Başlığı"><input type="text" value={form.metaTitle} onChange={e => set("metaTitle", e.target.value)} className={INPUT_CLS} maxLength={60} /></Field>
                              <Field label="Meta Açıklaması"><textarea rows={4} value={form.metaDescription} onChange={e => set("metaDescription", e.target.value)} className={TEXTAREA_CLS} maxLength={160} /></Field>
                           </div>
                        </section>
                     </div>
                     <div className="space-y-8">
                        <section className="rounded-2xl bg-zinc-900 p-8 text-white shadow-xl"><h4 className="text-[13px] font-black uppercase tracking-widest text-zinc-500">Google Ön İzleme</h4><div className="mt-4 space-y-1"><p className="text-[18px] text-[#8ab4f8] hover:underline cursor-pointer truncate">{form.metaTitle || form.name || "Ürün Başlığı"}</p><p className="text-[14px] text-[#34a853]">seymacollection.com/urun/{form.slug}</p><p className="text-[13px] text-zinc-400 line-clamp-2">{form.metaDescription || "Arama sonuçlarında görünecek açıklama metni..."}</p></div></section>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>
         </form>

         {/* ── ÖN İZLEME MODALI ───────────────────────────────────────────── */}
         <AnimatePresence>
            {isPreviewOpen && (
               <div className="fixed inset-0 z-200 flex items-center justify-center p-4 sm:p-8">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPreviewOpen(false)} className="absolute inset-0 bg-zinc-900/80 backdrop-blur-md" />
                  <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative h-full max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[32px] bg-white shadow-2xl">
                     <div className="absolute right-6 top-6 z-10"><button onClick={() => setIsPreviewOpen(false)} className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-xl hover:scale-110"><FaTimes className="h-5 w-5" /></button></div>
                     <div className="h-full overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 lg:grid-cols-2">
                           <div className="bg-zinc-50 p-8 lg:p-12">
                              {images.length > 0 ? <div className="space-y-6"><div className="aspect-square overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-zinc-200"><img src={images[0].url} className="h-full w-full object-cover" /></div><div className="grid grid-cols-4 gap-4">{images.slice(1, 5).map((img, i) => <div key={img.id ?? i} className="aspect-square overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200"><img src={img.url} className="h-full w-full object-cover" /></div>)}</div></div> : <div className="flex aspect-square items-center justify-center rounded-3xl border-2 border-dashed border-zinc-300 bg-white text-zinc-300"><FaImage className="h-16 w-16" /></div>}
                           </div>
                           <div className="p-8 lg:p-12">
                              <h2 className="text-3xl font-black text-zinc-900">{form.name}</h2>
                              <p className="mt-4 text-[15px] text-zinc-500">{form.shortDescription}</p>
                              <div className="mt-8 flex items-baseline gap-4"><span className="text-4xl font-black text-[#813d50]">₺{Number(hasDiscount ? form.compareAtPrice : form.basePrice).toLocaleString("tr-TR")}</span></div>
                              <div className="mt-12"><div className="mb-4 border-b border-zinc-100 pb-2"><span className="border-b-2 border-[#813d50] pb-2 text-[13px] font-bold text-[#813d50]">Ürün Detayları</span></div><div className="prose prose-sm text-zinc-600" dangerouslySetInnerHTML={{ __html: description }} /></div>
                           </div>
                        </div>
                     </div>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>

         <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #e4e4e7; border-radius: 10px; }
         `}</style>
      </div>
   )
}
