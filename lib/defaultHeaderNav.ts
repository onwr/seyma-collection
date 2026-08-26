/** Üst header menüsü — DB boş / API hata durumunda yedek; seed ile uyumlu alanlar */
export type DefaultHeaderNavRow = {
  label: string
  href: string
  labelUppercase: boolean
  sortOrder: number
  isActive: boolean
  openInNewTab: boolean
}

export const DEFAULT_HEADER_NAV_ITEMS: DefaultHeaderNavRow[] = [
  { label: "ANASAYFA", href: "/", labelUppercase: false, sortOrder: 0, isActive: true, openInNewTab: false },
  { label: "Erkek Bebek", href: "/categories/erkek-bebek", labelUppercase: true, sortOrder: 1, isActive: true, openInNewTab: false },
  { label: "Kız Bebek 0-5 Yaş", href: "/categories/kiz-bebek", labelUppercase: true, sortOrder: 2, isActive: true, openInNewTab: false },
  { label: "Erkek Çocuk 0-5 Yaş", href: "/categories/erkek-cocuk", labelUppercase: true, sortOrder: 3, isActive: true, openInNewTab: false },
  { label: "Kız Çocuk 2-15 Yaş", href: "/categories/kiz-cocuk", labelUppercase: true, sortOrder: 4, isActive: true, openInNewTab: false },
  { label: "Aksesuar", href: "/categories/anne-bebek", labelUppercase: true, sortOrder: 5, isActive: true, openInNewTab: false },
]
