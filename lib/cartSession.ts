import { randomBytes } from "crypto"
import { cookies } from "next/headers"
import type { NextResponse } from "next/server"
import { verifyAccessToken } from "@/lib/jwt"

export const GUEST_CART_COOKIE = "cart_guest"

export function generateGuestToken(): string {
  return randomBytes(32).toString("hex")
}

export function guestCartCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  }
}

async function getAuthedUserId(): Promise<number | null> {
  const token = (await cookies()).get("token")?.value
  if (!token) return null
  const payload = verifyAccessToken(token)
  return payload?.userId ?? null
}

async function getGuestTokenFromCookie(): Promise<string | undefined> {
  return (await cookies()).get(GUEST_CART_COOKIE)?.value ?? undefined
}

/** Sepet işlemleri: giriş yapmış kullanıcı öncelikli; aksi halde misafir çerezi. */
export async function resolveCartIdentity(): Promise<
  | { kind: "user"; userId: number }
  | { kind: "guest"; guestToken: string }
  | { kind: "none" }
> {
  const userId = await getAuthedUserId()
  if (userId) {
    return { kind: "user", userId }
  }
  const guestToken = await getGuestTokenFromCookie()
  if (guestToken && /^[a-f0-9]{64}$/i.test(guestToken)) {
    return { kind: "guest", guestToken }
  }
  return { kind: "none" }
}

export function setGuestCartCookieOnResponse(res: NextResponse, token: string) {
  res.cookies.set(GUEST_CART_COOKIE, token, guestCartCookieOptions())
}

export function clearGuestCartCookieOnResponse(res: NextResponse) {
  res.cookies.set(GUEST_CART_COOKIE, "", {
    ...guestCartCookieOptions(),
    maxAge: 0,
  })
}
