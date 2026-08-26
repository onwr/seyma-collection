/** Bellek içi sınır; üretimde edge/Redis tercih edilir. */
type Bucket = { count: number; resetAt: number }

const ipBuckets = new Map<string, Bucket>()
const emailBuckets = new Map<string, Bucket>()

function allow(
  buckets: Map<string, Bucket>,
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (b.count >= maxRequests) {
    return false
  }
  b.count += 1
  return true
}

/** IP başına “şifremi unuttum” (ör. 8 / 15 dk). */
export function rateLimitForgotPasswordByIp(
  ip: string,
  maxRequests = 8,
  windowMs = 15 * 60_000
): boolean {
  return allow(ipBuckets, `ip:${ip}`, maxRequests, windowMs)
}

/** E-posta başına (normalize) — hesap yokken de sayılır, enumeration azaltır. */
export function rateLimitForgotPasswordByEmail(
  emailNormalized: string,
  maxRequests = 5,
  windowMs = 60 * 60_000
): boolean {
  return allow(emailBuckets, `em:${emailNormalized}`, maxRequests, windowMs)
}
