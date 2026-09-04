import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import {
  getPaytrConfigForAdmin,
  persistPaytrSettings,
  type PersistPaytrInput,
} from "@/lib/paytrSettings"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

const putSchema = z.object({
  merchantId: z.string().max(100),
  merchantKey: z.string().max(200).optional(),
  merchantSalt: z.string().max(200).optional(),
  testMode: z.boolean(),
})

export async function GET() {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })
    }

    const cfg = await getPaytrConfigForAdmin(prisma)
    return NextResponse.json(cfg)
  } catch (e) {
    console.error("GET /api/admin/paytr:", e)
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
    const payload: PersistPaytrInput = {
      merchantId: b.merchantId,
      testMode: b.testMode,
    }
    if (b.merchantKey !== undefined && b.merchantKey.length > 0) {
      payload.merchantKey = b.merchantKey
    }
    if (b.merchantSalt !== undefined && b.merchantSalt.length > 0) {
      payload.merchantSalt = b.merchantSalt
    }

    await persistPaytrSettings(prisma, payload)
    const cfg = await getPaytrConfigForAdmin(prisma)
    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.PAYTR_SAVE,
      resourceType: "PAYTR",
      metadata: {
        merchantId: b.merchantId,
        testMode: b.testMode,
        merchantKeyUpdated: Boolean(b.merchantKey && b.merchantKey.length > 0),
        merchantSaltUpdated: Boolean(b.merchantSalt && b.merchantSalt.length > 0),
      },
      request,
    })
    return NextResponse.json({ ok: true, ...cfg })
  } catch (e) {
    console.error("PUT /api/admin/paytr:", e)
    return NextResponse.json({ message: "Kaydedilemedi." }, { status: 500 })
  }
}
