import type { PrismaClient } from "@/generated/prisma/client"
import {
  SITE_BRANDING_SETTING_KEYS,
  SITE_FAVICON_URL_KEY,
  SITE_META_DESCRIPTION_KEY,
  SITE_META_KEYWORDS_KEY,
  SITE_OG_IMAGE_URL_KEY,
  SITE_OG_SITE_NAME_KEY,
  SITE_TITLE_DEFAULT_KEY,
  SITE_TITLE_TEMPLATE_KEY,
} from "@/lib/admin/storeSettingsRegistry"

const SAFE_PATH = /^\/[A-Za-z0-9._\-/]+$/

export type SiteBranding = {
  titleDefault: string
  titleTemplate: string
  metaDescription: string
  metaKeywordsRaw: string
  ogSiteName: string
  faviconUrl: string
  ogImageUrl: string
}

const FALLBACK: SiteBranding = {
  titleDefault: "Little Mom's Store",
  titleTemplate: "%s | Little Mom's Store",
  metaDescription:
    "Anne ve bebek ürünleri, güvenilir alışveriş. Kıyafet, bakım, beslenme ve daha fazlası.",
  metaKeywordsRaw:
    "anne bebek, bebek giyim, çocuk giyim, bebek ürünleri, Little Mom's Store, online mağaza",
  ogSiteName: "Little Mom's Store",
  faviconUrl: "/logo.jpeg",
  ogImageUrl: "/logo.jpeg",
}

function safePath(p: string, fallback: string): string {
  const t = p.trim()
  return SAFE_PATH.test(t) ? t : fallback
}

function pick(
  map: Map<string, string>,
  key: string,
  fallback: string,
  opts?: { path?: boolean }
): string {
  const raw = map.get(key)?.trim()
  if (raw === undefined || raw === "") return fallback
  if (opts?.path) return safePath(raw, fallback)
  return raw
}

/**
 * Kök layout `generateMetadata` için site markası ve SEO alanları.
 */
export async function getSiteBrandingSettings(
  prisma: Pick<PrismaClient, "setting">
): Promise<SiteBranding> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [...SITE_BRANDING_SETTING_KEYS] } },
  })
  const map = new Map(rows.map((r) => [r.key, r.value]))

  const titleDefault = pick(map, SITE_TITLE_DEFAULT_KEY, FALLBACK.titleDefault)
  let titleTemplate = pick(map, SITE_TITLE_TEMPLATE_KEY, FALLBACK.titleTemplate)
  if (!titleTemplate.includes("%s")) {
    titleTemplate = FALLBACK.titleTemplate
  }

  const metaDescription = pick(map, SITE_META_DESCRIPTION_KEY, FALLBACK.metaDescription)
  const metaKeywordsRaw = pick(map, SITE_META_KEYWORDS_KEY, FALLBACK.metaKeywordsRaw)
  let ogSiteName = pick(map, SITE_OG_SITE_NAME_KEY, "")
  if (!ogSiteName) ogSiteName = titleDefault

  const faviconUrl = pick(map, SITE_FAVICON_URL_KEY, FALLBACK.faviconUrl, { path: true })
  const ogImageUrl = pick(map, SITE_OG_IMAGE_URL_KEY, FALLBACK.ogImageUrl, { path: true })

  return {
    titleDefault,
    titleTemplate,
    metaDescription,
    metaKeywordsRaw,
    ogSiteName,
    faviconUrl,
    ogImageUrl,
  }
}

export function siteKeywordsToArray(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

export function iconMimeTypeForPath(path: string): string | undefined {
  const p = path.toLowerCase()
  if (p.endsWith(".png")) return "image/png"
  if (p.endsWith(".ico")) return "image/x-icon"
  if (p.endsWith(".svg")) return "image/svg+xml"
  if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg"
  if (p.endsWith(".webp")) return "image/webp"
  return undefined
}
