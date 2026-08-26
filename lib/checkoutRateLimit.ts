/** IP başına sabit pencerede istek sınırı (bellek içi; prod’da edge/Redis). */
type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export function rateLimitCheckout(
  ip: string,
  maxRequests = 12,
  windowMs = 60_000
): boolean {
  const now = Date.now()
  const b = buckets.get(ip)
  if (!b || now > b.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (b.count >= maxRequests) {
    return false
  }
  b.count += 1
  return true
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp.trim()
  return "unknown"
}
