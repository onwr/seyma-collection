import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import {
  getSmtpConfigForAdmin,
  persistSmtpSettings,
  type PersistSmtpInput,
  type SmtpEncryption,
} from "@/lib/smtpSettings"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

const encryptionSchema = z.enum(["none", "ssl", "tls"])

const putSchema = z.object({
  host: z.string().max(253),
  port: z.coerce.number().int().min(1).max(65535),
  encryption: encryptionSchema,
  user: z.string().max(500),
  password: z.string().max(500).optional(),
  fromEmail: z.union([z.literal(""), z.string().email()]),
  fromName: z.string().max(200),
  autoTls: z.boolean(),
  mailEnabled: z.boolean(),
})

export async function GET() {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })
    }

    const cfg = await getSmtpConfigForAdmin(prisma)
    return NextResponse.json(cfg)
  } catch (e) {
    console.error("GET /api/admin/smtp:", e)
    return NextResponse.json({ message: "Yüklenemedi." }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })
    }

    const json = await request.json()
    const parsed = putSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Geçersiz veri", issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const b = parsed.data
    const payload: PersistSmtpInput = {
      host: b.host,
      port: b.port,
      encryption: b.encryption as SmtpEncryption,
      user: b.user,
      fromEmail: b.fromEmail,
      fromName: b.fromName,
      autoTls: b.autoTls,
      mailEnabled: b.mailEnabled,
    }

    if (b.password !== undefined && b.password.length > 0) {
      payload.password = b.password
    }

    await persistSmtpSettings(prisma, payload)
    const cfg = await getSmtpConfigForAdmin(prisma)
    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.SMTP_SAVE,
      resourceType: "SMTP",
      metadata: {
        host: b.host,
        port: b.port,
        mailEnabled: b.mailEnabled,
        passwordUpdated: Boolean(b.password && b.password.length > 0),
      },
      request,
    })
    return NextResponse.json({ ok: true, ...cfg })
  } catch (e) {
    console.error("PUT /api/admin/smtp:", e)
    return NextResponse.json({ message: "Kaydedilemedi." }, { status: 500 })
  }
}
