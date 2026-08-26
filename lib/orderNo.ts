import { randomBytes } from "crypto"

/** Benzersiz sipariş numarası adayı (veritabanında tekil kontrolü gerekir). */
export function generateOrderNoCandidate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const rand = randomBytes(3).toString("hex").toUpperCase()
  return `LM${y}${m}${day}${rand}`
}
