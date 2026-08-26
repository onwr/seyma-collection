import type { PrismaClient } from "../generated/prisma/client"
import {
  FOOTER_SOCIAL_SETTING_KEYS,
  FOOTER_SOCIAL_FACEBOOK_URL_KEY,
  FOOTER_SOCIAL_TWITTER_URL_KEY,
  FOOTER_SOCIAL_INSTAGRAM_URL_KEY,
  FOOTER_SOCIAL_YOUTUBE_URL_KEY,
  FOOTER_SOCIAL_GOOGLE_URL_KEY,
} from "@/lib/admin/storeSettingsRegistry"

/** Panel veya DB yokken footer’da kullanılan varsayılan adresler. */
export const FOOTER_SOCIAL_FALLBACK: FooterSocialUrls = {
  facebook: "https://facebook.com",
  twitter: "https://twitter.com",
  instagram: "https://instagram.com",
  youtube: "https://youtube.com",
  google: "https://google.com",
}

export type FooterSocialUrls = {
  facebook: string
  twitter: string
  instagram: string
  youtube: string
  google: string
}

const KEY_TO_FIELD: Record<(typeof FOOTER_SOCIAL_SETTING_KEYS)[number], keyof FooterSocialUrls> = {
  [FOOTER_SOCIAL_FACEBOOK_URL_KEY]: "facebook",
  [FOOTER_SOCIAL_TWITTER_URL_KEY]: "twitter",
  [FOOTER_SOCIAL_INSTAGRAM_URL_KEY]: "instagram",
  [FOOTER_SOCIAL_YOUTUBE_URL_KEY]: "youtube",
  [FOOTER_SOCIAL_GOOGLE_URL_KEY]: "google",
}

/** Ayar satırı yoksa `FOOTER_SOCIAL_FALLBACK`; varsa (boş string dahil) DB değeri kullanılır. */
export async function getFooterSocialUrls(db: PrismaClient): Promise<FooterSocialUrls> {
  const out: FooterSocialUrls = { ...FOOTER_SOCIAL_FALLBACK }

  try {
    const rows = await db.setting.findMany({
      where: { key: { in: [...FOOTER_SOCIAL_SETTING_KEYS] } },
      select: { key: true, value: true },
    })
    const map = new Map(rows.map((r) => [r.key, r.value.trim()]))

    for (const key of FOOTER_SOCIAL_SETTING_KEYS) {
      const field = KEY_TO_FIELD[key]
      if (map.has(key)) {
        out[field] = map.get(key)!
      }
    }
  } catch {
    return { ...FOOTER_SOCIAL_FALLBACK }
  }

  return out
}
