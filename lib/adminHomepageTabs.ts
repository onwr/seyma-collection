/** Anasayfa yönetimi sekmeleri — URL `?tab=` ile senkron */

export const HOME_TAB_KEYS = [
  "sliders",
  "banners",
  "categories",
  "products",
  "sections",
] as const

export type HomeTabKey = (typeof HOME_TAB_KEYS)[number]

export const HOME_TAB_LABELS: Record<HomeTabKey, string> = {
  sliders: "Sliderlar",
  banners: "Bannerlar",
  categories: "Vitrin kategorileri",
  products: "Ürün vitrini",
  sections: "Ürün bölümleri",
}

export const DEFAULT_HOME_TAB: HomeTabKey = "sliders"

export function isHomeTabKey(value: string | null | undefined): value is HomeTabKey {
  return !!value && (HOME_TAB_KEYS as readonly string[]).includes(value)
}

/** Geçersiz veya boş değerde varsayılan sekme döner */
export function parseHomeTabParam(tab: string | null | undefined): HomeTabKey {
  if (isHomeTabKey(tab)) return tab
  return DEFAULT_HOME_TAB
}

export function adminHomepageHref(tab: HomeTabKey): string {
  return `/admin/homepage?tab=${tab}`
}
