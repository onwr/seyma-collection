// Trendyol kategori özellik ID eşleştirmeleri.
// Beden/Web Color'ın GEÇERLİ DEĞER ID'leri kategoriye göre değişir (ör. "Kaban"daki Beden
// listesi "Elbise"dekiyle aynı değildir) — bu yüzden önbellek `(categoryId, attributeId)`
// çiftine göre anahtarlanır; tek bir sabit kategoriye göre DEĞİL.
import type { PrismaClient } from "@/generated/prisma/client"
import { getCategoryAttributeValues } from "@/lib/trendyol"

export const BRAND_ID = 1361024 // "sira butik" — gerçek Trendyol hesabındaki marka

/** Ürünün kendi kategorisi çözülemediğinde (ör. yerelde oluşturulmuş, hiçbir Trendyol
 *  kategorisine eşlenmemiş bir ürün) kullanılacak son çare — "Elbise". */
export const FALLBACK_CATEGORY_ID = 1182

// Tüm kategorilerde ortak, hep aynı varsayılan değerleri kullandığımız zorunlu öznitelikler —
// API'ye her seferinde sormaya gerek yok, doğrulanmış ID'ler sabit. 13 kategorinin tamamında
// (Kumaş Pantolon HARİÇ — orada "Kalıp" özniteliği hiç yok) bu ID'lerin var olduğu ve zorunlu
// olduğu canlı olarak doğrulandı (bkz. GET /product/product-categories/{id}/attributes).
//
// BİLİNEN EKSİK: Kategorilerin çoğunda (13'ün 11'i) ayrıca "343:Cinsiyet" zorunlu, bazılarında
// "33:Desen", "117:Dokuma Tipi", "1:Bel", "14:Materyal" da zorunlu — bunlar için elimizde
// güvenilir varsayılan/gerçek veri yok, bu yüzden henüz gönderilmiyor. Bu durumda Trendyol
// muhtemelen "zorunlu özellik eksik" diyerek reddedecek (veri bozulması değil, güvenli red).
// Gerçek bir YENİ ürünü Trendyol'a göndermeniz gerekirse bu eksik önce tamamlanmalı.
export const FIXED_ATTRIBUTES: { attributeId: number; attributeValueId: number }[] = [
  { attributeId: 346, attributeValueId: 256115 }, // Yaş Grubu: "Bebek & Çocuk"
  { attributeId: 179, attributeValueId: 1256921 }, // Kalıp: "Belirtilmemiş"
  { attributeId: 200, attributeValueId: 10619094 }, // Kumaş Tipi: "Belirtilmemiş"
  { attributeId: 1192, attributeValueId: 10617344 }, // Menşei: "TR"
  { attributeId: 48, attributeValueId: 10591478 }, // Boy: "Belirtilmemiş"
]
/** Kumaş Pantolon (categoryId 3902) kategorisinde "Kalıp" (179) özniteliği hiç yok —
 *  gönderilirse "kategoride olmayan öznitelik" hatası alınır, bu yüzden bu kategoriye
 *  özel olarak çıkarılmalı. */
export const CATEGORY_ATTRIBUTE_EXCLUSIONS: Record<number, number[]> = {
  3902: [179], // Kumaş Pantolon: Kalıp yok
}

export const BEDEN_ATTR_ID = 338
export const WEB_COLOR_ATTR_ID = 348
export const RENK_ATTR_ID = 47 // allowCustom=true — customAttributeValue ile serbest metin gider, ID gerekmez

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // Trendyol'un kendi önerisi: haftalık güncelle

function normalize(s: string): string {
  return s.trim().toLocaleLowerCase("tr")
}

function cacheKey(categoryId: number, attributeId: number): string {
  return `${categoryId}:${attributeId}`
}

// Süreç-içi (in-memory) önbellek — DB'deki kalıcı önbelleğin üzerine ek bir katman.
// Binlerce varyantı tek bir senkron turunda işlerken, her varyant için Setting tablosuna
// tekrar tekrar gitmek (5000+ varyantta 10000+ sorgu) turun 5 dakikalık cron aralığını
// aşıp dakikalarca sürmesine yol açıyordu — bu önbellek aynı process içinde tek sorguya indiriyor.
const memoryCache = new Map<string, { fetchedAt: number; map: Map<string, number> }>()

async function getCachedValueMap(
  prisma: PrismaClient,
  categoryId: number,
  attributeId: number
): Promise<Map<string, number>> {
  const ck = cacheKey(categoryId, attributeId)
  const mem = memoryCache.get(ck)
  if (mem && Date.now() - mem.fetchedAt < CACHE_TTL_MS) {
    return mem.map
  }

  const key = `TRENDYOL_ATTR_CACHE_${ck}`
  const row = await prisma.setting.findUnique({ where: { key } })
  if (row?.value) {
    try {
      const parsed = JSON.parse(row.value) as { fetchedAt: number; values: [string, number][] }
      if (Date.now() - parsed.fetchedAt < CACHE_TTL_MS) {
        const map = new Map(parsed.values)
        memoryCache.set(ck, { fetchedAt: parsed.fetchedAt, map })
        return map
      }
    } catch {
      // bozuk önbellek, tazele
    }
  }

  const values = await getCategoryAttributeValues(categoryId, attributeId)
  const map = new Map(values.map((v) => [normalize(v.attributeValue), v.attributeValueId]))
  const fetchedAt = Date.now()
  memoryCache.set(ck, { fetchedAt, map })
  await prisma.setting.upsert({
    where: { key },
    update: { value: JSON.stringify({ fetchedAt, values: Array.from(map.entries()) }) },
    create: {
      key,
      value: JSON.stringify({ fetchedAt, values: Array.from(map.entries()) }),
      type: "json",
    },
  })
  return map
}

/** `canonicalBeden`: `lib/trendyolExport.ts`'teki `matchBeden()` ile üretilmiş resmi yazım.
 *  `categoryId`: ürünün GERÇEK Trendyol kategorisi (`Category.trendyolCategoryId`). */
export async function getBedenValueId(
  prisma: PrismaClient,
  categoryId: number,
  canonicalBeden: string
): Promise<number | null> {
  const map = await getCachedValueMap(prisma, categoryId, BEDEN_ATTR_ID)
  return map.get(normalize(canonicalBeden)) ?? null
}

/** `canonicalWebColor`: `lib/trendyolExport.ts`'teki `matchWebColor()` ile üretilmiş resmi yazım.
 *  `categoryId`: ürünün GERÇEK Trendyol kategorisi (`Category.trendyolCategoryId`). */
export async function getWebColorValueId(
  prisma: PrismaClient,
  categoryId: number,
  canonicalWebColor: string
): Promise<number | null> {
  const map = await getCachedValueMap(prisma, categoryId, WEB_COLOR_ATTR_ID)
  return map.get(normalize(canonicalWebColor)) ?? null
}
