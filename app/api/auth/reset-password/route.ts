import bcrypt from "bcrypt"
import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { hashPasswordResetToken } from "@/lib/passwordResetCrypto"

const bodySchema = z.object({
  token: z.string().min(32).max(128),
  password: z.string().min(6).max(200),
})

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Geçersiz token veya şifre (en az 6 karakter)." },
        { status: 400 }
      )
    }

    const { token, password } = parsed.data
    const tokenHash = hashPasswordResetToken(token.trim())

    const row = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, userId: true },
    })

    if (!row) {
      return NextResponse.json(
        { message: "Bağlantı geçersiz veya süresi dolmuş. Yeni şifre sıfırlama isteği gönderin." },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { userId: row.userId, id: { not: row.id } },
      }),
    ])

    return NextResponse.json({ message: "Şifreniz güncellendi. Giriş yapabilirsiniz." })
  } catch (e) {
    console.error("POST /api/auth/reset-password:", e)
    return NextResponse.json({ message: "İşlem tamamlanamadı." }, { status: 500 })
  }
}
