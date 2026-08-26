"use client"

import { useState, useEffect, useMemo, useCallback, startTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  HOME_TAB_KEYS,
  HOME_TAB_LABELS,
  parseHomeTabParam,
  isHomeTabKey,
  DEFAULT_HOME_TAB,
  type HomeTabKey,
} from "@/lib/adminHomepageTabs"
import { 
  FaImage, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaLayerGroup, 
  FaStar, 
  FaThLarge, 
  FaArrowUp, 
  FaArrowDown, 
  FaCheckCircle, 
  FaTimesCircle,
  FaLink,
  FaHeading,
  FaEye,
  FaEyeSlash,
  FaBullhorn,
  FaSearch,
  FaShoppingBag,
  FaCloudUploadAlt,
  FaList,
  FaTimes,
} from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

const SECTION_PICKER_PAGE_SIZE = 50

type Slider = {
  id: number
  title: string | null
  subtitle: string | null
  buttonText: string | null
  imageUrl: string
  linkUrl: string | null
  sortOrder: number
  isActive: boolean
}

type Banner = {
  id: number
  title: string | null
  imageUrl: string
  linkUrl: string | null
  position: string
  sortOrder: number
  isActive: boolean
}

type Category = {
  id: number
  name: string
  showOnHome: boolean
  sortOrder: number
  imageUrl: string | null
}

type Product = {
  id: number
  name: string
  isFeatured: boolean
  basePrice: string
  images: { url: string }[]
}

type HomeSection = {
  id: number
  title: string
  subtitle: string | null
  type: "CATEGORY" | "PRODUCT_LIST"
  categoryId: number | null
  productsJson: string | null
  sortOrder: number
  isActive: boolean
  category?: { name: string }
}

type HomepageEditItem = Slider | Banner | HomeSection

function formStr(v: unknown): string {
  if (v == null || v === false) return ""
  return String(v)
}

function formBool(v: unknown): boolean {
  return typeof v === "boolean" ? v : false
}

/** `productsJson` → sıralı id + görünen ad (ad bilinmiyorsa yedek metin). */
function parseSectionProductRows(productsJson: unknown): { id: number; name: string }[] {
  if (productsJson == null || productsJson === "") return []
  const s = typeof productsJson === "string" ? productsJson : null
  if (!s) return []
  try {
    const arr = JSON.parse(s) as unknown
    if (!Array.isArray(arr)) return []
    return arr
      .map((x) => (typeof x === "number" ? x : Number(x)))
      .filter((n) => Number.isFinite(n))
      .map((id) => ({ id, name: `Ürün #${id}` }))
  } catch {
    return []
  }
}

export function HomepageManagementClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = useMemo(
    () => parseHomeTabParam(searchParams.get("tab")),
    [searchParams]
  )

  useEffect(() => {
    const raw = searchParams.get("tab")
    if (raw != null && raw !== "" && !isHomeTabKey(raw)) {
      router.replace(`/admin/homepage?tab=${DEFAULT_HOME_TAB}`, { scroll: false })
    }
  }, [searchParams, router])
  const [sliders, setSliders] = useState<Slider[]>([])
  const [banners, setBanners] = useState<Banner[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [sections, setSections] = useState<HomeSection[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<HomepageEditItem | null>(null)
  const [form, setForm] = useState<Record<string, unknown>>({})
  const [uploading, setUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const [sectionPickerOpen, setSectionPickerOpen] = useState(false)
  const [sectionPickerSearch, setSectionPickerSearch] = useState("")
  const [sectionPickerDebounced, setSectionPickerDebounced] = useState("")
  const [sectionPickerPage, setSectionPickerPage] = useState(1)
  const [sectionPickerTotalPages, setSectionPickerTotalPages] = useState(1)
  const [sectionPickerTotal, setSectionPickerTotal] = useState(0)
  const [sectionPickerProducts, setSectionPickerProducts] = useState<Product[]>([])
  const [sectionPickerLoading, setSectionPickerLoading] = useState(false)
  /** Belirli ürünler bölümü için seçili ürünler (sıra anasayfadaki sırayı belirler). */
  const [sectionSelectedProducts, setSectionSelectedProducts] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedProductSearch(productSearch.trim())
    }, 300)

    return () => window.clearTimeout(timer)
  }, [productSearch])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSectionPickerDebounced(sectionPickerSearch.trim())
      setSectionPickerPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [sectionPickerSearch])

  useEffect(() => {
    if (!sectionPickerOpen) return
    let cancelled = false
    void (async () => {
      setSectionPickerLoading(true)
      try {
        const r = await fetch(
          `/api/admin/products?q=${encodeURIComponent(sectionPickerDebounced)}&page=${sectionPickerPage}&limit=${SECTION_PICKER_PAGE_SIZE}`
        )
        const data: {
          items?: Product[]
          total?: number
          totalPages?: number
          page?: number
        } = await r.json()
        const items = Array.isArray(data.items) ? data.items : []
        const total = typeof data.total === "number" ? data.total : items.length
        const totalPages = Math.max(
          1,
          typeof data.totalPages === "number"
            ? data.totalPages
            : Math.ceil(total / SECTION_PICKER_PAGE_SIZE) || 1
        )
        if (cancelled) return
        setSectionPickerTotal(total)
        setSectionPickerTotalPages(totalPages)
        setSectionPickerProducts(items)
        const byId = new Map(items.map((p) => [p.id, p.name]))
        setSectionSelectedProducts((prev) =>
          prev.map((row) => ({ id: row.id, name: byId.get(row.id) ?? row.name }))
        )
      } catch {
        if (!cancelled) setSectionPickerProducts([])
      } finally {
        if (!cancelled) setSectionPickerLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sectionPickerOpen, sectionPickerDebounced, sectionPickerPage])

  const fetchData = useCallback(async () => {
    const isProductsTab = activeTab === "products"
    setLoading(true)
    try {
      if (activeTab === "sliders") {
        const res = await fetch("/api/admin/homepage/sliders")
        const data = await res.json()
        setSliders(Array.isArray(data) ? data : [])
      } else if (activeTab === "banners") {
        const res = await fetch("/api/admin/homepage/banners")
        const data = await res.json()
        setBanners(Array.isArray(data) ? data : [])
      } else if (activeTab === "categories") {
        const res = await fetch("/api/admin/homepage/categories")
        const data = await res.json()
        setCategories(Array.isArray(data) ? data : [])
      } else if (activeTab === "products") {
        const res = await fetch(`/api/admin/products?q=${encodeURIComponent(debouncedProductSearch)}&limit=20`)
        const data = await res.json()
        setProducts(data.items || [])
        setLoading(false)
      } else if (activeTab === "sections") {
        const res = await fetch("/api/admin/homepage/sections")
        const data = await res.json()
        setSections(Array.isArray(data) ? data : [])
        // Kategorileri de çek (seçim için)
        const catRes = await fetch("/api/admin/homepage/categories")
        const catData = await catRes.json()
        setCategories(Array.isArray(catData) ? catData : [])
      }
    } catch (error) {
      console.error("Fetch error:", error)
    } finally {
      if (!isProductsTab) {
        setLoading(false)
      }
    }
  }, [activeTab, debouncedProductSearch])

  useEffect(() => {
    startTransition(() => {
      void fetchData()
    })
  }, [fetchData])

  const openModal = (item?: HomepageEditItem) => {
    setSectionPickerOpen(false)
    if (item) {
      setEditingItem(item)
      setForm({ ...item })
      if (activeTab === "sections" && "productsJson" in item) {
        setSectionSelectedProducts(parseSectionProductRows((item as HomeSection).productsJson))
      } else if (activeTab === "sections") {
        setSectionSelectedProducts([])
      }
    } else {
      setEditingItem(null)
      if (activeTab === "sliders") {
        // Kullanıcı sadece görsel istiyor, diğerlerini boş bırakıyoruz
        setForm({ title: "", subtitle: "", buttonText: "", imageUrl: "", linkUrl: "", sortOrder: 0, isActive: true })
      } else if (activeTab === "banners") {
        setForm({ title: "", imageUrl: "", linkUrl: "", position: "top-row", sortOrder: 0, isActive: true })
      } else if (activeTab === "sections") {
        setForm({ title: "", subtitle: "", type: "CATEGORY", categoryId: null, productsJson: null, sortOrder: 0, isActive: true })
        setSectionSelectedProducts([])
      }
    }
    setIsModalOpen(true)
  }

  const openSectionProductPicker = () => {
    setSectionPickerSearch("")
    setSectionPickerDebounced("")
    setSectionPickerPage(1)
    setSectionPickerOpen(true)
  }

  const toggleSectionPickerProduct = (p: Product) => {
    setSectionSelectedProducts((prev) => {
      const exists = prev.some((x) => x.id === p.id)
      if (exists) return prev.filter((x) => x.id !== p.id)
      return [...prev, { id: p.id, name: p.name }]
    })
  }

  const removeSectionSelectedProduct = (id: number) => {
    setSectionSelectedProducts((prev) => prev.filter((x) => x.id !== id))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    const reader = new FileReader()
    reader.onloadend = () => {
      setForm({ ...form, imageUrl: reader.result })
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSaving) return
    setIsSaving(true)
    
    // Temizlik: Slider için kullanıcı sadece görsel istiyorsa boş alanları gönderiyoruz
    const payload: Record<string, unknown> = { ...form }

    if (activeTab === "sections") {
      const t = formStr(form.type) || "CATEGORY"
      if (t === "PRODUCT_LIST") {
        payload.type = "PRODUCT_LIST"
        payload.categoryId = null
        payload.productsJson =
          sectionSelectedProducts.length > 0
            ? JSON.stringify(sectionSelectedProducts.map((p) => p.id))
            : null
      } else {
        payload.type = "CATEGORY"
        payload.productsJson = null
        const rawCat = form.categoryId
        const parsedCat =
          rawCat === "" || rawCat == null || rawCat === undefined
            ? NaN
            : parseInt(String(rawCat), 10)
        payload.categoryId = Number.isFinite(parsedCat) ? parsedCat : null
      }
    }
    
    const method = editingItem ? "PUT" : "POST"
    const url = activeTab === "sections" 
      ? (editingItem ? `/api/admin/homepage/sections/${editingItem.id}` : `/api/admin/homepage/sections`)
      : (editingItem ? `/api/admin/homepage/sliders/${editingItem.id}` : `/api/admin/homepage/sliders`) // default slider placeholder, will be overridden
    
    // URL override based on tab
    let finalUrl = url
    if (activeTab === "sliders") finalUrl = editingItem ? `/api/admin/homepage/sliders/${editingItem.id}` : `/api/admin/homepage/sliders`
    if (activeTab === "banners") finalUrl = editingItem ? `/api/admin/homepage/banners/${editingItem.id}` : `/api/admin/homepage/banners`
    if (activeTab === "sections") finalUrl = editingItem ? `/api/admin/homepage/sections/${editingItem.id}` : `/api/admin/homepage/sections`

    try {
      if (
        activeTab === "sections" &&
        (formStr(form.type) || "CATEGORY") === "PRODUCT_LIST" &&
        sectionSelectedProducts.length === 0
      ) {
        setToast({
          msg: "Belirli ürünler için en az bir ürün seçin (Ürünleri seç).",
          ok: false,
        })
        return
      }

      const res = await fetch(finalUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        setToast({ msg: "Başarıyla kaydedildi.", ok: true })
        setSectionPickerOpen(false)
        setIsModalOpen(false)
        fetchData()
        setTimeout(() => setToast(null), 3000)
      } else {
        const errData = await res.json()
        setToast({ msg: errData.message || "Hata oluştu.", ok: false })
      }
    } catch {
      setToast({ msg: "Bağlantı hatası.", ok: false })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Silmek istediğinize emin misiniz?")) return
    try {
      const url = activeTab === "sections" 
        ? `/api/admin/homepage/sections/${id}` 
        : `/api/admin/homepage/${activeTab}/${id}`
      const res = await fetch(url, { method: "DELETE" })
      if (res.ok) {
        setToast({ msg: "Silindi.", ok: true })
        fetchData()
        setTimeout(() => setToast(null), 3000)
      }
    } catch {
       setToast({ msg: "Hata", ok: false })
    }
  }

  const toggleCategory = async (cat: Category) => {
    try {
      const res = await fetch("/api/admin/homepage/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, showOnHome: !cat.showOnHome, sortOrder: cat.sortOrder })
      })
      if (res.ok) fetchData()
    } catch { /* ignore */ }
  }

  const toggleProductFeatured = async (product: Product) => {
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !product.isFeatured })
      })
      if (res.ok) fetchData()
    } catch { /* ignore */ }
  }

  const handleCategorySort = async (cat: Category, newOrder: number) => {
    try {
      const res = await fetch("/api/admin/homepage/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, showOnHome: cat.showOnHome, sortOrder: newOrder })
      })
      if (res.ok) fetchData()
    } catch { /* ignore */ }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto min-h-screen bg-[#fcfcfc] overflow-hidden">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-8 right-8 z-200 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 border-l-4
              ${toast.ok ? 'bg-emerald-50 text-emerald-800 border-emerald-500' : 'bg-rose-50 text-rose-800 border-rose-500'}`}
          >
            {toast.ok ? <FaCheckCircle className="text-emerald-500" /> : <FaTimesCircle className="text-rose-500" />}
            <span className="text-sm font-bold">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Area */}
      <div className="mb-6 md:mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-lg">
              <FaLayerGroup className="text-lg" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Yönetim Paneli</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tight">Anasayfa <span className="text-zinc-400">Tasarımı</span></h1>
        </div>

        {/* Stats Cards */}
        <div className="flex flex-wrap gap-3">
          <div className="bg-white border border-zinc-100 p-4 rounded-3xl shadow-sm flex items-center gap-4 min-w-[140px]">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500"><FaImage className="text-lg" /></div>
            <div>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Slider</p>
              <p className="text-xl font-black text-zinc-800 leading-none">{Array.isArray(sliders) ? sliders.filter(s => s.isActive).length : 0}</p>
            </div>
          </div>
          <div className="bg-white border border-zinc-100 p-4 rounded-3xl shadow-sm flex items-center gap-4 min-w-[140px]">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500"><FaBullhorn className="text-lg" /></div>
            <div>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Banner</p>
              <p className="text-xl font-black text-zinc-800 leading-none">{Array.isArray(banners) ? banners.filter(b => b.isActive).length : 0}</p>
            </div>
          </div>
          <div className="bg-white border border-zinc-100 p-4 rounded-3xl shadow-sm flex items-center gap-4 min-w-[140px]">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500"><FaShoppingBag className="text-lg" /></div>
            <div>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Ürün Bölümü</p>
              <p className="text-xl font-black text-zinc-800 leading-none">{Array.isArray(sections) ? sections.filter(s => s.isActive).length : 0}</p>
            </div>
          </div>
          <div className="bg-white border border-zinc-100 p-4 rounded-3xl shadow-sm flex items-center gap-4 min-w-[140px]">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500"><FaThLarge className="text-lg" /></div>
            <div>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Kategori</p>
              <p className="text-xl font-black text-zinc-800 leading-none">{Array.isArray(categories) ? categories.filter(c => c.showOnHome).length : 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-1 overflow-hidden">
        <div className="flex gap-1 overflow-hidden">
          {HOME_TAB_KEYS.map((tab: HomeTabKey) => (
            <button
              key={tab}
              type="button"
              onClick={() => router.replace(`/admin/homepage?tab=${tab}`, { scroll: false })}
              className={`relative px-4 py-3 text-[12px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                ${activeTab === tab ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"}`}
            >
              {HOME_TAB_LABELS[tab]}
              {activeTab === tab && (
                <motion.div layoutId="activeTab" className="absolute -bottom-px left-4 right-4 h-1 bg-zinc-900 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {activeTab !== "categories" && activeTab !== "products" && (
          <button
            onClick={() => openModal()}
            className="h-10 px-6 rounded-xl bg-zinc-900 text-white flex items-center gap-2 font-bold text-[12px] shadow-xl shadow-zinc-900/10 hover:bg-zinc-800 transition-all active:scale-95"
          >
            <FaPlus className="text-[10px]" /> YENİ EKLE
          </button>
        )}
      </div>

      {activeTab === "sections" && (
        <p className="mb-4 text-[12px] text-zinc-500 font-medium leading-relaxed max-w-3xl">
          Kategori veya seçili ürün listesiyle anasayfadaki ürün bloklarını oluşturun. Sıra numarası, vitrindeki görünüm sırasını belirler.
        </p>
      )}

      {/* Content Area */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 bg-white rounded-4xl border border-zinc-100 animate-pulse"></div>
            ))}
          </div>
        ) : activeTab === "sliders" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sliders.map((slider) => (
              <motion.div
                layout
                key={slider.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group bg-white border rounded-[2.5rem] p-4 transition-all duration-500 hover:shadow-xl
                  ${!slider.isActive ? 'border-dashed border-zinc-200 grayscale opacity-80' : 'border-zinc-100'}`}
              >
                <div className="relative aspect-21/9 rounded-4xl overflow-hidden bg-zinc-100">
                  <Image src={slider.imageUrl} alt={slider.title || ""} fill className="object-cover" />
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
                  
                  <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                    <div className="bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/20 shadow-lg flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${slider.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`}></div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-900">{slider.isActive ? 'YAYINDA' : 'PASİF'}</span>
                    </div>
                  </div>

                  <div className="absolute bottom-4 left-6 right-6 text-white">
                    <h3 className="text-lg font-black leading-tight drop-shadow-md line-clamp-1">{slider.title || "Görsel Slider"}</h3>
                    {slider.buttonText && (
                      <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-white text-zinc-900 rounded-full text-[9px] font-black uppercase tracking-widest">
                        {slider.buttonText}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <FaLink className="text-[10px]" />
                    <span className="text-[11px] font-bold line-clamp-1 max-w-[120px]">{slider.linkUrl || "Link Yok"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openModal(slider)} className="w-10 h-10 rounded-xl bg-zinc-50 text-zinc-500 flex items-center justify-center hover:bg-zinc-900 hover:text-white transition-all">
                      <FaEdit className="text-xs" />
                    </button>
                    <button onClick={() => handleDelete(slider.id)} className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all">
                      <FaTrash className="text-xs" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : activeTab === "banners" ? (
          <div className="space-y-6">
            <div className="rounded-3xl border border-zinc-200 bg-zinc-50/80 p-5 md:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Anasayfada banner sırası
              </p>
              <h3 className="mt-2 text-lg font-black text-zinc-900">Bannerlar nasıl görünür?</h3>
              <p className="mt-2 text-[13px] font-medium leading-relaxed text-zinc-600">
                Yalnızca <strong className="text-zinc-800">Yayında</strong> işaretli kayıtlar sitede listelenir.
                Aynı pozisyonda birden fazla banner eklediğinizde sıra, <strong className="text-zinc-800">Sıra</strong>{" "}
                alanına göre küçükten büyüğe uygulanır.
              </p>
              <ul className="mt-4 list-inside list-disc space-y-2 text-[13px] font-medium text-zinc-600">
                <li>
                  <strong className="text-zinc-800">Üst:</strong> Vitrin kategorileri bölümünden hemen sonra.
                </li>
                <li>
                  <strong className="text-zinc-800">Orta:</strong> &quot;Hakkımızda&quot; bölümünden sonra.
                </li>
                <li>
                  <strong className="text-zinc-800">Alt:</strong> Müşteri yorumlarından sonra, sıkça sorulan sorular
                  bölümünden önce.
                </li>
              </ul>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {banners.map((banner) => (
              <motion.div
                layout
                key={banner.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`group bg-white border rounded-[2.5rem] p-3 transition-all duration-500 hover:shadow-xl
                  ${!banner.isActive ? 'border-dashed border-zinc-200 grayscale opacity-80' : 'border-zinc-100'}`}
              >
                <div className="relative aspect-square rounded-4xl overflow-hidden bg-zinc-100 mb-4">
                  <Image src={banner.imageUrl} alt={banner.title || ""} fill className="object-cover" />
                  <div className="absolute top-3 left-3">
                    <span className="bg-zinc-900/80 text-white px-2.5 py-1 rounded-lg text-[8px] font-black border border-white/10 backdrop-blur-md uppercase tracking-widest">
                      {banner.position}
                    </span>
                  </div>
                </div>
                <div className="px-2">
                  <h3 className="text-[13px] font-black text-zinc-900 mb-4">{banner.title || "Adsız Banner"}</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openModal(banner)} className="flex-1 h-9 rounded-xl bg-zinc-50 text-zinc-500 font-bold text-[11px] flex items-center justify-center gap-2 hover:bg-zinc-900 hover:text-white transition-all">
                      <FaEdit /> Düzenle
                    </button>
                    <button onClick={() => handleDelete(banner.id)} className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all">
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          </div>
        ) : activeTab === "categories" ? (
          <div className="bg-white rounded-3xl border border-zinc-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Kategori</th>
                    <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-center">Durum</th>
                    <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-center">Sıra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 font-medium text-[12px]">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-zinc-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-zinc-100 overflow-hidden relative shadow-sm border border-zinc-100">
                            {cat.imageUrl ? <Image src={cat.imageUrl} alt={cat.name} fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-200"><FaThLarge /></div>}
                          </div>
                          <span className="font-black text-zinc-800">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => toggleCategory(cat)}
                          className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 mx-auto transition-all
                          ${cat.showOnHome ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-zinc-100 text-zinc-400 border border-zinc-200 grayscale'}`}
                        >
                          {cat.showOnHome ? <FaEye /> : <FaEyeSlash />}
                          {cat.showOnHome ? 'VİTRİNDE' : 'GİZLİ'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleCategorySort(cat, cat.sortOrder - 1)} className="w-8 h-8 rounded-lg bg-white border border-zinc-100 text-zinc-300 hover:text-zinc-900 transition-all flex items-center justify-center">
                            <FaArrowUp className="text-[9px]" />
                          </button>
                          <span className="w-6 font-black text-zinc-800 text-[13px]">{cat.sortOrder}</span>
                          <button onClick={() => handleCategorySort(cat, cat.sortOrder + 1)} className="w-8 h-8 rounded-lg bg-white border border-zinc-100 text-zinc-300 hover:text-zinc-900 transition-all flex items-center justify-center">
                            <FaArrowDown className="text-[9px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === "sections" ? (
          <div className="grid grid-cols-1 gap-4">
            {sections.map((section) => (
              <motion.div
                layout
                key={section.id}
                className="bg-white border border-zinc-100 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-xl transition-all"
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-purple-50 text-purple-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-purple-100">
                      {section.type === "CATEGORY" ? "Kategori Bazlı" : "Seçili Ürünler"}
                    </span>
                    {!section.isActive && <span className="bg-zinc-100 text-zinc-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-zinc-200">TASLAK</span>}
                  </div>
                  <h3 className="text-xl font-black text-zinc-900">{section.title}</h3>
                  {section.type === "CATEGORY" && section.category && (
                    <p className="text-[12px] font-bold text-zinc-400 mt-1">Kategori: <span className="text-zinc-600">{section.category.name}</span></p>
                  )}
                  {section.subtitle && <p className="text-[12px] text-zinc-400 mt-1">{section.subtitle}</p>}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Sıra</span>
                    <span className="text-lg font-black text-zinc-900">{section.sortOrder}</span>
                  </div>
                  <div className="h-10 w-px bg-zinc-100 mx-2 hidden md:block" />
                  <div className="flex items-center gap-2">
                    <button onClick={() => openModal(section)} className="w-10 h-10 rounded-xl bg-zinc-50 text-zinc-500 flex items-center justify-center hover:bg-zinc-900 hover:text-white transition-all">
                      <FaEdit className="text-xs" />
                    </button>
                    <button onClick={() => handleDelete(section.id)} className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all">
                      <FaTrash className="text-xs" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
            {sections.length === 0 && (
              <div className="h-64 rounded-3xl border-2 border-dashed border-zinc-100 flex flex-col items-center justify-center gap-4 text-zinc-300">
                <FaShoppingBag className="text-4xl" />
                <p className="font-bold text-[13px]">Henüz ürün bölümü eklenmemiş.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 text-xl shrink-0"><FaStar /></div>
              <p className="text-amber-800/80 text-[12px] font-bold leading-tight">Yıldızladığınız ürünler anasayfa vitrininde görünür.</p>
            </div>

            <div className="relative max-w-md">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-xs" />
              <input 
                type="text" 
                placeholder="Ürün ara..." 
                className="w-full h-10 pl-11 pr-4 bg-white border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 text-[13px] font-medium transition-all"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {products.map((product) => (
                <motion.div
                  layout
                  key={product.id}
                  className={`bg-white border rounded-4xl p-2 transition-all
                    ${product.isFeatured ? 'border-amber-200 shadow-lg shadow-amber-500/5' : 'border-zinc-100'}`}
                >
                  <div className="relative aspect-square rounded-3xl overflow-hidden bg-zinc-100 mb-3">
                    {product.images?.[0]?.url ? (
                      <Image src={product.images[0].url} alt={product.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-200"><FaShoppingBag /></div>
                    )}
                    <button 
                      onClick={() => toggleProductFeatured(product)}
                      className={`absolute top-2 right-2 w-8 h-8 rounded-lg flex items-center justify-center transition-all backdrop-blur-md
                        ${product.isFeatured ? 'bg-amber-500 text-white' : 'bg-white/80 text-zinc-300 hover:text-amber-500'}`}
                    >
                      <FaStar className="text-[10px]" />
                    </button>
                  </div>
                  <h5 className="font-black text-zinc-800 text-[11px] px-1 line-clamp-1">{product.name}</h5>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-150 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSectionPickerOpen(false)
                setIsModalOpen(false)
              }}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <form onSubmit={handleSubmit} className="p-6 md:p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
                    {editingItem ? 'Düzenle' : 'Yeni Ekle'}
                  </h2>
                  <p className="text-zinc-400 text-[12px] font-bold mt-1">Gerekli alanları doldurun.</p>
                </div>

                <div className="space-y-5">
                  {/* Image Upload / URL Area (Only for sliders and banners) */}
                  {(activeTab === "sliders" || activeTab === "banners") && (
                    <div>
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-1 block mb-2">Görsel</label>
                      <div className="space-y-3">
                        <div className="relative group">
                          <div className={`aspect-16/6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 cursor-pointer overflow-hidden
                            ${form.imageUrl ? 'border-emerald-200 bg-emerald-50/10' : 'border-zinc-100 bg-zinc-50/50 hover:bg-zinc-50 hover:border-zinc-300'}`}
                          >
                            {form.imageUrl ? (
                              <Image src={formStr(form.imageUrl)} alt="Preview" fill className="object-cover" />
                            ) : (
                              <>
                                <FaCloudUploadAlt className="text-3xl text-zinc-300" />
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Görsel Seç</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={handleFileUpload}
                              disabled={uploading || isSaving}
                            />
                            {uploading && (
                              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                                <div className="w-8 h-8 border-3 border-zinc-100 border-t-zinc-900 rounded-full animate-spin"></div>
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Yükleniyor...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "sections" && (
                    <div className="space-y-5">
                      <div>
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-1 block mb-2">Bölüm Başlığı</label>
                        <div className="relative group">
                          <FaHeading className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" />
                          <input
                            type="text"
                            className="w-full h-11 pl-11 pr-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 text-[12px] font-bold"
                            value={formStr(form.title)}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="Örn: Erkek Çocuk Ürünleri"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-1 block mb-2">Alt Başlık (Opsiyonel)</label>
                        <input
                          type="text"
                          className="w-full h-11 px-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 text-[12px] font-bold"
                          value={formStr(form.subtitle)}
                          onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                          placeholder="Örn: En yeni ve en şık modeller"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-1 block mb-2">Bölüm Tipi</label>
                          <select
                            className="w-full h-11 px-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 text-[12px] font-black appearance-none cursor-pointer"
                            value={formStr(form.type) || "CATEGORY"}
                            onChange={(e) => {
                              const v = e.target.value
                              if (v === "PRODUCT_LIST") {
                                setForm({ ...form, type: v, categoryId: "", productsJson: null })
                                setSectionSelectedProducts([])
                              } else {
                                setForm({ ...form, type: v, productsJson: null })
                                setSectionSelectedProducts([])
                              }
                            }}
                          >
                            <option value="CATEGORY">Kategori Bazlı</option>
                            <option value="PRODUCT_LIST">Belirli Ürünler</option>
                          </select>
                        </div>

                        {(formStr(form.type) || "CATEGORY") === "CATEGORY" && (
                          <div>
                            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-1 block mb-2">Kategori Seç</label>
                            <select
                              className="w-full h-11 px-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 text-[12px] font-black appearance-none cursor-pointer"
                              value={formStr(form.categoryId)}
                              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                            >
                              <option value="">Seçiniz...</option>
                              {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {(formStr(form.type) || "CATEGORY") === "PRODUCT_LIST" && (
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 space-y-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-[12px] font-black text-zinc-800">
                                {sectionSelectedProducts.length} ürün seçili
                              </p>
                              {sectionSelectedProducts.length > 0 && (
                                <p className="mt-1 text-[10px] font-medium text-zinc-500 line-clamp-2">
                                  {sectionSelectedProducts.map((p) => p.name).join(", ")}
                                </p>
                              )}
                              {sectionSelectedProducts.length === 0 && (
                                <p className="mt-1 text-[10px] font-medium text-amber-700">
                                  Anasayfada göstermek için en az bir ürün seçin.
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={openSectionProductPicker}
                              className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-zinc-800"
                            >
                              <FaList className="text-xs" />
                              Ürünleri seç
                            </button>
                          </div>
                          {sectionSelectedProducts.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {sectionSelectedProducts.map((p) => (
                                <span
                                  key={p.id}
                                  className="inline-flex max-w-full items-center gap-1 rounded-lg border border-zinc-200 bg-white py-1 pl-2 pr-1 text-[10px] font-bold text-zinc-700"
                                >
                                  <span className="truncate">{p.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeSectionSelectedProduct(p.id)}
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600"
                                    aria-label="Kaldır"
                                  >
                                    <FaTimes className="text-[9px]" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sadece banner için başlık göster, slider için kullanıcı istemiyor */}
                    {activeTab === "banners" && (
                      <div className="md:col-span-2">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-1 block mb-2">Başlık</label>
                        <div className="relative group">
                          <FaHeading className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" />
                          <input
                            type="text"
                            className="w-full h-11 pl-11 pr-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 text-[12px] font-bold"
                            value={formStr(form.title)}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                    
                    {activeTab === "banners" && (
                      <div>
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-1 block mb-2">Pozisyon</label>
                        <select
                          className="w-full h-11 px-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 text-[12px] font-black appearance-none cursor-pointer"
                          value={formStr(form.position) || "top-row"}
                          onChange={(e) => setForm({ ...form, position: e.target.value })}
                        >
                          <option value="top-row">Üst</option>
                          <option value="middle-row">Orta</option>
                          <option value="bottom-row">Alt</option>
                        </select>
                      </div>
                    )}

                    <div className={activeTab === 'sliders' ? 'md:col-span-2' : ''}>
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-1 block mb-2">Yönlendirme Linki</label>
                      <div className="relative group">
                        <FaLink className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" />
                        <input
                          type="text"
                          className="w-full h-11 pl-11 pr-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 text-[12px] font-bold"
                          value={formStr(form.linkUrl)}
                          onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                          placeholder="/products/..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-1 block mb-2">Sıralama</label>
                      <input
                        type="number"
                        className="w-full h-11 px-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 text-[12px] font-bold"
                        value={formStr(form.sortOrder) || "0"}
                        onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                      />
                    </div>

                    <div className="flex items-center gap-4 pt-6">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={formBool(form.isActive)}
                          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                        />
                        <div className={`w-11 h-6 rounded-full relative transition-all duration-300 ${formBool(form.isActive) ? 'bg-emerald-500' : 'bg-zinc-200'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${formBool(form.isActive) ? 'left-6' : 'left-1'}`}></div>
                        </div>
                        <span className="text-[12px] font-black text-zinc-800">Yayında</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSectionPickerOpen(false)
                      setIsModalOpen(false)
                    }}
                    className="flex-1 h-12 rounded-xl border border-zinc-100 text-zinc-400 font-black uppercase text-[10px] tracking-widest hover:bg-zinc-50 transition-all"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || uploading}
                    className={`flex-2 h-12 rounded-xl bg-zinc-900 text-white font-black uppercase text-[10px] tracking-widest shadow-xl transition-all flex items-center justify-center gap-2
                      ${(isSaving || uploading) ? 'opacity-70 cursor-not-allowed' : 'hover:bg-zinc-800 active:scale-95'}`}
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        <span>Kaydediliyor...</span>
                      </>
                    ) : (
                      'Kaydet'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sectionPickerOpen && activeTab === "sections" && (
          <div className="fixed inset-0 z-220 flex flex-col">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSectionPickerOpen(false)}
              className="absolute inset-0 bg-zinc-950/50 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 flex h-full min-h-0 w-full flex-col overflow-hidden bg-white shadow-2xl"
            >
              <div className="shrink-0 border-b border-zinc-100 px-4 py-3 sm:px-6 sm:py-4">
                <h3 className="text-lg font-black text-zinc-900">Ürünleri seç</h3>
                <p className="mt-1 text-[11px] font-medium text-zinc-500">
                  Listeden tıklayarak ekleyin veya çıkarın. Sıra, anasayfadaki görünüm sırasını belirler.
                  {sectionPickerTotal > 0 && (
                    <span className="ml-1 font-bold text-zinc-600">
                      Toplam {sectionPickerTotal} ürün
                      {sectionPickerDebounced ? " (filtreli)" : ""}.
                    </span>
                  )}
                </p>
                <div className="relative mt-3">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs" />
                  <input
                    type="text"
                    placeholder="Ürün ara..."
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-[13px] font-medium outline-none focus:border-zinc-900"
                    value={sectionPickerSearch}
                    onChange={(e) => setSectionPickerSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6">
                {sectionPickerLoading ? (
                  <p className="py-8 text-center text-[12px] text-zinc-400">Yükleniyor…</p>
                ) : sectionPickerProducts.length === 0 ? (
                  <p className="py-8 text-center text-[12px] text-zinc-400">Sonuç yok.</p>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {sectionPickerProducts.map((p) => {
                      const selected = sectionSelectedProducts.some((x) => x.id === p.id)
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => toggleSectionPickerProduct(p)}
                            className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                              selected
                                ? "border-emerald-300 bg-emerald-50/60"
                                : "border-zinc-100 bg-white hover:border-zinc-200"
                            }`}
                          >
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                              {p.images?.[0]?.url ? (
                                <Image src={p.images[0].url} alt="" fill className="object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-zinc-300">
                                  <FaShoppingBag className="text-sm" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12px] font-bold text-zinc-900">{p.name}</p>
                              <p className="text-[10px] font-medium text-zinc-400">#{p.id}</p>
                            </div>
                            {selected ? (
                              <FaCheckCircle className="shrink-0 text-emerald-600" />
                            ) : (
                              <span className="h-5 w-5 shrink-0 rounded-full border border-zinc-200" />
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
              {!sectionPickerLoading && sectionPickerTotalPages > 1 && (
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-zinc-100 px-4 py-2 sm:px-6">
                  <p className="text-[11px] font-bold text-zinc-500">
                    Sayfa {sectionPickerPage} / {sectionPickerTotalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={sectionPickerPage <= 1}
                      onClick={() => setSectionPickerPage((p) => Math.max(1, p - 1))}
                      className="h-9 rounded-xl border border-zinc-200 px-3 text-[10px] font-black uppercase tracking-widest text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Önceki
                    </button>
                    <button
                      type="button"
                      disabled={sectionPickerPage >= sectionPickerTotalPages}
                      onClick={() =>
                        setSectionPickerPage((p) => Math.min(sectionPickerTotalPages, p + 1))
                      }
                      className="h-9 rounded-xl border border-zinc-200 px-3 text-[10px] font-black uppercase tracking-widest text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
              )}
              <div className="flex shrink-0 gap-2 border-t border-zinc-100 px-4 py-3 sm:px-6">
                <button
                  type="button"
                  onClick={() => setSectionPickerOpen(false)}
                  className="flex-1 h-11 rounded-xl border border-zinc-200 text-[10px] font-black uppercase tracking-widest text-zinc-500 transition hover:bg-zinc-50"
                >
                  Kapat
                </button>
                <button
                  type="button"
                  onClick={() => setSectionPickerOpen(false)}
                  className="flex-2 h-11 rounded-xl bg-zinc-900 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-zinc-800"
                >
                  Tamam ({sectionSelectedProducts.length})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
