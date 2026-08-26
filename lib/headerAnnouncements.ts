export const HEADER_ANNOUNCEMENTS_KEY = "HEADER_ANNOUNCEMENTS"

export const DEFAULT_HEADER_ANNOUNCEMENTS = [
  "500 TL ve uzeri siparislerde ucretsiz kargo",
  "Yeni sezon urunleri simdi yayinda",
  "Hediye paketleme secenegi mevcut",
  "Guvenli odeme ve hizli teslimat",
]

export function normalizeAnnouncements(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return input
    .map((v) => String(v ?? "").trim())
    .filter((v) => v.length > 0)
}
