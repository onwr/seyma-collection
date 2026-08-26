import bcrypt from "bcrypt"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { clearGuestCartCookieOnResponse, GUEST_CART_COOKIE } from "@/lib/cartSession"
import { signAccessToken } from "@/lib/jwt"
import { mergeGuestCartIntoUserCart } from "@/lib/mergeGuestCart"
import { prisma } from "@/lib/prisma"

type LoginBody = {
  email?: string
  password?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody
    const email = body.email?.trim().toLowerCase()
    const password = body.password

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email ve şifre alanları zorunludur." },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        isActive: true,
        emailVerified: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { message: "E-posta veya sifre hatali." },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { message: "Kullanici hesabi pasif durumda." },
        { status: 403 }
      )
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "E-posta veya sifre hatali." },
        { status: 401 }
      )
    }

    const token = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    const guestToken = (await cookies()).get(GUEST_CART_COOKIE)?.value
    let guestCartMerged = false
    if (guestToken && /^[a-f0-9]{64}$/i.test(guestToken)) {
      try {
        await mergeGuestCartIntoUserCart(prisma, user.id, guestToken)
        guestCartMerged = true
      } catch (mergeError) {
        console.error("Guest cart merge error:", mergeError)
      }
    }

    const response = NextResponse.json(
      {
        message: "Giris basarili.",
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
        },
      },
      { status: 200 }
    )

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })

    if (guestCartMerged) {
      clearGuestCartCookieOnResponse(response)
    }

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { message: "Giris sirasinda beklenmeyen bir hata olustu." },
      { status: 500 }
    )
  }
}
