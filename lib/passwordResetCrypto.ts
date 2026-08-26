import { createHash, randomBytes } from "node:crypto"

/** URL’de taşınan ham token (64 hex karakter). */
export function generatePasswordResetRawToken(): string {
  return randomBytes(32).toString("hex")
}

export function hashPasswordResetToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex")
}
