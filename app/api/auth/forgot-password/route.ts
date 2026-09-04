import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { passwordResetEmailContent } from "@/lib/emails/passwordReset"
import { rateLimitForgotPasswordByEmail, rateLimitForgotPasswordByIp } from "@/lib/forgotPasswordRateLimit"
import { generatePasswordResetRawToken, hashPasswordResetToken } from "@/lib/passwordResetCrypto"
import { getClientIp } from "@/lib/checkoutRateLimit"
import { sendMail } from "@/lib/smtpSettings"

const bodySchema = z.object({
  email: z.string().trim().email(),
})

const PUBLIC_MESSAGE =
  "E-posta adresiniz sistemde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi."

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    if (!rateLimitForgotPasswordByIp(ip)) {
      return NextResponse.json(
        { message: "Çok fazla istek. Lütfen bir süre sonra tekrar deneyin." },
        { status: 429 }
      )
    }

    const json = await request.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ message: "Geçerli bir e-posta girin." }, { status: 400 })
    }

    const email = parsed.data.email.toLowerCase()

    if (!rateLimitForgotPasswordByEmail(email)) {
      return NextResponse.json({ message: PUBLIC_MESSAGE })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, isActive: true },
    })

    if (!user || !user.isActive) {
      return NextResponse.json({ message: PUBLIC_MESSAGE })
    }

    const rawToken = generatePasswordResetRawToken()
    const tokenHash = hashPasswordResetToken(rawToken)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
    ])

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.seymacollection.com"
    const { subject, text, html } = passwordResetEmailContent({
      siteUrl,
      token: rawToken,
    })

    try {
      await sendMail(prisma, { to: user.email, subject, text, html })
    } catch (e) {
      console.error("forgot-password sendMail:", e)
    }

    return NextResponse.json({ message: PUBLIC_MESSAGE })
  } catch (e) {
    console.error("POST /api/auth/forgot-password:", e)
    return NextResponse.json({ message: "İşlem tamamlanamadı." }, { status: 500 })
  }
}
