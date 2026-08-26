"use client"

import { useState, useEffect, useCallback, useMemo, useRef, Fragment, startTransition } from "react"
import {
   FaSearch,
   FaPlus,
   FaEdit,
   FaTrash,
   FaEye,
   FaBox,
   FaChevronLeft,
   FaChevronRight,
   FaThLarge,
   FaList,
   FaFileExport,
   FaSort,
   FaSortUp,
   FaSortDown,
   FaExclamationTriangle,
   FaToggleOn,
   FaToggleOff,
   FaTag,
   FaPercent,
   FaBarcode,
   FaSync,
   FaCheckCircle,
} from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"

// ── Tipler ───────────────────────────────────────────────────────────────────
type SortField = "name" | "basePrice" | "stock" | "createdAt"
type SortDir = "asc" | "desc"
type ViewMode = "list" | "grid"

interface Variant { stock: number; size?: string; color?: string }
type CategoryTreeRow = {
   id: number
   name: string
   parent?: { id: number; name: string; slug: string } | null
   children: { id: number; name: string; slug: string }[]
}
interface Product {
   id: string
   name: string
   slug: string
   sku?: string
   basePrice: number
   salePrice?: number
   isActive: boolean
   images: { url: string }[]
   category?: { id: string; name: string }
   variants: Variant[]
   createdAt?: string
   /// Trendyol'da GERÇEKTE hangi productMainId altında kayıtlı olduğu biliniyorsa dolu —
   /// ürün zaten yayında demektir, tekrar "gönder" denemesi Trendyol tarafında hep reddedilir.
   trendyolProductMainId?: string | null
}

// ── Yardımcı fonksiyonlar ────────────────────────────────────────────────────
function totalStock(p: Product) {
   return p.variants.reduce((s, v) => s + v.stock, 0)
}

function stockStatus(p: Product): "ok" | "low" | "out" {
   const total = totalStock(p)
   if (total === 0) return "out"
   if (p.variants.some(v => v.stock <= 5)) return "low"
   return "ok"
}

const STOCK_META = {
   ok: { label: "Stokta", bg: "#d1fae5", color: "#065f46", dot: "#4f6f52" },
   low: { label: "Azalıyor", bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
   out: { label: "Tükendi", bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" },
}

function StockBadge({ product }: { product: Product }) {
   const st = stockStatus(product)
   const m = STOCK_META[st]
   return (
      <span
         className="inline-flex items-center gap-1.5 rounded-[5px] px-2 py-0.5 text-[10.5px] font-medium"
         style={{ background: m.bg, color: m.color }}
      >
         <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.dot }} />
         {m.label}
      </span>
   )
}

function SortIcon({ field, active, dir }: { field: string; active: string; dir: SortDir }) {
   if (active !== field) return <FaSort className="h-2.5 w-2.5 text-zinc-300" />
   return dir === "asc"
      ? <FaSortUp className="h-2.5 w-2.5 text-[#4f6f52]" />
      : <FaSortDown className="h-2.5 w-2.5 text-[#4f6f52]" />
}

// ── Grid kart ────────────────────────────────────────────────────────────────
function ProductCard({ product, i, editHref }: { product: Product; i: number; editHref: (id: string | number) => string }) {
   const st = stockStatus(product)
   const total = totalStock(product)
   const hasDiscount = product.salePrice && product.salePrice < product.basePrice

   return (
      <motion.div
         key={product.id}
         initial={{ opacity: 0, y: 8 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: i * 0.04 }}
         className="group relative overflow-hidden rounded-xl border border-zinc-100 bg-white
                 transition-shadow hover:shadow-md"
      >
         {/* Görsel */}
         <div className="relative aspect-4/3 overflow-hidden bg-zinc-50">
            <Image
               src={product.images[0]?.url ?? "/logo.jpeg"}
               alt={product.name}
               fill
               className="object-cover transition-transform duration-500 group-hover:scale-105"
            />

            {/* Overlay aksiyonlar */}
            <div className="absolute inset-0 flex items-center justify-center gap-2
                        bg-black/30 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100">
               <Link
                  href={`/products/${product.slug}`}
                  target="_blank"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/90 text-zinc-700
                       shadow transition hover:bg-white"
               >
                  <FaEye className="h-3.5 w-3.5" />
               </Link>
               <Link
                  href={editHref(product.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4f6f52] text-white
                       shadow transition hover:bg-[#3d5a3f]"
               >
                  <FaEdit className="h-3.5 w-3.5" />
               </Link>
            </div>

            {/* Stok uyarı ikonu */}
            {st !== "ok" && (
               <div className="absolute left-2 top-2">
                  <span
                     className="flex items-center gap-1 rounded-[5px] px-1.5 py-0.5 text-[10px] font-medium shadow"
                     style={{ background: STOCK_META[st].bg, color: STOCK_META[st].color }}
                  >
                     <FaExclamationTriangle className="h-2.5 w-2.5" />
                     {STOCK_META[st].label}
                  </span>
               </div>
            )}

            {/* Aktif/Pasif */}
            <div className="absolute right-2 top-2">
               <span
                  className={`inline-block rounded-[4px] px-1.5 py-0.5 text-[10px] font-medium shadow
              ${product.isActive
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-zinc-100 text-zinc-500"}`}
               >
                  {product.isActive ? "Aktif" : "Pasif"}
               </span>
            </div>
         </div>

         {/* Bilgi */}
         <div className="p-3.5">
            {product.category && (
               <p className="mb-1 text-[10.5px] text-zinc-400">{product.category.name}</p>
            )}
            <p className="mb-2 line-clamp-2 text-[13px] font-medium leading-snug text-zinc-800">
               {product.name}
            </p>

            <div className="flex items-end justify-between">
               <div>
                  {hasDiscount ? (
                     <>
                        <p className="text-[14px] font-semibold text-zinc-800">
                           ₺{Number(product.salePrice).toLocaleString("tr-TR")}
                        </p>
                        <p className="text-[11px] text-zinc-400 line-through">
                           ₺{Number(product.basePrice).toLocaleString("tr-TR")}
                        </p>
                     </>
                  ) : (
                     <p className="text-[14px] font-semibold text-zinc-800">
                        ₺{Number(product.basePrice).toLocaleString("tr-TR")}
                     </p>
                  )}
               </div>
               <div className="text-right">
                  <p className={`text-[13px] font-medium ${st === "out" ? "text-red-500" : st === "low" ? "text-amber-600" : "text-zinc-700"}`}>
                     {total}
                  </p>
                  <p className="text-[10px] text-zinc-400">{product.variants.length} varyant</p>
               </div>
            </div>
         </div>
      </motion.div>
   )
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────
export default function AdminProducts() {
   const pathname = usePathname()
   const [products, setProducts] = useState<Product[]>([])
   const [categoryTree, setCategoryTree] = useState<CategoryTreeRow[]>([])
   const [loading, setLoading] = useState(true)
   const [search, setSearch] = useState("")
   const [page, setPage] = useState(1)
   const [pageSize, setPageSize] = useState(24)
   const didRestoreRef = useRef(false)
   const fetchSeqRef = useRef(0)
   const fetchAbortRef = useRef<AbortController | null>(null)
   const [totalPages, setTotalPages] = useState(1)
   const [totalCount, setTotalCount] = useState(0)
   const [view, setView] = useState<ViewMode>("list")
   const [categoryId, setCategoryId] = useState("")
   const [stockFilter, setStockFilter] = useState("ALL")
   const [sortField, setSortField] = useState<SortField>("createdAt")
   const [sortDir, setSortDir] = useState<SortDir>("desc")
   const [selected, setSelected] = useState<Set<string>>(new Set())

   const returnTo = useMemo(() => {
      const params = new URLSearchParams()
      if (page > 1) params.set("page", String(page))
      if (pageSize !== 24) params.set("limit", String(pageSize))
      if (search) params.set("search", search)
      if (sortField) params.set("sort", sortField)
      if (sortDir) params.set("dir", sortDir)
      if (categoryId) params.set("categoryId", categoryId)
      if (stockFilter && stockFilter !== "ALL") params.set("stockFilter", stockFilter)
      const qs = params.toString()
      return `${pathname}${qs ? `?${qs}` : ""}`
   }, [pathname, page, pageSize, search, sortField, sortDir, categoryId, stockFilter])

   const editHref = useCallback(
      (id: string | number) => `/admin/products/${id}/edit?from=${encodeURIComponent(returnTo)}`,
      [returnTo]
   )

   // Restore state on mount (URL -> sessionStorage fallback)
   useEffect(() => {
      const sp = new URLSearchParams(window.location.search)
      const urlPage = Number(sp.get("page") ?? "")
      const urlLimit = Number(sp.get("limit") ?? "")
      const urlSearch = sp.get("search")
      const urlSort = sp.get("sort")
      const urlDir = sp.get("dir")
      const urlCategoryId = sp.get("categoryId")
      const urlStockFilter = sp.get("stockFilter")

      const hasUrlState =
         (Number.isFinite(urlPage) && urlPage > 0) ||
         (Number.isFinite(urlLimit) && urlLimit > 0) ||
         urlSearch !== null ||
         urlSort !== null ||
         urlDir !== null ||
         urlCategoryId !== null ||
         urlStockFilter !== null

      if (hasUrlState) {
         if (Number.isFinite(urlPage) && urlPage > 0) setPage(Math.floor(urlPage))
         if (Number.isFinite(urlLimit) && urlLimit > 0) setPageSize(Math.floor(urlLimit))
         if (urlSearch !== null) setSearch(urlSearch)
         if (urlSort === "name" || urlSort === "basePrice" || urlSort === "stock" || urlSort === "createdAt") setSortField(urlSort)
         if (urlDir === "asc" || urlDir === "desc") setSortDir(urlDir)
         if (urlCategoryId !== null) setCategoryId(urlCategoryId)
         if (urlStockFilter !== null) setStockFilter(urlStockFilter)
         didRestoreRef.current = true
         return
      }

      const saved = sessionStorage.getItem("adminProductsState")
      if (saved) {
         try {
            const parsed = JSON.parse(saved)
            if (parsed.page) setPage(parsed.page)
            if (parsed.pageSize) setPageSize(parsed.pageSize)
            if (parsed.categoryId !== undefined) setCategoryId(parsed.categoryId)
            if (parsed.stockFilter) setStockFilter(parsed.stockFilter)
            if (parsed.sortField) setSortField(parsed.sortField)
            if (parsed.sortDir) setSortDir(parsed.sortDir)
            if (parsed.search !== undefined) setSearch(parsed.search)
         } catch { }
      }
      didRestoreRef.current = true
   }, [])

   // Save page to sessionStorage when it changes
   useEffect(() => {
      if (!didRestoreRef.current) return
      sessionStorage.setItem("adminProductsState", JSON.stringify({
         page, pageSize, categoryId, stockFilter, sortField, sortDir, search
      }))
   }, [page, pageSize, categoryId, stockFilter, sortField, sortDir, search])

   // State değişince URL'yi güncelle (Next navigasyonu tetiklemeden)
   useEffect(() => {
      if (!didRestoreRef.current) return
      if (typeof window === "undefined") return
      window.history.replaceState(null, "", returnTo)
   }, [returnTo])
   const [selectAllLoading, setSelectAllLoading] = useState(false)
   const headerCheckboxRef = useRef<HTMLInputElement>(null)

   const [isBulkLoading, setIsBulkLoading] = useState(false)
   const [bulkToolsOpen, setBulkToolsOpen] = useState<null | "price" | "category">(null)
   const [priceMode, setPriceMode] = useState<"percent" | "fixed">("percent")
   const [priceAmount, setPriceAmount] = useState("")
   const [bulkCatMain, setBulkCatMain] = useState("")
   const [bulkCatSub, setBulkCatSub] = useState("")
   const [bulkCatType, setBulkCatType] = useState<"MAIN" | "EXTRA">("MAIN")
   const [bulkStockThreshold, setBulkStockThreshold] = useState("")

   const [trendyolModalOpen, setTrendyolModalOpen] = useState(false)
   const [trendyolMode, setTrendyolMode] = useState<"selected" | "all">("all")
   const [trendyolCommission, setTrendyolCommission] = useState("")
   const [trendyolCheckLoading, setTrendyolCheckLoading] = useState(false)
   const [trendyolCheckResult, setTrendyolCheckResult] = useState<{
      productCount: number
      rowCount: number
      warningCount: number
      byField: Record<string, number>
      items: { productId: number; productName: string; variantSku: string; field: string; note: string }[]
   } | null>(null)
   const [sendingToTrendyolId, setSendingToTrendyolId] = useState<string | null>(null)

   const rootCategories = useMemo(
      () => categoryTree.filter((c) => !c.parent),
      [categoryTree]
   )

   const allSubcategories = useMemo(
      () =>
         rootCategories.flatMap((r) =>
            (r.children ?? []).map((ch) => ({ ...ch, rootName: r.name }))
         ),
      [rootCategories]
   )

   const subOptionsForBulk = useMemo(() => {
      if (!bulkCatMain) return allSubcategories
      const root = rootCategories.find((r) => String(r.id) === bulkCatMain)
      if (!root) return allSubcategories
      return (root.children ?? []).map((ch) => ({ ...ch, rootName: root.name }))
   }, [bulkCatMain, rootCategories, allSubcategories])

   // Kategori ağacı (ana + alt) — toplu atama ve filtre için
   useEffect(() => {
      fetch("/api/categories")
         .then((r) => r.json())
         .then((d) => {
            const items = Array.isArray(d.items) ? d.items : []
            setCategoryTree(items)
         })
         .catch(() => { })
   }, [])

   const fetchProducts = useCallback(async () => {
      fetchAbortRef.current?.abort()
      const controller = new AbortController()
      fetchAbortRef.current = controller
      const seq = ++fetchSeqRef.current

      setLoading(true)
      try {
         const params = new URLSearchParams({
            page: String(page),
            limit: String(pageSize),
            search,
            sort: sortField,
            dir: sortDir,
            ...(categoryId && { categoryId }),
            ...(stockFilter !== "ALL" && { stockFilter }),
         })
         const res = await fetch(`/api/products?${params}`, { signal: controller.signal })
         const data = await res.json()
         if (res.ok) {
            if (seq !== fetchSeqRef.current) return
            setProducts(data.items)
            const tpRaw = data.pagination?.totalPages
            const tp = typeof tpRaw === "number" && Number.isFinite(tpRaw) && tpRaw > 0 ? tpRaw : 1
            setTotalPages(tp)
            const t = data.pagination?.total ?? data.pagination?.totalCount ?? 0
            setTotalCount(typeof t === "number" ? t : 0)
            if (page > tp) {
               setPage(tp)
               return
            }
         }
      } catch (err) {
         // Sayfa hızlı değişince eski request abort olabilir, bu normal
         if ((err as any)?.name === "AbortError") return
         console.error("Ürün listesi yüklenemedi")
      } finally {
         if (seq === fetchSeqRef.current) setLoading(false)
      }
   }, [page, pageSize, search, sortField, sortDir, categoryId, stockFilter])

   const handleBulkAction = async (action: string, value: unknown) => {
      if (selected.size === 0) return

      const ids = Array.from(selected).map((id) => Number(id)).filter((n) => Number.isInteger(n))
      if (ids.length === 0) {
         alert("Geçerli ürün kimliği yok.")
         return
      }

      if (action === "delete") {
         if (!window.confirm(`${ids.length} ürünü tamamen silmek istediğinize emin misiniz? bu işlem geri alınamaz.`)) return
      }

      setIsBulkLoading(true)
      try {
         const res = await fetch("/api/admin/products/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids, action, value })
         })
         const d = await res.json().catch(() => ({}))
         if (res.ok) {
            if (typeof d.message === "string") alert(d.message)
            setSelected(new Set())
            setBulkToolsOpen(null)
            fetchProducts()
         } else {
            alert(typeof d.message === "string" ? d.message : "Bir hata oluştu")
         }
      } catch {
         alert("Bağlantı hatası")
      } finally {
         setIsBulkLoading(false)
      }
   }

   const trendyolIdsParam = () =>
      trendyolMode === "selected" ? Array.from(selected).join(",") : ""

   const handleTrendyolCheck = async () => {
      if (trendyolMode === "selected" && selected.size === 0) return
      setTrendyolCheckLoading(true)
      setTrendyolCheckResult(null)
      try {
         const params = new URLSearchParams()
         const ids = trendyolIdsParam()
         if (ids) params.set("ids", ids)
         const res = await fetch(`/api/admin/products/trendyol-export/check?${params.toString()}`)
         const data = await res.json().catch(() => ({}))
         if (res.ok) {
            setTrendyolCheckResult(data)
         } else {
            alert(typeof data.message === "string" ? data.message : "Kontrol sırasında hata oluştu.")
         }
      } catch {
         alert("Bağlantı hatası")
      } finally {
         setTrendyolCheckLoading(false)
      }
   }

   const handleTrendyolExport = () => {
      if (trendyolMode === "selected" && selected.size === 0) return
      const params = new URLSearchParams()
      const ids = trendyolIdsParam()
      if (ids) params.set("ids", ids)
      const commission = trendyolCommission.trim()
      if (commission) params.set("commission", commission)
      window.open(`/api/admin/products/trendyol-export?${params.toString()}`, "_blank")
      setTrendyolModalOpen(false)
      setTrendyolCheckResult(null)
   }

   const handleSendToTrendyol = async (productId: string) => {
      setSendingToTrendyolId(productId)
      try {
         const res = await fetch(`/api/admin/products/${productId}/trendyol-sync`, { method: "POST" })
         const data = await res.json().catch(() => ({}))
         if (!res.ok) {
            alert(typeof data.message === "string" ? data.message : "Trendyol'a gönderilemedi.")
            return
         }
         if (data.alreadyListedMainId) {
            alert(`Bu ürün Trendyol'da zaten kayıtlı (${data.alreadyListedMainId}) — gönderime gerek yoktu, kaydı tutuldu.`)
         } else if (data.skippedNoValueId?.length > 0) {
            alert(
               `Gönderildi ama ${data.skippedNoValueId.length} varyant eşleşmedi:\n` +
                  data.skippedNoValueId.map((s: { field: string }) => s.field).join("\n")
            )
         } else {
            alert(`Trendyol'a gönderildi (${data.pushedCount} varyant). Sonuç birkaç dakika içinde /admin/trendyol sayfasında görünür.`)
         }
      } catch {
         alert("Bağlantı hatası")
      } finally {
         setSendingToTrendyolId(null)
      }
   }

   useEffect(() => {
      startTransition(() => {
         void fetchProducts()
      })
   }, [fetchProducts])

   useEffect(() => {
      setSelected(new Set())
   }, [search, categoryId, stockFilter])

   useEffect(() => {
      const el = headerCheckboxRef.current
      if (!el) return
      const currentPageIds = products.map(p => String(p.id))
      const selectedOnPage = currentPageIds.filter(id => selected.has(id)).length
      const isFullPage = products.length > 0 && selectedOnPage === products.length
      
      el.indeterminate = selectedOnPage > 0 && !isFullPage
   }, [selected, products])

   const handleSearch = (e: React.FormEvent) => {
      e.preventDefault()
      setPage(1)
      fetchProducts()
   }

   const toggleSort = (field: SortField) => {
      if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc")
      else { setSortField(field); setSortDir("asc") }
   }

   const toggleSelect = (id: string | number) => {
      const key = String(id)
      setSelected(prev => {
         const next = new Set(prev)
         if (next.has(key)) next.delete(key)
         else next.add(key)
         return next
      })
   }

   const toggleSelectAll = () => {
      if (products.length === 0) return

      const currentPageIds = products.map(p => String(p.id))
      const isAllSelectedOnPage = currentPageIds.every(id => selected.has(id))

      setSelected(prev => {
         const next = new Set(prev)
         if (isAllSelectedOnPage) {
            currentPageIds.forEach(id => next.delete(id))
         } else {
            currentPageIds.forEach(id => next.add(id))
         }
         return next
      })
   }

   const selectAllInDatabase = async () => {
      setSelectAllLoading(true)
      try {
         const params = new URLSearchParams({
            search,
            ...(categoryId && { categoryId }),
            ...(stockFilter !== "ALL" && { stockFilter }),
         })
         const res = await fetch(`/api/admin/products/ids?${params}`)
         const data = await res.json().catch(() => ({}))
         if (!res.ok) {
            alert(typeof data.message === "string" ? data.message : "Ürün listesi alınamadı.")
            return
         }
         if (data.capped) {
            alert(
               `Sonuç çok geniş; en fazla ${Number(data.maxIds).toLocaleString("tr-TR")} ürün seçildi. Filtreleri daraltın.`
            )
         }
         const ids = Array.isArray(data.ids) ? data.ids : []
         setSelected(new Set(ids.map((id: number) => String(id))))
      } catch {
         alert("Bağlantı hatası")
      } finally {
         setSelectAllLoading(false)
      }
   }

   const applyBulkPrice = () => {
      const amt = Number(String(priceAmount).replace(",", "."))
      if (!Number.isFinite(amt)) {
         alert("Geçerli bir tutar girin.")
         return
      }
      if (priceMode === "percent" && amt <= -100) {
         alert("Yüzde indirim -100'den küçük olamaz (fiyat sıfıra iner).")
         return
      }
      void handleBulkAction("price_adjust", { mode: priceMode, amount: amt })
   }

   const applyBulkCategories = () => {
      const payload: { categoryId?: number | null; subCategoryId?: number | null; extraCategoryId?: number; stockThreshold?: number } = {}
      
      if (bulkCatType === "MAIN") {
         if (bulkCatMain) payload.categoryId = Number(bulkCatMain)
         if (bulkCatSub === "__clear__") payload.subCategoryId = null
         else if (bulkCatSub) payload.subCategoryId = Number(bulkCatSub)
      } else {
         if (!bulkCatMain) {
            alert("Lütfen eklenecek kategoriyi seçin.")
            return
         }
         payload.extraCategoryId = Number(bulkCatMain)
      }

      if (bulkStockThreshold) {
         payload.stockThreshold = Number(bulkStockThreshold)
      }

      if (Object.keys(payload).length === 0) {
         alert("Lütfen bir kategori veya alt kategori seçin.")
         return
      }
      void handleBulkAction("assign_categories", payload)
   }

   // Özet chip'ler
   const FILTER_CHIPS = [
      { key: "ALL", label: "Tümü" },
      { key: "ACTIVE", label: "Aktif" },
      { key: "PASSIVE", label: "Pasif" },
      { key: "LOW", label: "Az Stok" },
      { key: "OUT", label: "Tükendi" },
   ]

   return (
      <div className="space-y-5 pb-10">

         {/* ── HEADER ─────────────────────────────────────────────── */}
         <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
               <h1 className="text-[17px] font-medium text-zinc-800">Ürünler</h1>
               <p className="text-[12px] text-zinc-400">
                  {totalCount > 0 ? `${totalCount.toLocaleString("tr-TR")} ürün` : "Tüm ürünler"}
               </p>
            </div>
            <div className="flex items-center gap-2">
               <button
                  type="button"
                  onClick={() => {
                     setTrendyolMode(selected.size > 0 ? "selected" : "all")
                     setTrendyolCheckResult(null)
                     setTrendyolModalOpen(true)
                  }}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white
                             px-3.5 py-2 text-[12px] text-zinc-500 transition hover:bg-zinc-50"
               >
                  <FaFileExport className="h-3 w-3" />
                  Dışa Aktar
               </button>
               <Link
                  href="/admin/products/new"
                  className="flex items-center gap-2 rounded-lg bg-[#4f6f52] px-4 py-2 text-[12px]
                       font-medium text-white transition hover:bg-[#3d5a3f] active:scale-[.98]"
               >
                  <FaPlus className="h-2.5 w-2.5" /> Yeni Ürün
               </Link>
            </div>
         </div>

         {/* ── FİLTRE CHIP'LERİ ───────────────────────────────────── */}
         <div className="flex flex-wrap gap-2">
            {FILTER_CHIPS.map(chip => (
               <button
                  key={chip.key}
                  onClick={() => { setStockFilter(chip.key); setPage(1) }}
                  className={`rounded-lg px-3.5 py-2 text-[11.5px] transition border
              ${stockFilter === chip.key
                        ? "bg-white border-zinc-200 shadow-sm font-medium text-zinc-800"
                        : "bg-white/60 border-transparent text-zinc-400 hover:bg-white hover:border-zinc-200"}`}
               >
                  {chip.label}
               </button>
            ))}
         </div>

         {/* ── ARAMA + FİLTRE BARI ────────────────────────────────── */}
         <div className="flex flex-col gap-3 rounded-xl border border-zinc-100 bg-white p-4
                      sm:flex-row sm:items-center">
            <form onSubmit={handleSearch} className="relative flex-1">
               <FaSearch className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-300" />
               <input
                  type="text"
                  placeholder="Ürün adı, SKU veya barkod..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-9 w-full rounded-lg border border-zinc-100 bg-zinc-50 pl-9 pr-4 text-[12.5px]
                       text-zinc-800 outline-none transition focus:border-[#4f6f52] focus:bg-white"
               />
            </form>

            <div className="flex items-center gap-2">
               {/* Kategori filtresi */}
               {rootCategories.length > 0 && (
                  <select
                     value={categoryId}
                     onChange={e => { setCategoryId(e.target.value); setPage(1) }}
                     className="h-9 rounded-lg border border-zinc-100 bg-zinc-50 px-3 text-[12px]
                         text-zinc-700 outline-none transition focus:border-[#4f6f52] focus:bg-white cursor-pointer"
                  >
                     <option value="">Tüm Kategoriler</option>
                     {rootCategories.map((c) => (
                        <Fragment key={c.id}>
                           <option value={String(c.id)}>{c.name}</option>
                           {(c.children ?? []).map((ch) => (
                              <option key={ch.id} value={String(ch.id)}>
                                 {c.name} › {ch.name}
                              </option>
                           ))}
                        </Fragment>
                     ))}
                  </select>
               )}

               {/* Görünüm seçici */}
               <div className="flex items-center gap-0.5 rounded-lg border border-zinc-100 bg-zinc-50 p-0.5">
                  <button
                     onClick={() => setView("list")}
                     className={`flex h-7 w-7 items-center justify-center rounded-md transition
                ${view === "list" ? "bg-white shadow-sm text-zinc-700" : "text-zinc-400 hover:text-zinc-600"}`}
                  >
                     <FaList className="h-3 w-3" />
                  </button>
                  <button
                     onClick={() => setView("grid")}
                     className={`flex h-7 w-7 items-center justify-center rounded-md transition
                ${view === "grid" ? "bg-white shadow-sm text-zinc-700" : "text-zinc-400 hover:text-zinc-600"}`}
                  >
                     <FaThLarge className="h-3 w-3" />
                  </button>
               </div>
            </div>
         </div>

         {/* ── TOPLU İŞLEM BARI (Floating) ───────────────────────── */}
         <AnimatePresence>
            {selected.size > 0 && (
               <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  className="fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 flex-col overflow-hidden rounded-2xl bg-zinc-900 shadow-2xl"
               >
                  {bulkToolsOpen === "price" && (
                     <div className="flex flex-wrap items-end gap-2 border-b border-white/10 bg-zinc-800 px-4 py-3">
                        <div className="flex flex-col gap-1">
                           <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                              Fiyat ayarı
                           </span>
                           <select
                              value={priceMode}
                              onChange={(e) => setPriceMode(e.target.value as "percent" | "fixed")}
                              className="h-9 rounded-lg border border-white/10 bg-zinc-900 px-2 text-[11px] text-white"
                           >
                              <option value="percent">Yüzde (+% veya -%)</option>
                              <option value="fixed">Sabit (₺ ekle / çıkar)</option>
                           </select>
                        </div>
                        <div className="flex flex-col gap-1">
                           <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                              Tutar
                           </span>
                           <input
                              type="text"
                              inputMode="decimal"
                              placeholder={priceMode === "percent" ? "örn: 10 veya -5" : "örn: 50 veya -20"}
                              value={priceAmount}
                              onChange={(e) => setPriceAmount(e.target.value)}
                              className="h-9 w-28 rounded-lg border border-white/10 bg-zinc-900 px-2 text-[11px] text-white placeholder:text-zinc-500"
                           />
                        </div>
                        <button
                           type="button"
                           disabled={isBulkLoading}
                           onClick={() => void applyBulkPrice()}
                           className="flex h-9 items-center gap-1.5 rounded-lg bg-[#4f6f52] px-3 text-[11px] font-bold text-white disabled:opacity-50"
                        >
                           <FaPercent className="h-3 w-3" />
                           Uygula
                        </button>
                        <button
                           type="button"
                           onClick={() => setBulkToolsOpen(null)}
                           className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-white"
                        >
                           Kapat
                        </button>
                     </div>
                  )}

                  {bulkToolsOpen === "category" && (
                     <div className="flex flex-wrap items-end gap-2 border-b border-white/10 bg-zinc-800 px-4 py-3">
                         <div className="flex min-w-[100px] flex-col gap-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                               İşlem Türü
                            </span>
                            <select
                               value={bulkCatType}
                               onChange={(e) => setBulkCatType(e.target.value as "MAIN" | "EXTRA")}
                               className="h-9 rounded-lg border border-white/10 bg-zinc-900 px-2 text-[11px] text-white"
                            >
                               <option value="MAIN">Ana/Alt Kategori Değiştir</option>
                               <option value="EXTRA">Ek Kategori Olarak Ekle</option>
                            </select>
                         </div>
                         <div className="flex min-w-[140px] flex-col gap-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                               {bulkCatType === "MAIN" ? "Ana kategori" : "Eklenecek Kategori"}
                            </span>
                            <select
                               value={bulkCatMain}
                               onChange={(e) => {
                                  setBulkCatMain(e.target.value)
                                  setBulkCatSub("")
                               }}
                               className="h-9 max-w-[200px] rounded-lg border border-white/10 bg-zinc-900 px-2 text-[11px] text-white"
                            >
                               <option value="">— Seçiniz —</option>
                               {rootCategories.map((c) => (
                                  <option key={c.id} value={String(c.id)}>
                                     {c.name}
                                  </option>
                               ))}
                            </select>
                         </div>
                         {bulkCatType === "MAIN" && (
                            <div className="flex min-w-[160px] flex-col gap-1">
                               <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                                  Alt kategori
                               </span>
                               <select
                                  value={bulkCatSub}
                                  onChange={(e) => setBulkCatSub(e.target.value)}
                                  className="h-9 max-w-[220px] rounded-lg border border-white/10 bg-zinc-900 px-2 text-[11px] text-white"
                               >
                                  <option value="">— Değiştirme —</option>
                                  <option value="__clear__">— Alt kategoriyi temizle —</option>
                                  {subOptionsForBulk.map((ch) => (
                                     <option key={ch.id} value={String(ch.id)}>
                                        {ch.rootName} › {ch.name}
                                     </option>
                                  ))}
                               </select>
                            </div>
                         )}
                         <div className="flex min-w-[120px] flex-col gap-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                               Koşul (Opsiyonel)
                            </span>
                            <select
                               value={bulkStockThreshold}
                               onChange={(e) => setBulkStockThreshold(e.target.value)}
                               className="h-9 rounded-lg border border-white/10 bg-zinc-900 px-2 text-[11px] text-zinc-300"
                            >
                               <option value="">Tüm Seçililer</option>
                               <option value="2">Stok &lt; 2 Olanlar</option>
                               <option value="5">Stok &lt; 5 Olanlar</option>
                               <option value="10">Stok &lt; 10 Olanlar</option>
                               <option value="1">Sadece Tükenenler</option>
                            </select>
                         </div>
                        <button
                           type="button"
                           disabled={isBulkLoading}
                           onClick={() => void applyBulkCategories()}
                           className="flex h-9 items-center gap-1.5 rounded-lg bg-[#4f6f52] px-3 text-[11px] font-bold text-white disabled:opacity-50"
                        >
                           <FaTag className="h-3 w-3" />
                           Uygula
                        </button>
                        <button
                           type="button"
                           onClick={() => setBulkToolsOpen(null)}
                           className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-white"
                        >
                           Kapat
                        </button>
                     </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:gap-6">
                     <div className="flex items-center gap-3 border-white/10 sm:border-r sm:pr-6">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4f6f52] text-[11px] font-bold text-white">
                           {selected.size}
                        </span>
                        <span className="text-[12.5px] font-medium text-white">Seçili</span>
                     </div>

                     <div className="flex flex-wrap items-center gap-2">
                        <button
                           type="button"
                           disabled={isBulkLoading}
                           onClick={() => setBulkToolsOpen((o) => (o === "price" ? null : "price"))}
                           className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-[11.5px] font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                        >
                           <FaPercent className="h-3 w-3 text-amber-300" />
                           Fiyat
                        </button>
                        <button
                           type="button"
                           disabled={isBulkLoading}
                           onClick={() => setBulkToolsOpen((o) => (o === "category" ? null : "category"))}
                           className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-[11.5px] font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                        >
                           <FaTag className="h-3 w-3 text-sky-300" />
                           Kategori
                        </button>
                        <button
                           type="button"
                           disabled={isBulkLoading}
                           onClick={() => void handleBulkAction("auto_barcode", null)}
                           className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-[11.5px] font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                        >
                           <FaBarcode className="h-3 w-3 text-violet-400" />
                           Barkod Ata
                        </button>
                        <button
                           type="button"
                           disabled={isBulkLoading}
                           onClick={() => void handleBulkAction("status_update", "ACTIVE")}
                           className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-[11.5px] font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                        >
                           <FaToggleOn className="h-3.5 w-3.5 text-emerald-400" />
                           Aktif
                        </button>
                        <button
                           type="button"
                           disabled={isBulkLoading}
                           onClick={() => void handleBulkAction("status_update", "PASSIVE")}
                           className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-[11.5px] font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                        >
                           <FaToggleOff className="h-3.5 w-3.5 text-zinc-400" />
                           Pasif
                        </button>
                        <button
                           type="button"
                           disabled={isBulkLoading}
                           onClick={() => void handleBulkAction("tax_update", "10")}
                           className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-[11.5px] font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                        >
                           <span className="text-amber-400 font-bold">%10 KDV</span>
                        </button>
                        <button
                           type="button"
                           disabled={isBulkLoading}
                           onClick={() => {
                              const idsParam = Array.from(selected).join(",")
                              window.open(`/admin/products/print-barcodes?ids=${idsParam}`, "_blank")
                           }}
                           className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-[11.5px] font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                        >
                           <FaBarcode className="h-3.5 w-3.5 text-zinc-300" />
                           Barkod Bas
                        </button>
                        <button
                           type="button"
                           disabled={isBulkLoading}
                           onClick={() => {
                              setTrendyolMode("selected")
                              setTrendyolCheckResult(null)
                              setTrendyolModalOpen(true)
                           }}
                           className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-[11.5px] font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                        >
                           <FaFileExport className="h-3.5 w-3.5 text-emerald-300" />
                           Trendyol Excel
                        </button>
                        <button
                           type="button"
                           disabled={isBulkLoading}
                           onClick={() => void handleBulkAction("delete", null)}
                           className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-1.5 text-[11.5px] font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                        >
                           <FaTrash className="h-3 w-3" />
                           Sil
                        </button>
                     </div>

                     <button
                        type="button"
                        onClick={() => {
                           setSelected(new Set())
                           setBulkToolsOpen(null)
                        }}
                        className="ml-auto text-[11.5px] text-zinc-500 transition hover:text-white"
                     >
                        Vazgeç
                     </button>
                  </div>
               </motion.div>
            )}
         </AnimatePresence>

         {/* ── LİSTE GÖRÜNÜMÜ ─────────────────────────────────────── */}
         {view === "list" && (
            <div className="overflow-hidden rounded-xl border border-zinc-100 bg-white">
               <div className="overflow-x-auto">
                  <table className="w-full text-left" style={{ tableLayout: "fixed" }}>
                     <colgroup>
                        <col style={{ width: "36px" }} />
                        <col style={{ width: "300px" }} />
                        <col style={{ width: "130px" }} />
                        <col style={{ width: "110px" }} />
                        <col style={{ width: "110px" }} />
                        <col style={{ width: "110px" }} />
                        <col style={{ width: "80px" }} />
                        <col style={{ width: "80px" }} />
                     </colgroup>
                     <thead className="border-b border-zinc-100 bg-zinc-50/60">
                        {/* Sayfa Seçim Bilgi Barı */}
                        {products.length > 0 && 
                         products.every(p => selected.has(String(p.id))) && 
                         selected.size !== totalCount && totalCount > products.length && (
                           <tr>
                              <th colSpan={8} className="bg-[#4f6f52]/5 px-4 py-2.5 text-center text-[11.5px] font-normal text-zinc-600">
                                 Bu sayfadaki {products.length} ürünün tamamı seçildi. 
                                 <button 
                                    onClick={selectAllInDatabase}
                                    disabled={selectAllLoading}
                                    className="ml-2 font-bold text-[#4f6f52] underline hover:text-[#3d5a3f]"
                                 >
                                    {selectAllLoading ? "Seçiliyor..." : `Filtrelere uygun ${totalCount} ürünün tamamını seç`}
                                 </button>
                              </th>
                           </tr>
                        )}
                        <tr>
                           {/* Tümünü seç */}
                           <th className="px-4 py-3.5">
                              <input
                                 ref={headerCheckboxRef}
                                 type="checkbox"
                                 disabled={selectAllLoading || loading}
                                 checked={products.length > 0 && products.every(p => selected.has(String(p.id)))}
                                 onChange={toggleSelectAll}
                                 className="h-3.5 w-3.5 cursor-pointer accent-[#4f6f52] rounded disabled:opacity-40"
                              />
                           </th>
                           {[
                              { label: "Ürün", field: "name" as SortField },
                              { label: "Kategori", field: null },
                              { label: "Fiyat", field: "basePrice" as SortField },
                              { label: "Stok", field: "stock" as SortField },
                              { label: "Durum", field: null },
                              { label: "Tarih", field: "createdAt" as SortField },
                              { label: "", field: null },
                           ].map((col, i) => (
                              <th key={i}
                                 className="px-4 py-3.5 text-[10.5px] font-medium text-zinc-400">
                                 {col.field ? (
                                    <button
                                       onClick={() => toggleSort(col.field!)}
                                       className="flex items-center gap-1.5 hover:text-zinc-700 transition-colors"
                                    >
                                       {col.label}
                                       <SortIcon field={col.field} active={sortField} dir={sortDir} />
                                    </button>
                                 ) : col.label}
                              </th>
                           ))}
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-50">
                        <AnimatePresence initial={false}>
                           {loading ? (
                              <tr>
                                 <td colSpan={8} className="py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                       <div className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-200 border-t-[#4f6f52]" />
                                       <span className="text-[11px] text-zinc-400">Yükleniyor...</span>
                                    </div>
                                 </td>
                              </tr>
                           ) : products.length === 0 ? (
                              <tr>
                                 <td colSpan={8} className="py-20 text-center">
                                    <div className="flex flex-col items-center gap-3 text-zinc-200">
                                       <FaBox className="h-12 w-12" />
                                       <p className="text-[12px] text-zinc-400">
                                          {search ? `"${search}" için ürün bulunamadı` : "Henüz ürün bulunmuyor"}
                                       </p>
                                       <Link
                                          href="/admin/products/new"
                                          className="mt-1 rounded-lg bg-[#4f6f52] px-4 py-2 text-[12px] text-white transition hover:bg-[#3d5a3f]"
                                       >
                                          İlk Ürünü Ekle
                                       </Link>
                                    </div>
                                 </td>
                              </tr>
                           ) : products.map((product, i) => {
                              const total = totalStock(product)
                              const st = stockStatus(product)
                              const hasDiscount = product.salePrice && product.salePrice < product.basePrice
                              const isSelected = selected.has(String(product.id))

                              return (
                                 <motion.tr
                                    key={product.id}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.025 }}
                                    className={`group transition-colors ${isSelected ? "bg-[#4f6f52]/5" : "hover:bg-zinc-50/70"}`}
                                 >
                                    {/* Checkbox */}
                                    <td className="px-4 py-4">
                                       <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => toggleSelect(product.id)}
                                          className="h-3.5 w-3.5 cursor-pointer accent-[#4f6f52] rounded"
                                       />
                                    </td>

                                    {/* Ürün */}
                                    <td className="px-4 py-4">
                                       <div className="flex items-center gap-3 min-w-0">
                                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50">
                                             <Image
                                                src={product.images[0]?.url ?? "/logo.jpeg"}
                                                alt={product.name}
                                                fill
                                                className="object-cover"
                                             />
                                          </div>
                                          <div className="min-w-0">
                                             <Link
                                                href={editHref(product.id)}
                                                className="block truncate text-[12.5px] font-medium text-zinc-800
                                           hover:text-[#4f6f52] transition-colors"
                                             >
                                                {product.name}
                                             </Link>
                                             {product.sku && (
                                                <p className="font-mono text-[10.5px] text-zinc-400">
                                                   SKU: {product.sku}
                                                </p>
                                             )}
                                          </div>
                                       </div>
                                    </td>

                                    {/* Kategori */}
                                    <td className="px-4 py-4">
                                       {product.category ? (
                                          <span className="flex items-center gap-1.5 text-[12px] text-zinc-500">
                                             <FaTag className="h-2.5 w-2.5 text-zinc-300" />
                                             {product.category.name}
                                          </span>
                                       ) : (
                                          <span className="text-[12px] text-zinc-300">—</span>
                                       )}
                                    </td>

                                    {/* Fiyat */}
                                    <td className="px-4 py-4">
                                       <p className="text-[13px] font-medium text-zinc-800">
                                          ₺{Number(hasDiscount ? product.salePrice : product.basePrice)
                                             .toLocaleString("tr-TR")}
                                       </p>
                                       {hasDiscount && (
                                          <p className="text-[11px] text-zinc-400 line-through">
                                             ₺{Number(product.basePrice).toLocaleString("tr-TR")}
                                          </p>
                                       )}
                                    </td>

                                    {/* Stok */}
                                    <td className="px-4 py-4">
                                       <p className={`text-[13px] font-medium ${st === "out" ? "text-red-500"
                                          : st === "low" ? "text-amber-600"
                                             : "text-zinc-700"
                                          }`}>
                                          {total} adet
                                       </p>
                                       <p className="text-[10.5px] text-zinc-400">
                                          {product.variants.length} varyant
                                       </p>
                                    </td>

                                    {/* Durum */}
                                    <td className="px-4 py-4">
                                       <div className="flex flex-col gap-1.5">
                                          <span className={`inline-block w-fit rounded-[5px] px-2 py-0.5 text-[10.5px] font-medium
                              ${product.isActive
                                                ? "bg-emerald-50 text-emerald-700"
                                                : "bg-zinc-100 text-zinc-500"}`}>
                                             {product.isActive ? "Aktif" : "Pasif"}
                                          </span>
                                          <StockBadge product={product} />
                                       </div>
                                    </td>

                                    {/* Tarih */}
                                    <td className="px-4 py-4 text-[11.5px] text-zinc-400">
                                       {product.createdAt
                                          ? new Date(product.createdAt).toLocaleDateString("tr-TR", {
                                             day: "2-digit", month: "short", year: "numeric",
                                          })
                                          : "—"}
                                    </td>

                                    {/* Aksiyonlar */}
                                    <td className="px-4 py-4">
                                       <div className="flex items-center justify-end gap-1.5">
                                          <Link
                                             href={`/products/${product.slug}`}
                                             target="_blank"
                                             className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-100
                                         bg-white text-zinc-400 shadow-sm transition hover:border-zinc-300 hover:text-zinc-600"
                                          >
                                             <FaEye className="h-3 w-3" />
                                          </Link>
                                          <button
                                             type="button"
                                             onClick={() => window.open(`/admin/products/print-barcodes?ids=${product.id}`, "_blank")}
                                             className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-100
                                          bg-white text-zinc-400 shadow-sm transition
                                          hover:border-violet-400 hover:text-violet-600"
                                             title="Barkod Bas"
                                          >
                                             <FaBarcode className="h-3 w-3" />
                                          </button>
                                          {product.trendyolProductMainId ? (
                                             <div
                                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-100
                                             bg-emerald-50 text-emerald-500"
                                                title={`Trendyol'da zaten yayında (${product.trendyolProductMainId}) — içerik güncellemesi bu API üzerinden desteklenmiyor, stok/fiyat otomatik senkronize oluyor.`}
                                             >
                                                <FaCheckCircle className="h-3 w-3" />
                                             </div>
                                          ) : (
                                             <button
                                                type="button"
                                                disabled={sendingToTrendyolId === product.id}
                                                onClick={() => void handleSendToTrendyol(product.id)}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-100
                                             bg-white text-zinc-400 shadow-sm transition
                                             hover:border-orange-400 hover:text-orange-600 disabled:opacity-50"
                                                title="Trendyol'a Gönder/Güncelle"
                                             >
                                                <FaSync className={`h-3 w-3 ${sendingToTrendyolId === product.id ? "animate-spin" : ""}`} />
                                             </button>
                                          )}
                                          <Link
                                             href={editHref(product.id)}
                                             className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-100
                                         bg-white text-zinc-400 shadow-sm transition
                                         hover:border-[#4f6f52] hover:text-[#4f6f52]"
                                          >
                                             <FaEdit className="h-3 w-3" />
                                          </Link>
                                       </div>
                                    </td>
                                 </motion.tr>
                              )
                           })}
                        </AnimatePresence>
                     </tbody>
                  </table>
               </div>

               {/* ── PAGİNASYON ─────────────────────────────────────── */}
               <Pagination
                  page={page}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  pageSize={pageSize}
                  setPage={setPage}
                  setPageSize={setPageSize}
                  loading={loading}
               />
            </div>
         )}

         {/* ── GRİD GÖRÜNÜMÜ ──────────────────────────────────────── */}
         {view === "grid" && (
            <>
               {loading ? (
                  <div className="flex h-64 items-center justify-center">
                     <div className="flex flex-col items-center gap-3">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-200 border-t-[#4f6f52]" />
                        <span className="text-[11px] text-zinc-400">Yükleniyor...</span>
                     </div>
                  </div>
               ) : products.length === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-zinc-100 bg-white">
                     <FaBox className="h-10 w-10 text-zinc-200" />
                     <p className="text-[12px] text-zinc-400">Ürün bulunamadı</p>
                  </div>
               ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                     {products.map((product, i) => (
                        <ProductCard key={product.id} product={product} i={i} editHref={editHref} />
                     ))}
                  </div>
               )}

               {totalPages > 1 && (
                  <div className="overflow-hidden rounded-xl border border-zinc-100 bg-white">
                     <Pagination
                        page={page}
                        totalPages={totalPages}
                        totalCount={totalCount}
                        pageSize={pageSize}
                        setPage={setPage}
                        setPageSize={setPageSize}
                        loading={loading}
                     />
                  </div>
               )}
            </>
         )}

         {/* ── TRENDYOL EXCEL EXPORT MODAL ────────────────────────── */}
         <AnimatePresence>
            {trendyolModalOpen && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <motion.div
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     onClick={() => setTrendyolModalOpen(false)}
                     className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
                  />
                  <motion.div
                     initial={{ opacity: 0, scale: 0.95, y: 20 }}
                     animate={{ opacity: 1, scale: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.95, y: 20 }}
                     className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                  >
                     <h2 className="text-[15px] font-semibold text-zinc-800">Trendyol için Excel İndir</h2>
                     <p className="mt-1 text-[12px] text-zinc-400">
                        {trendyolMode === "selected"
                           ? `${selected.size} seçili ürün indirilecek.`
                           : "Tüm aktif ürünler indirilecek."}
                     </p>

                     {selected.size > 0 && (
                        <div className="mt-4 flex items-center gap-1 rounded-lg border border-zinc-100 bg-zinc-50 p-0.5 text-[11.5px]">
                           <button
                              type="button"
                              onClick={() => { setTrendyolMode("selected"); setTrendyolCheckResult(null) }}
                              className={`flex-1 rounded-md px-2 py-1.5 transition ${trendyolMode === "selected" ? "bg-white shadow-sm font-medium text-zinc-800" : "text-zinc-400"}`}
                           >
                              Seçili ({selected.size})
                           </button>
                           <button
                              type="button"
                              onClick={() => { setTrendyolMode("all"); setTrendyolCheckResult(null) }}
                              className={`flex-1 rounded-md px-2 py-1.5 transition ${trendyolMode === "all" ? "bg-white shadow-sm font-medium text-zinc-800" : "text-zinc-400"}`}
                           >
                              Tüm Ürünler
                           </button>
                        </div>
                     )}

                     <div className="mt-4 space-y-1">
                        <label className="text-[11px] font-medium text-zinc-500">
                           Komisyon Oranı (%)
                        </label>
                        <input
                           type="text"
                           inputMode="decimal"
                           placeholder="örn: 20"
                           value={trendyolCommission}
                           onChange={(e) => setTrendyolCommission(e.target.value)}
                           className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-[13px] outline-none focus:border-[#4f6f52]"
                        />
                        <p className="text-[11px] text-zinc-400">
                           Girilen oran kadar fiyatların üzerine eklenir (örn. %20 girilirse fiyatlar %20 artırılarak yazılır).
                        </p>
                     </div>

                     <div className="mt-4">
                        <button
                           type="button"
                           disabled={trendyolCheckLoading || (trendyolMode === "selected" && selected.size === 0)}
                           onClick={() => void handleTrendyolCheck()}
                           className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-[12px] font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
                        >
                           {trendyolCheckLoading ? "Kontrol ediliyor..." : "İndirmeden Önce Kontrol Et"}
                        </button>

                        {trendyolCheckResult && (
                           <div className="mt-3 max-h-52 overflow-y-auto rounded-lg border border-amber-100 bg-amber-50 p-3 text-[11.5px]">
                              {trendyolCheckResult.warningCount === 0 ? (
                                 <p className="font-medium text-emerald-700">
                                    ✓ {trendyolCheckResult.rowCount} satırın hepsi tam, eksik/varsayılan alan yok.
                                 </p>
                              ) : (
                                 <>
                                    <p className="mb-2 font-medium text-amber-800">
                                       {trendyolCheckResult.rowCount} satırdan {trendyolCheckResult.warningCount} tanesinde gerçek veri yerine varsayılan/tahmini değer kullanılacak:
                                    </p>
                                    <ul className="space-y-1.5">
                                       {trendyolCheckResult.items.slice(0, 30).map((item, i) => (
                                          <li key={i} className="text-amber-700">
                                             <span className="font-medium">{item.productName}</span>{" "}
                                             <span className="text-amber-500">({item.variantSku})</span> — {item.field}: {item.note}
                                          </li>
                                       ))}
                                       {trendyolCheckResult.items.length > 30 && (
                                          <li className="text-amber-600">
                                             ...ve {trendyolCheckResult.items.length - 30} tane daha
                                          </li>
                                       )}
                                    </ul>
                                 </>
                              )}
                           </div>
                        )}
                     </div>

                     <div className="mt-5 flex items-center justify-end gap-2">
                        <button
                           type="button"
                           onClick={() => setTrendyolModalOpen(false)}
                           className="rounded-lg px-3.5 py-2 text-[12px] text-zinc-400 hover:text-zinc-700"
                        >
                           Vazgeç
                        </button>
                        <button
                           type="button"
                           onClick={handleTrendyolExport}
                           className="flex items-center gap-2 rounded-lg bg-[#4f6f52] px-4 py-2 text-[12px] font-medium text-white transition hover:bg-[#3d5a3f]"
                        >
                           <FaFileExport className="h-3 w-3" />
                           İndir
                        </button>
                     </div>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>
      </div>
   )
}

// ── Pagination bileşeni ───────────────────────────────────────────────────────
function getPaginationModel(page: number, totalPages: number) {
   const tp = Math.max(1, Math.floor(totalPages))
   const p = Math.min(tp, Math.max(1, Math.floor(page)))

   const set = new Set<number>()
   ;[1, 2, tp - 1, tp, p - 2, p - 1, p, p + 1, p + 2].forEach((n) => {
      if (n >= 1 && n <= tp) set.add(n)
   })

   const nums = Array.from(set).sort((a, b) => a - b)
   const items: Array<number | "ellipsis"> = []
   let prev = 0
   for (const n of nums) {
      if (prev && n - prev > 1) items.push("ellipsis")
      items.push(n)
      prev = n
   }

   return { page: p, totalPages: tp, items }
}

function Pagination({
   page,
   totalPages,
   totalCount,
   pageSize,
   setPage,
   setPageSize,
   loading,
}: {
   page: number
   totalPages: number
   totalCount: number
   pageSize: number
   setPage: React.Dispatch<React.SetStateAction<number>>
   setPageSize: React.Dispatch<React.SetStateAction<number>>
   loading?: boolean
}) {
   const model = useMemo(() => getPaginationModel(page, totalPages), [page, totalPages])
   const safeTotal = Math.max(0, Math.floor(totalCount))
   const safeSize = Math.max(1, Math.floor(pageSize))
   const start = safeTotal === 0 ? 0 : (model.page - 1) * safeSize + 1
   const end = safeTotal === 0 ? 0 : Math.min(model.page * safeSize, safeTotal)

   return (
      <div className="flex flex-col gap-3 border-t border-zinc-100 bg-zinc-50/40 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
         <div className="flex flex-col gap-1">
            <span className="text-[11.5px] text-zinc-400">
               {safeTotal > 0 ? (
                  <>
                     <span className="font-medium text-zinc-600">{start.toLocaleString("tr-TR")}</span>-
                     <span className="font-medium text-zinc-600">{end.toLocaleString("tr-TR")}</span>{" "}
                     / {safeTotal.toLocaleString("tr-TR")} ürün
                  </>
               ) : (
                  <>0 ürün</>
               )}
               <span className="ml-2 text-zinc-300">· Sayfa {model.page} / {model.totalPages}</span>
            </span>

            <div className="flex flex-wrap items-center gap-2">
               <label className="flex items-center gap-2 text-[11.5px] text-zinc-400">
                  Göster
                  <select
                     value={safeSize}
                     disabled={loading}
                     onChange={(e) => {
                        const n = Number(e.target.value)
                        const next = Number.isFinite(n) && n > 0 ? Math.floor(n) : 24
                        setPageSize(next)
                        setPage(1)
                     }}
                     className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-[12px] text-zinc-700 disabled:opacity-50"
                  >
                     {[12, 24, 48, 96].map((n) => (
                        <option key={n} value={n}>
                           {n}
                        </option>
                     ))}
                  </select>
               </label>

               <label className="flex items-center gap-2 text-[11.5px] text-zinc-400">
                  Sayfaya git
                  <input
                     inputMode="numeric"
                     pattern="[0-9]*"
                     placeholder={String(model.page)}
                     disabled={loading || model.totalPages <= 1}
                     onKeyDown={(e) => {
                        if (e.key !== "Enter") return
                        const raw = (e.currentTarget.value ?? "").trim()
                        const n = Number(raw)
                        if (!Number.isFinite(n)) return
                        const next = Math.min(model.totalPages, Math.max(1, Math.floor(n)))
                        setPage(next)
                        e.currentTarget.value = ""
                     }}
                     className="h-8 w-20 rounded-lg border border-zinc-200 bg-white px-2 text-[12px] text-zinc-700 placeholder:text-zinc-300 disabled:opacity-50"
                  />
               </label>
            </div>
         </div>

         <div className="flex items-center gap-1.5">
            <button
               disabled={loading || model.page === 1}
               onClick={() => setPage(1)}
               className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white
                     text-zinc-400 transition hover:border-zinc-300 hover:text-zinc-700
                     disabled:cursor-not-allowed disabled:opacity-30"
            >
               <span className="text-[12px] font-semibold">1</span>
            </button>
            <button
               disabled={loading || model.page === 1}
               onClick={() => setPage((p) => Math.max(1, p - 1))}
               className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white
                     text-zinc-400 transition hover:border-zinc-300 hover:text-zinc-700
                     disabled:cursor-not-allowed disabled:opacity-30"
            >
               <FaChevronLeft className="h-2.5 w-2.5" />
            </button>

            {model.items.map((it, idx) => {
               if (it === "ellipsis") {
                  return (
                     <span
                        key={`e-${idx}`}
                        className="flex h-8 w-8 items-center justify-center text-[12px] text-zinc-300"
                     >
                        …
                     </span>
                  )
               }
               const p = it
               const active = model.page === p
               return (
                  <button
                     key={p}
                     disabled={loading}
                     onClick={() => setPage(p)}
                     className={`flex h-8 w-8 items-center justify-center rounded-lg text-[12px] transition disabled:opacity-50
                ${active
                           ? "bg-[#4f6f52] text-white font-medium"
                           : "border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300"}`}
                  >
                     {p}
                  </button>
               )
            })}
            <button
               disabled={loading || model.page === model.totalPages}
               onClick={() => setPage((p) => Math.min(model.totalPages, p + 1))}
               className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white
                     text-zinc-400 transition hover:border-zinc-300 hover:text-zinc-700
                     disabled:cursor-not-allowed disabled:opacity-30"
            >
               <FaChevronRight className="h-2.5 w-2.5" />
            </button>
            <button
               disabled={loading || model.page === model.totalPages}
               onClick={() => setPage(model.totalPages)}
               className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white
                     text-zinc-400 transition hover:border-zinc-300 hover:text-zinc-700
                     disabled:cursor-not-allowed disabled:opacity-30"
            >
               <span className="text-[12px] font-semibold">{model.totalPages}</span>
            </button>
         </div>
      </div>
   )
}