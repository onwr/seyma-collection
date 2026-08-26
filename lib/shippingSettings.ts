import type { PrismaClient } from "@/generated/prisma/client"

export const FREE_SHIPPING_THRESHOLD_KEY = "FREE_SHIPPING_THRESHOLD"
export const STANDARD_SHIPPING_COST_KEY = "STANDARD_SHIPPING_COST"

export const DEFAULT_FREE_SHIPPING_THRESHOLD = 750
export const DEFAULT_STANDARD_SHIPPING_COST = 49.9

export type ShippingSettings = {
  threshold: number
  cost: number
}

/**
 * Mağaza kargo ayarları (`Setting` tablosu). Sepet ve sipariş oluşturma aynı kaynağı kullanır.
 */
export async function getShippingSettings(prisma: PrismaClient): Promise<ShippingSettings> {
  const rows = await prisma.setting.findMany({
    where: {
      key: { in: [FREE_SHIPPING_THRESHOLD_KEY, STANDARD_SHIPPING_COST_KEY] },
    },
  })
  const threshold = Number(
    rows.find((s) => s.key === FREE_SHIPPING_THRESHOLD_KEY)?.value ?? DEFAULT_FREE_SHIPPING_THRESHOLD
  )
  const cost = Number(
    rows.find((s) => s.key === STANDARD_SHIPPING_COST_KEY)?.value ?? DEFAULT_STANDARD_SHIPPING_COST
  )
  return {
    threshold: Number.isFinite(threshold) && threshold >= 0 ? threshold : DEFAULT_FREE_SHIPPING_THRESHOLD,
    cost: Number.isFinite(cost) && cost >= 0 ? cost : DEFAULT_STANDARD_SHIPPING_COST,
  }
}

/** Admin ve toplu ayar API’leri için aynı yazma yolu. */
export async function persistShippingSettings(
  prisma: PrismaClient,
  data: { threshold: number; cost: number }
): Promise<void> {
  const vThreshold = String(data.threshold)
  const vCost = String(data.cost)
  await prisma.$transaction([
    prisma.setting.upsert({
      where: { key: FREE_SHIPPING_THRESHOLD_KEY },
      create: {
        key: FREE_SHIPPING_THRESHOLD_KEY,
        value: vThreshold,
        type: "number",
      },
      update: { value: vThreshold, type: "number" },
    }),
    prisma.setting.upsert({
      where: { key: STANDARD_SHIPPING_COST_KEY },
      create: {
        key: STANDARD_SHIPPING_COST_KEY,
        value: vCost,
        type: "number",
      },
      update: { value: vCost, type: "number" },
    }),
  ])
}
