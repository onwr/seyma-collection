import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import { getClientIp } from "@/lib/checkoutRateLimit"

/** İşlem kodları (filtre / rapor için sabit string). */
export const AdminActivityAction = {
  SMTP_SAVE: "SMTP_SAVE",
  SMTP_TEST: "SMTP_TEST",
  PAYTR_SAVE: "PAYTR_SAVE",
  ORDER_STATUS_UPDATE: "ORDER_STATUS_UPDATE",
  ORDER_BULK_UPDATE: "ORDER_BULK_UPDATE",
  ORDER_DELETE: "ORDER_DELETE",
  PRODUCT_CREATE: "PRODUCT_CREATE",
  PRODUCT_UPDATE: "PRODUCT_UPDATE",
  PRODUCT_DELETE: "PRODUCT_DELETE",
  PRODUCT_BULK: "PRODUCT_BULK",
  CATEGORY_UPDATE: "CATEGORY_UPDATE",
  CATEGORY_DELETE: "CATEGORY_DELETE",
  CUSTOMER_UPDATE: "CUSTOMER_UPDATE",
  CUSTOMER_DELETE: "CUSTOMER_DELETE",
  COUPON_CREATE: "COUPON_CREATE",
  COUPON_UPDATE: "COUPON_UPDATE",
  COUPON_DELETE: "COUPON_DELETE",
  REVIEW_UPDATE: "REVIEW_UPDATE",
  REVIEW_DELETE: "REVIEW_DELETE",
  FAQ_CREATE: "FAQ_CREATE",
  FAQ_UPDATE: "FAQ_UPDATE",
  FAQ_DELETE: "FAQ_DELETE",
  SHIPPING_SAVE: "SHIPPING_SAVE",
  FOOTER_SOCIAL_SAVE: "FOOTER_SOCIAL_SAVE",
  STOCK_INCREASE: "STOCK_INCREASE",
  NAV_SYNC_CATEGORIES: "NAV_SYNC_CATEGORIES",
  NAV_ITEM_CREATE: "NAV_ITEM_CREATE",
  NAV_ITEM_UPDATE: "NAV_ITEM_UPDATE",
  NAV_ITEM_DELETE: "NAV_ITEM_DELETE",
  NAV_ANNOUNCEMENTS_SAVE: "NAV_ANNOUNCEMENTS_SAVE",
  HOMEPAGE_SECTION_CREATE: "HOMEPAGE_SECTION_CREATE",
  HOMEPAGE_SECTION_UPDATE: "HOMEPAGE_SECTION_UPDATE",
  HOMEPAGE_SECTION_DELETE: "HOMEPAGE_SECTION_DELETE",
  HOMEPAGE_SLIDER_CREATE: "HOMEPAGE_SLIDER_CREATE",
  HOMEPAGE_SLIDER_UPDATE: "HOMEPAGE_SLIDER_UPDATE",
  HOMEPAGE_SLIDER_DELETE: "HOMEPAGE_SLIDER_DELETE",
  HOMEPAGE_BANNER_CREATE: "HOMEPAGE_BANNER_CREATE",
  HOMEPAGE_BANNER_UPDATE: "HOMEPAGE_BANNER_UPDATE",
  HOMEPAGE_BANNER_DELETE: "HOMEPAGE_BANNER_DELETE",
  HOMEPAGE_CATEGORIES_SAVE: "HOMEPAGE_CATEGORIES_SAVE",
  UPLOAD_FILE: "UPLOAD_FILE",
  STORE_SALE_CREATE: "STORE_SALE_CREATE",
  STORE_SALE_VOID: "STORE_SALE_VOID",
  STORE_INVENTORY_COUNT: "STORE_INVENTORY_COUNT",
} as const

export type AdminSession = { userId: number; email: string; role: string }

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + "…"
}

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "smtp_password",
  "token",
  "secret",
  "authorization",
])

type SanitizeMetadataOpts = {
  /** Sipariş silme gibi denetim kayıtlarında daha geniş JSON/string limiti. */
  generous?: boolean
}

/** Küçük, güvenli metadata; şifre anahtarlarını atlar. */
export function sanitizeAdminActivityMetadata(
  raw: Record<string, unknown> | null | undefined,
  opts?: SanitizeMetadataOpts
): Prisma.InputJsonValue | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const maxStr = opts?.generous ? 15_000 : 500
  const maxNested = opts?.generous ? 400_000 : 800
  const maxArrayJson = opts?.generous ? 400_000 : 8_000
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) continue
    if (v === null || typeof v === "boolean" || typeof v === "number") {
      out[k] = v
      continue
    }
    if (typeof v === "string") {
      out[k] = v.length > maxStr ? truncate(v, maxStr) : v
      continue
    }
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      try {
        const s = JSON.stringify(v)
        if (s.length > maxNested) {
          out[k] = { _truncated: true, jsonPreview: truncate(s, maxNested) }
        } else {
          out[k] = JSON.parse(s) as unknown
        }
      } catch {
        out[k] = "[object]"
      }
      continue
    }
    if (Array.isArray(v)) {
      try {
        const s = JSON.stringify(v)
        if (s.length > maxArrayJson) {
          out[k] = {
            _arrayTruncated: true,
            length: v.length,
            preview: v.slice(0, Math.min(80, v.length)),
          }
        } else {
          out[k] = JSON.parse(s) as unknown
        }
      } catch {
        out[k] = String(v).slice(0, 200)
      }
      continue
    }
    try {
      out[k] = JSON.parse(JSON.stringify(v)) as unknown
    } catch {
      out[k] = String(v).slice(0, 200)
    }
  }
  return Object.keys(out).length ? (out as Prisma.InputJsonValue) : undefined
}

export type LogAdminActivityInput = {
  action: string
  resourceType?: string | null
  resourceId?: string | null
  metadata?: Record<string, unknown> | null
  /** İstemci IP’si için isteği geçirin. */
  request?: Request | null
  /** `sanitizeAdminActivityMetadata` için geniş limit (ör. sipariş silme anlık görüntüsü). */
  generousMetadata?: boolean
}

/**
 * Başarılı admin mutasyonundan sonra çağrın. Hata loglanır, ana işlemi bozmaz.
 */
export async function logAdminActivity(
  prisma: PrismaClient,
  session: AdminSession | null,
  input: LogAdminActivityInput
): Promise<void> {
  if (!session) return

  try {
    const ipRaw = input.request ? getClientIp(input.request) : null
    const ip =
      ipRaw && ipRaw !== "unknown" && ipRaw.length > 0 ? truncate(ipRaw, 45) : null

    await prisma.adminActivity.create({
      data: {
        actorUserId: session.userId,
        actorEmail: truncate(session.email.trim() || "unknown", 255),
        action: truncate(input.action, 80),
        resourceType: input.resourceType ? truncate(input.resourceType, 80) : null,
        resourceId: input.resourceId ? truncate(String(input.resourceId), 255) : null,
        metadata: sanitizeAdminActivityMetadata(input.metadata ?? undefined, {
          generous: input.generousMetadata === true,
        }),
        ip,
      },
    })
  } catch (e) {
    console.error("logAdminActivity:", e)
  }
}
