import type { PrismaClient } from "@/generated/prisma/client"

export const PAYTR_MERCHANT_ID_KEY = "PAYTR_MERCHANT_ID"
export const PAYTR_MERCHANT_KEY_KEY = "PAYTR_MERCHANT_KEY"
export const PAYTR_MERCHANT_SALT_KEY = "PAYTR_MERCHANT_SALT"
export const PAYTR_TEST_MODE_KEY = "PAYTR_TEST_MODE"

export const PAYTR_SETTING_KEYS = [
  PAYTR_MERCHANT_ID_KEY,
  PAYTR_MERCHANT_KEY_KEY,
  PAYTR_MERCHANT_SALT_KEY,
  PAYTR_TEST_MODE_KEY,
] as const

export type PaytrConfig = {
  merchantId: string
  merchantKey: string
  merchantSalt: string
  testMode: boolean
}

export type PaytrConfigForAdmin = {
  merchantId: string
  hasMerchantKey: boolean
  hasMerchantSalt: boolean
  testMode: boolean
}

function parseBool(raw: string | undefined, defaultVal: boolean): boolean {
  if (raw == null || raw === "") return defaultVal
  return raw === "true" || raw === "1"
}

/**
 * PayTR ayarlarını okur. Yönetim panelinden kaydedilmiş bir değer varsa onu kullanır;
 * yoksa `.env` içindeki `PAYTR_*` değişkenlerine geri döner (böylece panel hiç
 * kullanılmadan da mevcut ödeme akışı bozulmaz).
 */
export async function getPaytrConfig(prisma: PrismaClient): Promise<PaytrConfig> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [...PAYTR_SETTING_KEYS] } },
  })
  const map = new Map(rows.map((r) => [r.key, r.value]))

  const merchantId = (map.get(PAYTR_MERCHANT_ID_KEY) ?? process.env.PAYTR_MERCHANT_ID ?? "").trim()
  const merchantKey = (map.get(PAYTR_MERCHANT_KEY_KEY) ?? process.env.PAYTR_MERCHANT_KEY ?? "").trim()
  const merchantSalt = (map.get(PAYTR_MERCHANT_SALT_KEY) ?? process.env.PAYTR_MERCHANT_SALT ?? "").trim()
  const testMode = map.has(PAYTR_TEST_MODE_KEY)
    ? parseBool(map.get(PAYTR_TEST_MODE_KEY), false)
    : process.env.PAYTR_TEST_MODE === "1"

  return { merchantId, merchantKey, merchantSalt, testMode }
}

export async function getPaytrConfigForAdmin(prisma: PrismaClient): Promise<PaytrConfigForAdmin> {
  const full = await getPaytrConfig(prisma)
  return {
    merchantId: full.merchantId,
    hasMerchantKey: full.merchantKey.length > 0,
    hasMerchantSalt: full.merchantSalt.length > 0,
    testMode: full.testMode,
  }
}

export type PersistPaytrInput = {
  merchantId: string
  /** Boş string = mevcut değeri koru (persist sırasında atlanır) */
  merchantKey?: string
  merchantSalt?: string
  testMode: boolean
}

export async function persistPaytrSettings(
  prisma: PrismaClient,
  data: PersistPaytrInput
): Promise<void> {
  const stringRow = (key: string, value: string) =>
    prisma.setting.upsert({
      where: { key },
      create: { key, value, type: "string" },
      update: { value, type: "string" },
    })

  const ops = [
    stringRow(PAYTR_MERCHANT_ID_KEY, data.merchantId.trim()),
    stringRow(PAYTR_TEST_MODE_KEY, data.testMode ? "true" : "false"),
  ]

  if (data.merchantKey !== undefined && data.merchantKey !== "") {
    ops.push(stringRow(PAYTR_MERCHANT_KEY_KEY, data.merchantKey.trim()))
  }
  if (data.merchantSalt !== undefined && data.merchantSalt !== "") {
    ops.push(stringRow(PAYTR_MERCHANT_SALT_KEY, data.merchantSalt.trim()))
  }

  await prisma.$transaction(ops)
}
