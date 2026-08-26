import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

/**
 * Genel güvenlik başlıkları. Checkout hız sınırı API route içinde uygulanır.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host")

  // www to non-www redirect
  if (host === "www.littlemomstore.com") {
    return NextResponse.redirect(
      new URL(request.nextUrl.pathname + request.nextUrl.search, "https://littlemomstore.com"),
      301
    )
  }

  const res = NextResponse.next()
  res.headers.set("X-Content-Type-Options", "nosniff")
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
