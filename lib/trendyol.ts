// Trendyol Marketplace Entegrasyon API istemcisi.
// Kimlik doğrulama: Basic Auth (base64(apiKey:apiSecret)) + zorunlu User-Agent header
// (yoksa Trendyol 403 döner). Kaynak: developers.trendyol.com/en/docs/authorization
const BASE_URL = "https://apigw.trendyol.com/integration"
const STORE_FRONT_CODE = "TR"

function env(name: string): string {
  const val = process.env[name]
  if (!val) {
    throw new Error(`${name} tanımlı değil (.env).`)
  }
  return val
}

function authHeaders(): Record<string, string> {
  const supplierId = env("TRENDYOL_SUPPLIER_ID")
  const apiKey = env("TRENDYOL_API_KEY")
  const apiSecret = env("TRENDYOL_API_SECRET")
  const token = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")
  return {
    Authorization: `Basic ${token}`,
    "User-Agent": `${supplierId} - Self Integration`,
    storeFrontCode: STORE_FRONT_CODE,
    "Content-Type": "application/json",
  }
}

async function trendyolFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers || {}) },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Trendyol API hatası (${res.status} ${path}): ${text.slice(0, 500)}`)
  }
  return res.json() as Promise<T>
}

export interface TrendyolOrderLine {
  quantity: number
  barcode: string
  stockCode?: string
  merchantSku?: string
  productName?: string
  orderLineItemStatusName?: string
  price?: number
  amount?: number
}

export interface TrendyolAddress {
  firstName?: string
  lastName?: string
  fullName?: string
  address1?: string
  address2?: string
  fullAddress?: string
  city?: string
  district?: string
  postalCode?: string
  countryCode?: string
  phone?: string | null
}

export interface TrendyolOrderPackage {
  orderNumber: string
  shipmentPackageId: number
  status: string
  lines: TrendyolOrderLine[]
  orderDate: number
  lastModifiedDate: number
  customerFirstName?: string
  customerLastName?: string
  customerEmail?: string
  shipmentAddress?: TrendyolAddress
  invoiceAddress?: TrendyolAddress
  totalPrice?: number
  packageTotalPrice?: number
  totalDiscount?: number
  cargoProviderName?: string
  cargoTrackingNumber?: number | string
}

interface TrendyolOrdersResponse {
  totalElements: number
  totalPages: number
  page: number
  size: number
  content: TrendyolOrderPackage[]
}

/** `status`: Created | Picking | Invoiced | Shipped | Cancelled | Delivered | Returned | UnSupplied ... */
export async function fetchOrders(params: {
  status?: string
  startDate?: number
  endDate?: number
  page?: number
  size?: number
}): Promise<TrendyolOrdersResponse> {
  const supplierId = env("TRENDYOL_SUPPLIER_ID")
  const qs = new URLSearchParams()
  if (params.status) qs.set("status", params.status)
  if (params.startDate) qs.set("startDate", String(params.startDate))
  if (params.endDate) qs.set("endDate", String(params.endDate))
  qs.set("page", String(params.page ?? 0))
  qs.set("size", String(params.size ?? 200))
  qs.set("orderByField", "PackageLastModifiedDate")
  qs.set("orderByDirection", "ASC")
  return trendyolFetch<TrendyolOrdersResponse>(`/order/sellers/${supplierId}/v2/orders?${qs.toString()}`)
}

/** Tüm sayfaları gezip birleştirir (tek çağrıda en fazla 200 kayıt döndüğü için). */
export async function fetchAllOrders(params: {
  status?: string
  startDate?: number
  endDate?: number
}): Promise<TrendyolOrderPackage[]> {
  const all: TrendyolOrderPackage[] = []
  let page = 0
  for (;;) {
    const res = await fetchOrders({ ...params, page, size: 200 })
    all.push(...res.content)
    if (page >= res.totalPages - 1 || res.content.length === 0) break
    page += 1
  }
  return all
}

export interface TrendyolStockItem {
  barcode: string
  quantity: number
  salePrice: number
  listPrice: number
}

export interface StockPushBatchResult {
  batchRequestId: string
  items: TrendyolStockItem[]
}

/** En fazla 1000 kalem/istek — otomatik parçalar. Her parçanın hangi kalemleri içerdiğini de döner
 *  (admin panelinde "bu gönderimde hangi ürünler vardı" diye gösterebilmek için). */
export async function pushStockAndPrice(items: TrendyolStockItem[]): Promise<StockPushBatchResult[]> {
  const supplierId = env("TRENDYOL_SUPPLIER_ID")
  const results: StockPushBatchResult[] = []
  for (let i = 0; i < items.length; i += 1000) {
    const chunk = items.slice(i, i + 1000)
    const result = await trendyolFetch<{ batchRequestId: string }>(
      `/inventory/sellers/${supplierId}/products/price-and-inventory`,
      { method: "POST", body: JSON.stringify({ items: chunk }) }
    )
    results.push({ batchRequestId: result.batchRequestId, items: chunk })
  }
  return results
}

export interface BatchItemResult {
  status: string
  failureReasons?: string[]
  requestItem?: { barcode?: string; [key: string]: unknown }
}

export interface BatchRequestResult {
  batchRequestId: string
  // Gerçek API cevabında üst seviye bir "status" alanı YOK (dokümantasyon öyle diyordu ama
  // gerçekte gelmiyor) — tamamlanma durumu items/itemCount karşılaştırmasıyla anlaşılıyor.
  status?: string
  itemCount: number
  failedItemCount: number
  items: BatchItemResult[]
}

/** Asenkron price-and-inventory isteğinin sonucunu sorgular (push'tan birkaç dakika sonra çağrılmalı). */
export async function checkBatchStatus(batchRequestId: string): Promise<BatchRequestResult> {
  const supplierId = env("TRENDYOL_SUPPLIER_ID")
  return trendyolFetch<BatchRequestResult>(
    `/product/sellers/${supplierId}/products/batch-requests/${batchRequestId}`
  )
}

interface AttributeValuesResponse {
  content: { attributeValueId: number; attributeValue: string }[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/** Bir kategori-özellik çiftinin izin verilen tüm değerlerini (ör. Beden'in 754 seçeneği) sayfalayarak çeker.
 *  V2 uç noktası — V1 (`/product-categories/...`) 10 Ağustos 2026'dan itibaren brownout/kaldırıldı. */
export async function getCategoryAttributeValues(
  categoryId: number,
  attributeId: number
): Promise<{ attributeValueId: number; attributeValue: string }[]> {
  const all: { attributeValueId: number; attributeValue: string }[] = []
  let page = 0
  for (;;) {
    const res = await trendyolFetch<AttributeValuesResponse>(
      `/product/categories/${categoryId}/attributes/${attributeId}/values?page=${page}&size=1000`
    )
    all.push(...res.content)
    if (page >= res.totalPages - 1 || res.content.length === 0) break
    page += 1
  }
  return all
}

interface ProductsByBarcodeResponse {
  content: { productMainId: string }[]
}

/** Bir barkodun Trendyol'da GERÇEKTE hangi productMainId altında kayıtlı olduğunu sorgular.
 *  Bizim ürettiğimiz varsayılan productMainId (sku/"URUN-{id}") eski Excel yüklemesinden kalma
 *  gerçek değerle eşleşmeyince "zaten mevcut" hatası alınıyor — bu, uzlaştırma için kullanılır. */
export async function getProductByBarcode(barcode: string): Promise<{ productMainId: string } | null> {
  const supplierId = env("TRENDYOL_SUPPLIER_ID")
  const res = await trendyolFetch<ProductsByBarcodeResponse>(
    `/product/sellers/${supplierId}/products?barcode=${encodeURIComponent(barcode)}`
  )
  const first = res.content?.[0]
  return first ? { productMainId: first.productMainId } : null
}

export interface TrendyolProductAttribute {
  attributeId: number
  attributeValueId?: number
  customAttributeValue?: string
}

export interface TrendyolProductItem {
  barcode: string
  title: string
  productMainId: string
  brandId: number
  categoryId: number
  quantity: number
  stockCode: string
  description: string
  listPrice: number
  salePrice: number
  vatRate: number
  images: { url: string }[]
  attributes: TrendyolProductAttribute[]
}

export interface ProductPushBatchResult {
  batchRequestId: string
  items: TrendyolProductItem[]
}

/** Ürün oluşturma/güncelleme — aynı barkod/productMainId ile tekrar gönderim Trendyol tarafında
 *  güncelleme olarak işleniyor (yinelenen ürün oluşturmuyor). En fazla 1000 kalem/istek. */
export async function createOrUpdateProducts(items: TrendyolProductItem[]): Promise<ProductPushBatchResult[]> {
  const supplierId = env("TRENDYOL_SUPPLIER_ID")
  const results: ProductPushBatchResult[] = []
  for (let i = 0; i < items.length; i += 1000) {
    const chunk = items.slice(i, i + 1000)
    const result = await trendyolFetch<{ batchRequestId: string }>(
      `/product/sellers/${supplierId}/v2/products`,
      { method: "POST", body: JSON.stringify({ items: chunk }) }
    )
    results.push({ batchRequestId: result.batchRequestId, items: chunk })
  }
  return results
}
