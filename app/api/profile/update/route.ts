import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { verifyAccessToken } from "@/lib/jwt"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: Request) {
  try {
    const token = (await cookies()).get("token")?.value
    if (!token) {
      return NextResponse.json({ message: "Oturum açmanız gerekiyor." }, { status: 401 })
    }

    const payload = verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json({ message: "Oturum geçersiz." }, { status: 401 })
    }

    const body = await request.json()
    const { name, phone } = body

    if (!name) {
      return NextResponse.json({ message: "İsim alanı boş bırakılamaz." }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: {
        name,
        phone: phone || null
      }
    })

    return NextResponse.json({
      message: "Profil başarıyla güncellendi.",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone
      }
    })
  } catch (error) {
    console.error("Profile Update Error:", error)
    return NextResponse.json({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 })
  }
}
