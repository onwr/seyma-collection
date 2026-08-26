/** Tek instance / kısa süreli tekrar istekler için; prod’da Redis önerilir. */
type Entry = { body: string; expiresAt: number }

const store = new Map<string, Entry>()
const TTL_MS = 15 * 60 * 1000

export function getIdempotentResponse(key: string): string | null {
  const e = store.get(key)
  if (!e) return null
  if (Date.now() > e.expiresAt) {
    store.delete(key)
    return null
  }
  return e.body
}

export function setIdempotentResponse(key: string, jsonBody: string) {
  store.set(key, { body: jsonBody, expiresAt: Date.now() + TTL_MS })
}
