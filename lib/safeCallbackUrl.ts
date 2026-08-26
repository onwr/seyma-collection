/**
 * Açık yönlendirme riski olmadan sadece site içi path kabul eder.
 * Varsayılan: `/cart`
 */
export function sanitizePostAuthPath(raw: string | null | undefined, fallback = "/cart"): string {
  if (!raw || typeof raw !== "string") return fallback
  const t = raw.trim()
  if (t.length < 2 || t.length > 512) return fallback
  if (!t.startsWith("/") || t.startsWith("//")) return fallback
  if (t.startsWith("/api")) return fallback
  return t
}

/** Güvenli site-içi path ile `/register?callbackUrl=...` üretir. */
export function registerHrefWithCallbackUrl(
  rawCallbackPath: string | null | undefined,
  fallback = "/cart"
): string {
  const path = sanitizePostAuthPath(rawCallbackPath, fallback)
  return `/register?callbackUrl=${encodeURIComponent(path)}`
}
