import bcrypt from "bcrypt"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { signAccessToken } from "@/lib/jwt"

type RegisterBody = {
  name?: string
  email?: string
  password?: string
  phone?: string
  city?: string
  district?: string
  neighborhood?: string
  doorNo?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody
    const name = body.name?.trim()
    const email = body.email?.trim().toLowerCase()
    const password = body.password
    const phone = body.phone?.trim() || null
    
    // Address fields
    const city = body.city?.trim()
    const district = body.district?.trim()
    const neighborhood = body.neighborhood?.trim()
    const doorNo = body.doorNo?.trim()

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Ad, e-posta ve şifre alanları zorunludur." },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Şifre en az 6 karakter olmalıdır." },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existingUser) {
      return NextResponse.json(
        { message: "Bu e-posta ile kayıtlı kullanıcı zaten var." },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        addresses: (city && district) ? {
          create: {
            title: "Varsayılan Adres",
            fullName: name,
            phone: phone || "",
            city: city,
            district: district,
            line1: `${neighborhood || ""} No: ${doorNo || ""}`.trim() || "Belirtilmedi",
            postalCode: "00000",
            country: "TR",
            isDefault: true
          }
        } : undefined
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    // Generate token for auto-login
    const token = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    const response = NextResponse.json(
      { message: "Kayıt başarılı ve giriş yapıldı.", user },
      { status: 201 }
    )

    // Set cookie
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    })

    return response
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json(
      { message: "Kayıt sırasında beklenmeyen bir hata oluştu." },
      { status: 500 }
    )
  }
}
