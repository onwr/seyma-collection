/**
 * WordPress / panellerde bazen `ssl://smtp.example.com` gibi girilir; DNS yalnızca hostname ister.
 */
export function normalizeSmtpHost(raw: string): string {
  let h = raw.trim().replace(/\/+$/, "")
  const stripped = h.replace(/^(?:ssl|tls|https?|smtp):\/\//i, "")
  if (stripped !== h) h = stripped
  return h.trim().replace(/\/+$/, "")
}
