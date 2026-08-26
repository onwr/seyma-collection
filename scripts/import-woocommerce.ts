/**
 * WooCommerce → Prisma ürün aktarımı
 *
 * Ortam: `web/.env` içinde `DATABASE_URL`, `WOO_BASE_URL`, `WOO_CONSUMER_KEY`, `WOO_CONSUMER_SECRET`
 *
 * Kullanım (web klasöründen):
 *   npm run import:woo
 *   npm run import:woo -- --dry-run --limit=10
 *   npm run import:woo -- --download-images
 *
 * Güvenlik: API anahtarlarını asla repoya veya sohbete yapıştırmayın.
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"
import axios, { type AxiosInstance } from "axios"
import * as dotenv from "dotenv"
import slugify from "slugify"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import { PrismaClient } from "../generated/prisma/client"
import type { Prisma } from "../generated/prisma/client"

dotenv.config({ path: path.join(process.cwd(), ".env") })

type WooCategory = { id: number; name: string; slug: string }
type WooImage = { id?: number; src: string; alt?: string; name?: string }
type WooAttribute = { id?: number; name: string; option: string }

type WooProduct = {
  id: number
  name: string
  slug: string
  type: string
  status: string
  sku: string
  description: string
  short_description: string
  regular_price: string
  sale_price: string
  price: string
  manage_stock?: boolean
  stock_quantity: number | null
  categories: WooCategory[]
  images: WooImage[]
}

type WooVariation = {
  id: number
  sku: string
  regular_price: string
  sale_price: string
  price: string
  manage_stock?: boolean
  stock_quantity: number | null
  attributes: WooAttribute[]
  status: string
}

function parseArgs() {
  const argv = process.argv.slice(2)
  const dryRun = argv.includes("--dry-run")
  const downloadImages = argv.includes("--download-images")
  let limit = Number.POSITIVE_INFINITY
  const li = argv.indexOf("--limit")
  if (li !== -1) {
    const n = parseInt(argv[li + 1] ?? "", 10)
    if (Number.isFinite(n) && n > 0) limit = n
  }
  return { dryRun, downloadImages, limit }
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return ""
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function parseMoney(v: string | null | undefined): number | null {
  if (v == null || v === "") return null
  const n = Number.parseFloat(String(v).replace(",", "."))
  return Number.isFinite(n) ? n : null
}

/** Satış fiyatı + varsa karşılaştırma (üstü çizili) fiyatı */
function pricePair(regular: string, sale: string): { price: number; compareAt: number | null } {
  const reg = parseMoney(regular)
  const sal = parseMoney(sale)
  if (sal != null && sal > 0) {
    const compare = reg != null && reg > sal ? reg : null
    return { price: sal, compareAt: compare }
  }
  if (reg != null && reg >= 0) return { price: reg, compareAt: null }
  return { price: 0, compareAt: null }
}

function buildWooClient(baseUrl: string, key: string, secret: string): AxiosInstance {
  const root = baseUrl.replace(/\/+$/, "")
  return axios.create({
    baseURL: `${root}/wp-json/wc/v3`,
    auth: { username: key, password: secret },
    timeout: 120_000,
    validateStatus: (s) => s >= 200 && s < 300,
  })
}

async function fetchAllProducts(client: AxiosInstance, perPage: number): Promise<WooProduct[]> {
  const out: WooProduct[] = []
  let page = 1
  for (;;) {
    const { data } = await client.get<WooProduct[]>("/products", {
      params: {
        per_page: perPage,
        page,
        // Tek değer olmalı; virgüllü liste Woo bazı sürümlerde 400 "rest_invalid_param" verir.
        status: "any",
      },
    })
    if (!Array.isArray(data) || data.length === 0) break
    out.push(...data)
    if (data.length < perPage) break
    page += 1
  }
  return out
}

async function fetchVariations(client: AxiosInstance, productId: number): Promise<WooVariation[]> {
  const out: WooVariation[] = []
  let page = 1
  const perPage = 100
  for (;;) {
    const { data } = await client.get<WooVariation[]>(`/products/${productId}/variations`, {
      params: { per_page: perPage, page },
    })
    if (!Array.isArray(data) || data.length === 0) break
    out.push(...data)
    if (data.length < perPage) break
    page += 1
  }
  return out.filter((v) => v.status !== "trash")
}

async function ensureUniqueVariantSku(
  prisma: PrismaClient,
  base: string,
  wooProductId: number,
  variationId: number
): Promise<string> {
  let candidate = base || `WOO-${wooProductId}-V-${variationId}`
  let n = 0
  for (;;) {
    const exists = await prisma.productVariant.findUnique({ where: { sku: candidate } })
    if (!exists) return candidate
    n += 1
    candidate = `${base || `WOO-${wooProductId}-V-${variationId}`}-${n}`
  }
}

async function resolveProductSlug(
  prisma: PrismaClient,
  wooSlug: string,
  wooId: number,
  ownProductId?: number
): Promise<string> {
  const raw = wooSlug?.trim() || slugify(`urun-${wooId}`, { lower: true, strict: true })
  const base = slugify(raw, { lower: true, strict: true }) || `urun-${wooId}`
  let candidate = base
  let n = 0
  for (;;) {
    const other = await prisma.product.findUnique({ where: { slug: candidate } })
    if (!other) return candidate
    if (ownProductId != null && other.id === ownProductId) return candidate
    if (other.wooProductId === wooId) return candidate
    n += 1
    candidate = `${base}-woo-${wooId}${n > 1 ? `-${n}` : ""}`
  }
}

// Kategori Cache (ID -> Prisma ID)
const categoryMap = new Map<number, number>();

/**
 * WooCommerce kategorilerini senin istediğin yapıya göre senkronize eder.
 */
async function syncWooCategories(prisma: PrismaClient | null, wooCategories: any[]) {
  console.log("Kategoriler senkronize ediliyor...");
  
  for (const cat of wooCategories) {
    const slug = slugify(cat.slug || cat.name, { lower: true, strict: true });
    let categoryId = cat.id; // Varsayılan Woo ID (dry-run için)

    if (prisma) {
      const row = await prisma.category.upsert({
        where: { slug },
        create: { name: cat.name, slug, description: stripHtml(cat.description) },
        update: { name: cat.name }
      });
      categoryId = row.id;
    }
    categoryMap.set(cat.id, categoryId);
  }

  // "Aksesuar" ana kategorisini veritabanında garanti altına al (Woo'da yoksa bile)
  if (!categoryMap.has(999999)) {
    let accId = 999999;
    if (prisma) {
      const accRow = await prisma.category.upsert({
        where: { slug: 'aksesuar' },
        create: { name: 'Aksesuar', slug: 'aksesuar' },
        update: { name: 'Aksesuar' }
      });
      accId = accRow.id;
    }
    categoryMap.set(999999, accId);
  }

  // Parent (üst kategori) ilişkilerini kur (Sadece gerçek aktarımda)
  if (prisma) {
    for (const cat of wooCategories) {
      if (cat.parent && categoryMap.has(cat.parent)) {
        await prisma.category.update({
          where: { id: categoryMap.get(cat.id) },
          data: { parentId: categoryMap.get(cat.parent) }
        });
      }
    }
  }
}

/**
 * Ürünün kategorilerini senin 5 ana grubuna göre analiz eder.
 */
function resolveCategoryHierarchy(wooProductCategories: WooCategory[], allWooCategories: any[]) {
  // Senin ana kategorilerin (WooCommerce'den gelen gerçek sluglar)
  const mainCategorySlugs = [
    'erkek-bebek-0-24-ay', 
    'kiz-bebek-0-24-ay', 
    'erkek-cocuk', 
    'kiz-cocuk-1-4-yas', 
    'aksesuar',
    'atki-bere', // Bunları da ana kategori gibi görelim
    'ayakkabi'
  ];

  let mainCatId: number | null = null;
  let subCatId: number | null = null;
  let mainCatName: string = 'Yok';
  let subCatName: string = 'Yok';

  // Aksesuar grubuna girecek sluglar
  const accessorySubSlugs = ['atki-bere', 'ayakkabi', 'toka-bandana'];

  // Ürünün tüm kategorilerini ve onların ebeveynlerini tara
  for (const pCat of wooProductCategories) {
    const fullCatInfo = allWooCategories.find(c => c.id === pCat.id);
    if (!fullCatInfo) continue;

    // ÖZEL DURUM: Eğer kategori bir aksesuar tipiyse
    if (accessorySubSlugs.includes(fullCatInfo.slug)) {
      // "Aksesuar" ana kategorisini bul veya oluştur (manuel slug ile)
      const aksesuarMain = allWooCategories.find(c => c.slug === 'aksesuar') || { id: 999999, name: 'Aksesuar', slug: 'aksesuar' };
      mainCatId = categoryMap.get(aksesuarMain.id) || null;
      subCatId = categoryMap.get(fullCatInfo.id) || null;
      mainCatName = 'Aksesuar';
      subCatName = fullCatInfo.name;
      continue; // Bu ürün için ana kategori bulundu, devam et
    }

    // NORMAL DURUM: Eğer bu kategori bir ana kategoriyse
    if (mainCategorySlugs.includes(fullCatInfo.slug)) {
      mainCatId = categoryMap.get(fullCatInfo.id) || null;
      mainCatName = fullCatInfo.name;
    } 
    // Eğer bu kategorinin ebeveyni bir ana kategoriyse, bu bir alt kategoridir
    else if (fullCatInfo.parent) {
      const parentInfo = allWooCategories.find(c => c.id === fullCatInfo.parent);
      if (parentInfo && mainCategorySlugs.includes(parentInfo.slug)) {
        mainCatId = categoryMap.get(parentInfo.id) || null;
        subCatId = categoryMap.get(fullCatInfo.id) || null;
        mainCatName = parentInfo.name;
        subCatName = fullCatInfo.name;
      }
    }
  }

  return { categoryId: mainCatId, subCategoryId: subCatId, mainCatName, subCatName };
}

async function downloadImageToPublic(remoteUrl: string, slug: string, index: number): Promise<string> {
  const dir = path.join(process.cwd(), "public", "woo-import")
  await fs.mkdir(dir, { recursive: true })
  let ext = ".jpg"
  try {
    const u = new URL(remoteUrl)
    const e = path.extname(u.pathname)
    if (e && e.length <= 6) ext = e.split("?")[0] ?? ext
  } catch { /* default .jpg */ }
  const safe = slugify(slug, { lower: true, strict: true }) || "img"
  const file = `${safe}-${index}${ext}`
  const outPath = path.join(dir, file)
  const res = await axios.get<ArrayBuffer>(remoteUrl, {
    responseType: "arraybuffer",
    timeout: 120_000,
    maxRedirects: 5,
    validateStatus: (s) => s >= 200 && s < 300,
  })
  await fs.writeFile(outPath, Buffer.from(res.data))
  return `/woo-import/${file}`
}

async function importOneProduct(
  prisma: PrismaClient | null,
  client: AxiosInstance,
  woo: WooProduct,
  opts: { downloadImages: boolean; dryRun: boolean }
): Promise<{ ok: boolean; message: string }> {
  if (!opts.dryRun && !prisma) throw new Error("Veritabanı bağlantısı gerekli (dry-run değil).")

  if (woo.status === "trash") return { ok: false, message: `atlandı (çöp): #${woo.id}` }
  if (woo.type === "grouped" || woo.type === "external") {
    return { ok: false, message: `atlandı (tip ${woo.type}): #${woo.id} ${woo.name}` }
  }

  const isActive = woo.status === "publish"
  
  // Kategori Hiyerarşisini Çöz
  const { categoryId, subCategoryId, mainCatName, subCatName } = resolveCategoryHierarchy(woo.categories, (global as any).allWooCategories);

  const shortPlain = stripHtml(woo.short_description)
  const metaDescription =
    shortPlain.length > 500 ? `${shortPlain.slice(0, 497)}...` : shortPlain || null

  let basePrice = 0
  let compareAtPrice: number | null = null
  const variantsToCreate: Array<{
    name: string
    sku: string
    price: number
    stock: number
    attributesJson: string | null
    isActive: boolean
  }> = []

  if (woo.type === "variable") {
    compareAtPrice = null
    const vars = await fetchVariations(client, woo.id)
    if (vars.length === 0) return { ok: false, message: `atlandı (varyant yok): #${woo.id} ${woo.name}` }
    const prices: number[] = []
    for (const v of vars) {
      const { price } = pricePair(v.regular_price, v.sale_price)
      prices.push(price)
      const label =
        v.attributes?.map((a) => `${stripHtml(a.name)}: ${stripHtml(a.option)}`).join(" · ") || `Varyant #${v.id}`
      const stock =
        v.manage_stock && v.stock_quantity != null && Number.isFinite(Number(v.stock_quantity))
          ? Math.max(0, Math.floor(Number(v.stock_quantity)))
          : 0
      const skuBase = v.sku?.trim() || `WOO-${woo.id}-V-${v.id}`
      const sku = opts.dryRun || !prisma ? skuBase : await ensureUniqueVariantSku(prisma, skuBase, woo.id, v.id)
      variantsToCreate.push({
        name: label,
        sku,
        price,
        stock,
        attributesJson: v.attributes?.length ? JSON.stringify(v.attributes) : null,
        isActive: v.status === "publish",
      })
    }
    basePrice = Math.min(...prices)
  } else {
    const { price, compareAt } = pricePair(woo.regular_price, woo.sale_price)
    basePrice = price
    compareAtPrice = compareAt
    const stock =
      woo.manage_stock && woo.stock_quantity != null && Number.isFinite(Number(woo.stock_quantity))
        ? Math.max(0, Math.floor(Number(woo.stock_quantity)))
        : 0
    const skuBase = woo.sku?.trim() || `WOO-${woo.id}`
    const sku = opts.dryRun || !prisma ? skuBase : await ensureUniqueVariantSku(prisma, skuBase, woo.id, 0)
    variantsToCreate.push({
      name: "Standart",
      sku,
      price,
      stock,
      attributesJson: null,
      isActive: true,
    })
  }

  const existing = !opts.dryRun && prisma ? await prisma.product.findUnique({ where: { wooProductId: woo.id } }) : null

  const resolvedSlug = opts.dryRun || !prisma
    ? slugify(woo.slug || woo.name, { lower: true, strict: true }) || `urun-${woo.id}`
    : await resolveProductSlug(
        prisma,
        woo.slug || slugify(woo.name, { lower: true, strict: true }) || `urun-${woo.id}`,
        woo.id,
        existing?.id
      )

  let productSku = woo.sku?.trim() || null
  if (!opts.dryRun && prisma && productSku) {
    const skuOwner = await prisma.product.findUnique({ where: { sku: productSku } })
    if (skuOwner && skuOwner.wooProductId !== woo.id) productSku = null
  }

  const imageInputs: Array<{ url: string; alt: string | null; sortOrder: number; isCover: boolean }> = []
  for (let i = 0; i < (woo.images?.length ?? 0); i++) {
    const img = woo.images[i]
    if (!img?.src) continue
    const url =
      opts.downloadImages && !opts.dryRun ? await downloadImageToPublic(img.src, resolvedSlug, i) : img.src
    imageInputs.push({
      url,
      alt: img.alt?.trim() || img.name?.trim() || null,
      sortOrder: i,
      isCover: i === 0,
    })
  }

  if (opts.dryRun) {
    return {
      ok: true,
      message: `[dry-run] #${woo.id} ${woo.name} | Kat: ${mainCatName} | AltKat: ${subCatName} | slug=${resolvedSlug}`,
    }
  }

  const dataCore: Prisma.ProductUncheckedUpdateInput = {
    name: woo.name,
    slug: resolvedSlug,
    wooProductId: woo.id,
    description: woo.description?.trim() || null,
    shortDescription: woo.short_description?.trim() || null,
    basePrice,
    compareAtPrice,
    sku: productSku ?? null,
    categoryId,
    subCategoryId, // Alt kategori desteği eklendi
    isActive,
    metaTitle: woo.name.slice(0, 191),
    metaDescription,
  }

  await prisma!.$transaction(async (tx) => {
    const p = existing
      ? await tx.product.update({
          where: { id: existing.id },
          data: dataCore,
        })
      : await tx.product.create({
          data: {
            name: woo.name,
            slug: resolvedSlug,
            wooProductId: woo.id,
            description: woo.description?.trim() || null,
            shortDescription: woo.short_description?.trim() || null,
            basePrice,
            compareAtPrice,
            sku: productSku,
            categoryId,
            subCategoryId,
            isActive,
            metaTitle: woo.name.slice(0, 191),
            metaDescription,
          },
        })

    await tx.productImage.deleteMany({ where: { productId: p.id } })
    await tx.productVariant.deleteMany({ where: { productId: p.id } })

    if (imageInputs.length > 0) {
      await tx.productImage.createMany({
        data: imageInputs.map((im) => ({
          productId: p.id,
          url: im.url,
          alt: im.alt,
          sortOrder: im.sortOrder,
          isCover: im.isCover,
        })),
      })
    }

    for (const v of variantsToCreate) {
      await tx.productVariant.create({
        data: {
          productId: p.id,
          name: v.name,
          sku: v.sku,
          price: v.price,
          stock: v.stock,
          attributesJson: v.attributesJson,
          isActive: v.isActive,
        },
      })
    }
  })

  return { ok: true, message: `kaydedildi: #${woo.id} ${woo.name} (${resolvedSlug})` }
}

async function main() {
  const { dryRun, downloadImages, limit } = parseArgs()

  const base = process.env.WOO_BASE_URL?.trim()
  const key = process.env.WOO_CONSUMER_KEY?.trim()
  const secret = process.env.WOO_CONSUMER_SECRET?.trim()
  const dbUrl = process.env.DATABASE_URL?.trim()

  if (!base || !key || !secret) {
    console.error("Eksik ortam: WOO_BASE_URL, WOO_CONSUMER_KEY, WOO_CONSUMER_SECRET (.env)")
    process.exit(1)
  }
  if (!dryRun && !dbUrl) {
    console.error("DATABASE_URL tanımlı değil (dry-run değilse zorunlu).")
    process.exit(1)
  }

  if (!/^https:\/\//i.test(base)) {
    console.error("WOO_BASE_URL https:// ile başlamalı.")
    process.exit(1)
  }

  const client = buildWooClient(base, key, secret)

  console.log("WooCommerce kategorileri çekiliyor…")
  const allWooCats: any[] = [];
  let catPage = 1;
  for (;;) {
    const { data: cats } = await client.get("/products/categories", { 
      params: { per_page: 100, page: catPage } 
    });
    if (!Array.isArray(cats) || cats.length === 0) break;
    allWooCats.push(...cats);
    if (cats.length < 100) break;
    catPage++;
  }
  (global as any).allWooCategories = allWooCats;

  let prisma: PrismaClient | null = null
  if (!dryRun) {
    const adapter = new PrismaMariaDb(dbUrl!)
    prisma = new PrismaClient({ adapter })
  }
  
  // Dry-run olsa bile kategori haritasını oluştur
  await syncWooCategories(prisma, allWooCats);

  console.log("WooCommerce ürünleri çekiliyor…")
  const products = await fetchAllProducts(client, 100)
  const slice = products.slice(0, Number.isFinite(limit) ? limit : products.length)
  console.log(`Toplam ${products.length} ürün bulundu; işlenecek: ${slice.length}${dryRun ? " (dry-run)" : ""}`)

  let ok = 0
  let fail = 0
  for (const woo of slice) {
    try {
      const r = await importOneProduct(prisma, client, woo, { downloadImages, dryRun })
      if (r.ok) {
        ok += 1
        console.log(r.message)
      } else {
        fail += 1
        console.warn(r.message)
      }
    } catch (e) {
      fail += 1
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`Hata #${woo.id} ${woo.name}:`, msg)
    }
  }

  if (prisma) await prisma.$disconnect()

  console.log(`Bitti. Başarılı: ${ok}, atlanan/hata: ${fail}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
