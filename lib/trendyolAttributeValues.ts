// Trendyol "Elbise" (categoryId 1182) kategori özellik ID eşleştirmeleri.
// Sabitler ve Beden/Web Color ID önbelleği burada — planlama sırasında gerçek, canlı bir
// üründen (barkod 2000000187075, "Sweet Takım") okunarak doğrulandı.
import type { PrismaClient } from "@/generated/prisma/client"
import { getCategoryAttributeValues } from "@/lib/trendyol"

export const BRAND_ID = 3028707 // "Little Mom's Store"
export const CATEGORY_ID = 1182 // Elbise

// Hep aynı varsayılan değerleri kullandığımız zorunlu öznitelikler — API'ye her seferinde
// sormaya gerek yok, doğrulanmış ID'ler sabit.
export const FIXED_ATTRIBUTES: { attributeId: number; attributeValueId: number }[] = [
  { attributeId: 346, attributeValueId: 256115 }, // Yaş Grubu: "Bebek & Çocuk"
  { attributeId: 179, attributeValueId: 1256921 }, // Kalıp: "Belirtilmemiş"
  { attributeId: 200, attributeValueId: 10619094 }, // Kumaş Tipi: "Belirtilmemiş"
  { attributeId: 1192, attributeValueId: 10617344 }, // Menşei: "TR"
  { attributeId: 48, attributeValueId: 10591478 }, // Boy: "Belirtilmemiş"
]

export const BEDEN_ATTR_ID = 338
export const WEB_COLOR_ATTR_ID = 348
export const RENK_ATTR_ID = 47 // allowCustom=true — customAttributeValue ile serbest metin gider, ID gerekmez

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // Trendyol'un kendi önerisi: haftalık güncelle

function normalize(s: string): string {
  return s.trim().toLocaleLowerCase("tr")
}

// Süreç-içi (in-memory) önbellek — DB'deki kalıcı önbelleğin üzerine ek bir katman.
// Binlerce varyantı tek bir senkron turunda işlerken, her varyant için Setting tablosuna
// tekrar tekrar gitmek (5000+ varyantta 10000+ sorgu) turun 5 dakikalık cron aralığını
// aşıp dakikalarca sürmesine yol açıyordu — bu önbellek aynı process içinde tek sorguya indiriyor.
const memoryCache = new Map<number, { fetchedAt: number; map: Map<string, number> }>()

async function getCachedValueMap(prisma: PrismaClient, attributeId: number): Promise<Map<string, number>> {
  const mem = memoryCache.get(attributeId)
  if (mem && Date.now() - mem.fetchedAt < CACHE_TTL_MS) {
    return mem.map
  }

  const key = `TRENDYOL_ATTR_CACHE_${attributeId}`
  const row = await prisma.setting.findUnique({ where: { key } })
  if (row?.value) {
    try {
      const parsed = JSON.parse(row.value) as { fetchedAt: number; values: [string, number][] }
      if (Date.now() - parsed.fetchedAt < CACHE_TTL_MS) {
        const map = new Map(parsed.values)
        memoryCache.set(attributeId, { fetchedAt: parsed.fetchedAt, map })
        return map
      }
    } catch {
      // bozuk önbellek, tazele
    }
  }

  const values = await getCategoryAttributeValues(CATEGORY_ID, attributeId)
  const map = new Map(values.map((v) => [normalize(v.attributeValue), v.attributeValueId]))
  const fetchedAt = Date.now()
  memoryCache.set(attributeId, { fetchedAt, map })
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

/** `canonicalBeden`: `lib/trendyolExport.ts`'teki `matchBeden()` ile üretilmiş resmi yazım. */
export async function getBedenValueId(prisma: PrismaClient, canonicalBeden: string): Promise<number | null> {
  const map = await getCachedValueMap(prisma, BEDEN_ATTR_ID)
  return map.get(normalize(canonicalBeden)) ?? null
}

/** `canonicalWebColor`: `lib/trendyolExport.ts`'teki `matchWebColor()` ile üretilmiş resmi yazım. */
export async function getWebColorValueId(prisma: PrismaClient, canonicalWebColor: string): Promise<number | null> {
  const map = await getCachedValueMap(prisma, WEB_COLOR_ATTR_ID)
  return map.get(normalize(canonicalWebColor)) ?? null
}
