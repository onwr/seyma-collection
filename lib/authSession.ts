import { cookies } from "next/headers"
import { verifyAccessToken } from "@/lib/jwt"

/** API route ve sunucu bileşenlerinde JWT çerezinden kullanıcı id. */
export async function getUserIdFromCookies(): Promise<number | null> {
  const session = await getSessionFromCookies()
  return session?.userId ?? null
}

export async function getSessionFromCookies(): Promise<{ userId: number, email: string, role: string } | null> {
  const token = (await cookies()).get("token")?.value
  if (!token) return null
  return verifyAccessToken(token)
}
