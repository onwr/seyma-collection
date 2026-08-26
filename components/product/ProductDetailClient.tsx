"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  FaChevronDown,
  FaHeart,
  FaMinus,
  FaPhoneAlt,
  FaPlus,
  FaRegStar,
  FaStar,
} from "react-icons/fa"
import { dispatchCartUpdated } from "@/lib/cartEvents"
import type { ProductDetailViewModel } from "@/lib/productDetailShape"
import { registerHrefWithCallbackUrl } from "@/lib/safeCallbackUrl"
import { ProductImageZoom } from "./ProductImageZoom"
import { HomeProductsSection } from "../home/HomeProductsSection"

type PhoneOrderSettings = {
  whatsappNumber: string
  callNumber: string
}

type Props = {
  product: ProductDetailViewModel
}

export function ProductDetailClient({ product }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedVariantId, setSelectedVariantId] = useState<number>(
    product.variants[0]?.id ?? 0
  )
  const [quantity, setQuantity] = useState(1)
  const [openAccordion, setOpenAccordion] = useState<"" | "features" | "comments" | "payment">(
    product.accordions[0]?.id ?? "features"
  )
  const [cartFeedback, setCartFeedback] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [phonePopupOpen, setPhonePopupOpen] = useState(false)
  const [phoneSettings, setPhoneSettings] = useState<PhoneOrderSettings>({
    whatsappNumber: "",
    callNumber: "",
  })
  const [phoneSettingsLoading, setPhoneSettingsLoading] = useState(false)

  const selectedImage = product.images[selectedImageIndex] ?? product.images[0]
  const selectedVariant = useMemo(
    () => product.variants.find((item) => item.id === selectedVariantId) ?? product.variants[0],
    [product.variants, selectedVariantId]
  )

  const ratingStars = Array.from({ length: 5 }, (_, i) => i < product.rating)

  useEffect(() => {
    if (!phonePopupOpen) return
    if (phoneSettings.whatsappNumber || phoneSettings.callNumber) return
    let cancelled = false
    setPhoneSettingsLoading(true)
    fetch("/api/phone-order")
      .then((r) => r.json())
      .then((d: Partial<PhoneOrderSettings>) => {
        if (cancelled) return
        setPhoneSettings({
          whatsappNumber: typeof d.whatsappNumber === "string" ? d.whatsappNumber : "",
          callNumber: typeof d.callNumber === "string" ? d.callNumber : "",
        })
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPhoneSettingsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [phonePopupOpen, phoneSettings.whatsappNumber, phoneSettings.callNumber])

  const whatsappHref = useMemo(() => {
    if (!phoneSettings.whatsappNumber) return ""
    const message = encodeURIComponent(
      `Merhaba, bu ürünü sipariş vermek istiyorum:\n${product.title}\n${window.location.href}`
    )
    return `https://wa.me/${phoneSettings.whatsappNumber}?text=${message}`
  }, [phoneSettings.whatsappNumber, product.title])

  const callHref = useMemo(() => {
    const raw = phoneSettings.callNumber.trim()
    if (!raw) return ""
    const href = raw.startsWith("+") ? `tel:${raw}` : `tel:+${raw}`
    return href
  }, [phoneSettings.callNumber])

  const handleAddToCart = async () => {
    if (!selectedVariant) {
      setCartFeedback("Sepete eklemek için bir varyant seçmelisiniz.")
      return
    }

    setIsAdding(true)
    setCartFeedback(null)
    try {
      const response = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          productId: product.productId,
          variantId: selectedVariant.id,
          quantity,
        }),
      })
      const json = (await response.json()) as { message?: string }
      if (response.status === 401) {
        router.push(registerHrefWithCallbackUrl(pathname))
        setCartFeedback("Sepete eklemek için üye olmanız veya giriş yapmanız gerekir.")
        return
      }
      if (!response.ok) {
        throw new Error(json.message ?? "Ürün sepete eklenemedi.")
      }
      setCartFeedback("Ürün sepete eklendi.")
      dispatchCartUpdated()
    } catch (error) {
      setCartFeedback(
        error instanceof Error ? error.message : "Ürün sepete eklenemedi."
      )
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10">
      <section>
        <div className="flex gap-3">
          <div className="hidden w-16 shrink-0 space-y-2 sm:block">
            {product.images.map((image, index) => (
              <button
                key={image.src}
                type="button"
                onClick={() => setSelectedImageIndex(index)}
                className={`overflow-hidden rounded-lg border transition ${index === selectedImageIndex
                    ? "border-[#6f8f73]"
                    : "border-zinc-200 hover:border-zinc-300"
                  }`}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={64}
                  height={80}
                  className="h-20 w-16 object-cover"
                />
              </button>
            ))}
          </div>

          <div className="w-full">
            <ProductImageZoom
              images={product.images}
              currentIndex={selectedImageIndex}
            />
          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto sm:hidden">
          {product.images.map((image, index) => (
            <button
              key={`${image.src}-mobile`}
              type="button"
              onClick={() => setSelectedImageIndex(index)}
              className={`overflow-hidden rounded-md border transition ${index === selectedImageIndex
                  ? "border-[#6f8f73]"
                  : "border-zinc-200"
                }`}
            >
              <Image src={image.src} alt={image.alt} width={64} height={80} className="h-16 w-14 object-cover" />
            </button>
          ))}
        </div>
      </section>

      <section>
        <h1 className="text-2xl font-semibold leading-tight text-zinc-900 md:text-3xl">{product.title}</h1>

        {product.extraCategories?.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {product.extraCategories.map((c) => (
              <Link
                key={c.slug}
                href={`/categories/${c.slug}`}
                className="rounded-full bg-zinc-100 px-3 py-1 text-[12px] font-medium text-zinc-700 transition hover:bg-zinc-200"
              >
                {c.name}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex items-center gap-1 text-[#6f8f73]">
          {ratingStars.map((active, idx) =>
            active ? <FaStar key={idx} className="h-4 w-4" /> : <FaRegStar key={idx} className="h-4 w-4" />
          )}
          <span className="ml-2 text-sm text-zinc-500">({product.reviewCount})</span>
        </div>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-b border-zinc-200 pb-5">
          <div className="flex flex-col gap-1">
            {(selectedVariant?.compareAtPriceText || product.compareAtPriceText) && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400 line-through">
                  {selectedVariant?.compareAtPriceText ?? product.compareAtPriceText}
                </span>
                {(selectedVariant?.discountPct || product.discountPct) && (
                  <span className="rounded-full bg-[#6f8f73] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                    %{selectedVariant?.discountPct ?? product.discountPct} İndirim
                  </span>
                )}
              </div>
            )}
            <strong className="text-3xl font-semibold text-zinc-900">
              {selectedVariant?.priceText ?? product.priceText}
            </strong>
          </div>
          <div className="text-sm text-zinc-500">
            <p className="font-medium text-zinc-700">Kredi Kartı</p>
            <p>{product.installmentsLabel}</p>
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="size" className="mb-2 block text-sm font-semibold text-zinc-800">
            Beden
          </label>
          <select
            id="size"
            value={selectedVariant?.id ?? 0}
            onChange={(e) => setSelectedVariantId(Number(e.target.value))}
            className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none transition focus:border-[#6f8f73]"
          >
            {product.variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.label}
              </option>
            ))}
          </select>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600">
              SKU: {selectedVariant?.sku ?? "-"}
            </span>
            <span className="rounded-full bg-[#eef4ef] px-2.5 py-1 text-[#4d6951]">
              {selectedVariant?.stockText ?? "Stok bilgisi yok"}
            </span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_auto]">
          <div className="flex h-11 items-center rounded-lg border border-zinc-300">
            <button
              type="button"
              onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
              className="flex h-full w-10 items-center justify-center text-zinc-600 transition hover:bg-zinc-100"
            >
              <FaMinus className="h-3 w-3" />
            </button>
            <span className="w-9 text-center text-sm font-medium">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((prev) => prev + 1)}
              className="flex h-full w-10 items-center justify-center text-zinc-600 transition hover:bg-zinc-100"
            >
              <FaPlus className="h-3 w-3" />
            </button>
          </div>

          <button
            type="button"
            disabled={isAdding}
            onClick={() => void handleAddToCart()}
            className="h-11 rounded-lg bg-[#6f8f73] px-6 text-sm font-semibold tracking-wide text-white transition hover:bg-[#5f7f64]"
          >
            {isAdding ? "Ekleniyor..." : "Sepete Ekle"}
          </button>

          <button
            type="button"
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900"
          >
            <FaHeart className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setPhonePopupOpen(true)}
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#bcd2bf] bg-[#eef4ef] px-5 text-sm font-semibold text-[#4d6951] transition hover:bg-[#e1ede3]"
        >
          <FaPhoneAlt className="h-3.5 w-3.5" />
          {product.phoneOrderLabel || "Telefonla / WhatsApp'tan Sipariş Ver"}
        </button>

        {phonePopupOpen ? (
          <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
            <button
              type="button"
              onClick={() => setPhonePopupOpen(false)}
              className="absolute inset-0 bg-black/50"
              aria-label="Kapat"
            />
            <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[13px] font-black text-zinc-900">Telefonla Sipariş</p>
                  <p className="mt-1 text-[12px] text-zinc-500">
                    WhatsApp’tan yazabilir veya doğrudan arayabilirsiniz.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPhonePopupOpen(false)}
                  className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:text-zinc-700"
                >
                  Kapat
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2">
                <a
                  href={whatsappHref || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!whatsappHref || phoneSettingsLoading}
                  className={`flex h-11 items-center justify-center rounded-xl border px-4 text-[13px] font-bold transition
                    ${whatsappHref && !phoneSettingsLoading
                      ? "border-[#bcd2bf] bg-[#eef4ef] text-[#4d6951] hover:bg-[#e1ede3]"
                      : "border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed"}`}
                  onClick={(e) => {
                    if (!whatsappHref || phoneSettingsLoading) e.preventDefault()
                  }}
                >
                  {phoneSettingsLoading ? "Yükleniyor…" : "WhatsApp’tan Yaz"}
                </a>

                <a
                  href={callHref || "#"}
                  aria-disabled={!callHref || phoneSettingsLoading}
                  className={`flex h-11 items-center justify-center rounded-xl border px-4 text-[13px] font-bold transition
                    ${callHref && !phoneSettingsLoading
                      ? "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                      : "border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed"}`}
                  onClick={(e) => {
                    if (!callHref || phoneSettingsLoading) e.preventDefault()
                  }}
                >
                  Ara
                </a>
              </div>
            </div>
          </div>
        ) : null}

        {cartFeedback ? (
          <p className={`mt-2 text-sm ${cartFeedback.includes("eklendi") ? "text-emerald-700" : "text-rose-600"}`}>
            {cartFeedback}
          </p>
        ) : null}

        <div className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200">
          {product.accordions.map((item) => {
            const isOpen = openAccordion === item.id
            return (
              <div key={item.id}>
                <button
                  type="button"
                  onClick={() => setOpenAccordion((prev) => (prev === item.id ? "" : item.id))}
                  className="flex w-full items-center justify-between py-4 text-left"
                >
                  <span className="text-sm font-semibold uppercase tracking-wide text-zinc-800">{item.title}</span>
                  <FaChevronDown
                    className={`h-4 w-4 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="pb-4">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-600">{item.content}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-12 lg:col-span-2">
        <div className="mb-8 border-t border-zinc-100 pt-12">
          <HomeProductsSection title="İlginizi Çekebilir" />
        </div>
      </section>
    </div>
  )
}
