import { z } from "zod"
import {
  DEFAULT_FREE_SHIPPING_THRESHOLD,
  DEFAULT_STANDARD_SHIPPING_COST,
  FREE_SHIPPING_THRESHOLD_KEY,
  STANDARD_SHIPPING_COST_KEY,
} from "@/lib/shippingSettings"

export const SITE_TITLE_DEFAULT_KEY = "SITE_TITLE_DEFAULT"
export const SITE_TITLE_TEMPLATE_KEY = "SITE_TITLE_TEMPLATE"
export const SITE_META_DESCRIPTION_KEY = "SITE_META_DESCRIPTION"
export const SITE_META_KEYWORDS_KEY = "SITE_META_KEYWORDS"
export const SITE_OG_SITE_NAME_KEY = "SITE_OG_SITE_NAME"
export const SITE_FAVICON_URL_KEY = "SITE_FAVICON_URL"
export const SITE_OG_IMAGE_URL_KEY = "SITE_OG_IMAGE_URL"

export const FOOTER_SOCIAL_FACEBOOK_URL_KEY = "FOOTER_SOCIAL_FACEBOOK_URL"
export const FOOTER_SOCIAL_TWITTER_URL_KEY = "FOOTER_SOCIAL_TWITTER_URL"
export const FOOTER_SOCIAL_INSTAGRAM_URL_KEY = "FOOTER_SOCIAL_INSTAGRAM_URL"
export const FOOTER_SOCIAL_YOUTUBE_URL_KEY = "FOOTER_SOCIAL_YOUTUBE_URL"
export const FOOTER_SOCIAL_GOOGLE_URL_KEY = "FOOTER_SOCIAL_GOOGLE_URL"

export const PHONE_ORDER_WHATSAPP_NUMBER_KEY = "PHONE_ORDER_WHATSAPP_NUMBER"
export const PHONE_ORDER_CALL_NUMBER_KEY = "PHONE_ORDER_CALL_NUMBER"

/** Footer ikonları için tam URL ayarları (boş = ikon gizlenir). */
export const FOOTER_SOCIAL_SETTING_KEYS = [
  FOOTER_SOCIAL_FACEBOOK_URL_KEY,
  FOOTER_SOCIAL_TWITTER_URL_KEY,
  FOOTER_SOCIAL_INSTAGRAM_URL_KEY,
  FOOTER_SOCIAL_YOUTUBE_URL_KEY,
  FOOTER_SOCIAL_GOOGLE_URL_KEY,
] as const

/** Kök `generateMetadata` ve admin site sekmesi için. */
export const SITE_BRANDING_SETTING_KEYS = [
  SITE_TITLE_DEFAULT_KEY,
  SITE_TITLE_TEMPLATE_KEY,
  SITE_META_DESCRIPTION_KEY,
  SITE_META_KEYWORDS_KEY,
  SITE_OG_SITE_NAME_KEY,
  SITE_FAVICON_URL_KEY,
  SITE_OG_IMAGE_URL_KEY,
] as const

export type StoreSettingGroup = "site" | "shipping" | "general" | "footer"

export const STORE_SETTING_GROUP_LABELS: Record<StoreSettingGroup, string> = {
  site: "Site ve SEO",
  shipping: "Kargo ve teslimat",
  general: "Genel mağaza",
  footer: "Footer",
}

type RegistryNumberEntry = {
  key: string
  group: StoreSettingGroup
  valueType: "number"
  label: string
  description: string
  min: number
  max: number
  /** DB `Setting.type` */
  dbType: "number"
  defaultValue: number
}

type RegistryStringEntry = {
  key: string
  group: StoreSettingGroup
  valueType: "string"
  label: string
  description: string
  maxLength: number
  dbType: "string"
  defaultValue: string
  /** plain: serbest metin; relativePath: / ile başlayan güvenli yol; titleTemplate: içinde %s zorunlu; httpUrl: boş veya geçerli http(s) URL */
  stringKind?: "plain" | "relativePath" | "titleTemplate" | "httpUrl"
}

export type StoreSettingsRegistryEntry = RegistryNumberEntry | RegistryStringEntry

/**
 * Kodda tanımlı mağaza ayarları. Yeni anahtar: buraya + okuyan uygulama kodu + (isteğe bağlı) seed.
 */
export const STORE_SETTINGS_REGISTRY: StoreSettingsRegistryEntry[] = [
  {
    key: SITE_TITLE_DEFAULT_KEY,
    group: "site",
    valueType: "string",
    label: "Site başlığı (varsayılan)",
    description: "Ana sayfa ve şablon kullanılmayan sayfalarda görünen tarayıcı başlığı.",
    maxLength: 120,
    dbType: "string",
    defaultValue: "Şeyma Collection",
    stringKind: "plain",
  },
  {
    key: SITE_TITLE_TEMPLATE_KEY,
    group: "site",
    valueType: "string",
    label: "Başlık şablonu",
    description: "Alt sayfalar için; mutlaka %s içermeli (sayfa başlığı yerine geçer). Örn: %s | Mağaza",
    maxLength: 120,
    dbType: "string",
    defaultValue: "%s | Şeyma Collection",
    stringKind: "titleTemplate",
  },
  {
    key: SITE_META_DESCRIPTION_KEY,
    group: "site",
    valueType: "string",
    label: "Meta açıklama",
    description: "Arama ve sosyal paylaşımlarda kullanılan kısa site açıklaması.",
    maxLength: 320,
    dbType: "string",
    defaultValue:
      "Anne ve bebek ürünleri, güvenilir alışveriş. Kıyafet, bakım, beslenme ve daha fazlası.",
    stringKind: "plain",
  },
  {
    key: SITE_META_KEYWORDS_KEY,
    group: "site",
    valueType: "string",
    label: "Anahtar kelimeler",
    description: "Virgülle ayırın (örn: anne bebek, online mağaza).",
    maxLength: 500,
    dbType: "string",
    defaultValue:
      "anne bebek, bebek giyim, çocuk giyim, bebek ürünleri, Şeyma Collection, online mağaza",
    stringKind: "plain",
  },
  {
    key: SITE_OG_SITE_NAME_KEY,
    group: "site",
    valueType: "string",
    label: "Open Graph site adı",
    description: "Boş bırakılırsa varsayılan site başlığı kullanılır. Yazar / yayıncı meta alanlarında da kullanılır.",
    maxLength: 120,
    dbType: "string",
    defaultValue: "Şeyma Collection",
    stringKind: "plain",
  },
  {
    key: SITE_FAVICON_URL_KEY,
    group: "site",
    valueType: "string",
    label: "Favicon ve kısayol ikonu (yol)",
    description: "Site köküne göre yol, örn: /logo.jpeg veya /uploads/...",
    maxLength: 200,
    dbType: "string",
    defaultValue: "/logo.jpeg",
    stringKind: "relativePath",
  },
  {
    key: SITE_OG_IMAGE_URL_KEY,
    group: "site",
    valueType: "string",
    label: "Open Graph / Twitter görseli (yol)",
    description: "Paylaşım önizlemesi için görsel; önerilen en-boy oranı yaklaşık 1200×630.",
    maxLength: 200,
    dbType: "string",
    defaultValue: "/logo.jpeg",
    stringKind: "relativePath",
  },
  {
    key: FREE_SHIPPING_THRESHOLD_KEY,
    group: "shipping",
    valueType: "number",
    label: "Ücretsiz kargo eşiği",
    description:
      "Ara toplam (indirim öncesi) bu tutara eşit veya üzerindeyse kargo ücreti uygulanmaz.",
    min: 0,
    max: 1_000_000,
    dbType: "number",
    defaultValue: DEFAULT_FREE_SHIPPING_THRESHOLD,
  },
  {
    key: STANDARD_SHIPPING_COST_KEY,
    group: "shipping",
    valueType: "number",
    label: "Standart kargo ücreti",
    description: "Eşik altı sepetlerde eklenen sabit kargo tutarı (₺).",
    min: 0,
    max: 50_000,
    dbType: "number",
    defaultValue: DEFAULT_STANDARD_SHIPPING_COST,
  },
  {
    key: FOOTER_SOCIAL_FACEBOOK_URL_KEY,
    group: "footer",
    valueType: "string",
    label: "Facebook URL",
    description: "Footer’daki Facebook ikonunun bağlantısı. Boş bırakırsanız ikon gösterilmez.",
    maxLength: 500,
    dbType: "string",
    defaultValue: "",
    stringKind: "httpUrl",
  },
  {
    key: FOOTER_SOCIAL_TWITTER_URL_KEY,
    group: "footer",
    valueType: "string",
    label: "X (Twitter) URL",
    description: "Footer’daki X ikonunun bağlantısı.",
    maxLength: 500,
    dbType: "string",
    defaultValue: "",
    stringKind: "httpUrl",
  },
  {
    key: FOOTER_SOCIAL_INSTAGRAM_URL_KEY,
    group: "footer",
    valueType: "string",
    label: "Instagram URL",
    description: "Footer’daki Instagram ikonunun bağlantısı.",
    maxLength: 500,
    dbType: "string",
    defaultValue: "",
    stringKind: "httpUrl",
  },
  {
    key: FOOTER_SOCIAL_YOUTUBE_URL_KEY,
    group: "footer",
    valueType: "string",
    label: "YouTube URL",
    description: "Footer’daki YouTube ikonunun bağlantısı.",
    maxLength: 500,
    dbType: "string",
    defaultValue: "",
    stringKind: "httpUrl",
  },
  {
    key: FOOTER_SOCIAL_GOOGLE_URL_KEY,
    group: "footer",
    valueType: "string",
    label: "Google URL",
    description: "Footer’daki Google ikonunun bağlantısı (ör. işletme profili).",
    maxLength: 500,
    dbType: "string",
    defaultValue: "",
    stringKind: "httpUrl",
  },
  {
    key: PHONE_ORDER_WHATSAPP_NUMBER_KEY,
    group: "general",
    valueType: "string",
    label: "WhatsApp sipariş numarası",
    description:
      "WhatsApp mesajı için kullanılacak numara (sadece rakam). Örn: 90555XXXXXXX. Boş bırakabilirsiniz.",
    maxLength: 32,
    dbType: "string",
    defaultValue: "",
    stringKind: "plain",
  },
  {
    key: PHONE_ORDER_CALL_NUMBER_KEY,
    group: "general",
    valueType: "string",
    label: "Telefonla sipariş (arama) numarası",
    description:
      "Ara butonu için kullanılacak tel numarası. Örn: +90555XXXXXXX veya 90555XXXXXXX. Boş bırakabilirsiniz.",
    maxLength: 32,
    dbType: "string",
    defaultValue: "",
    stringKind: "plain",
  },
]

const registryByKey = new Map(STORE_SETTINGS_REGISTRY.map((e) => [e.key, e]))

export function getRegistryKeys(): string[] {
  return STORE_SETTINGS_REGISTRY.map((e) => e.key)
}

export function getRegistryEntry(key: string): StoreSettingsRegistryEntry | undefined {
  return registryByKey.get(key)
}

export function defaultValueString(entry: StoreSettingsRegistryEntry): string {
  return String(entry.defaultValue)
}

/** Ham değeri registry kurallarına göre doğrular; saklanacak string ve DB tipini döner. */
export function parseRegistryUpdate(
  key: string,
  raw: unknown
): { value: string; dbType: string } | { error: string } {
  const entry = registryByKey.get(key)
  if (!entry) {
    return { error: "Bilinmeyen ayar anahtarı." }
  }
  if (entry.valueType === "number") {
    const n = z.coerce.number().min(entry.min).max(entry.max).safeParse(raw)
    if (!n.success) {
      return { error: n.error.flatten().formErrors.join(", ") || "Geçersiz sayı." }
    }
    return { value: String(n.data), dbType: entry.dbType }
  }

  const base = z
    .string()
    .max(entry.maxLength)
    .safeParse(raw === null || raw === undefined ? "" : String(raw))
  if (!base.success) {
    return { error: base.error.flatten().formErrors.join(", ") || "Geçersiz metin." }
  }

  let val = base.data.trim()
  const kind = entry.stringKind ?? "plain"

  if (kind === "relativePath") {
    const r = z
      .string()
      .min(2)
      .max(entry.maxLength)
      .regex(
        /^\/[A-Za-z0-9._\-/]+$/,
        "Yol / ile başlamalı ve yalnızca harf, rakam, . _ - / içermeli."
      )
      .safeParse(val)
    if (!r.success) {
      return { error: r.error.flatten().formErrors.join(", ") || "Geçersiz yol." }
    }
    val = r.data
  } else if (kind === "titleTemplate") {
    const r = z
      .string()
      .min(3)
      .max(entry.maxLength)
      .refine((s) => s.includes("%s"), "Şablonda %s olmalı (sayfa başlığı yer tutucusu).")
      .safeParse(val)
    if (!r.success) {
      return { error: r.error.flatten().formErrors.join(", ") || "Geçersiz şablon." }
    }
    val = r.data
  } else if (kind === "httpUrl") {
    if (!val) {
      return { value: "", dbType: entry.dbType }
    }
    const r = z.string().url().max(entry.maxLength).safeParse(val)
    if (!r.success) {
      return { error: "Geçerli bir http veya https adresi girin veya alanı boş bırakın." }
    }
    val = r.data
  }

  return { value: val, dbType: entry.dbType }
}
