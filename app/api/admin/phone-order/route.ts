import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import {
  PHONE_ORDER_CALL_NUMBER_KEY,
  PHONE_ORDER_WHATSAPP_NUMBER_KEY,
  parseRegistryUpdate,
} from "@/lib/admin/storeSettingsRegistry"
import { getPhoneOrderSettings } from "@/lib/phoneOrderSettings"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

const digitsOrEmpty = z.string().regex(/^\d*$/, "Sadece rakam girin.").max(32)

const putSchema = z.object({
  whatsappNumber: digitsOrEmpty.optional(),
  callNumber: z.string().max(32).optional(),
})

export async function GET() {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })
    }
    const s = await getPhoneOrderSettings(prisma)
    return NextResponse.json(s)
  } catch (e) {
    console.error("GET /api/admin/phone-order:", e)
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

    const { whatsappNumber, callNumber } = parsed.data
    const updates: Array<{ key: string; raw: string }> = []
    if (whatsappNumber !== undefined) updates.push({ key: PHONE_ORDER_WHATSAPP_NUMBER_KEY, raw: whatsappNumber })
    if (callNumber !== undefined) updates.push({ key: PHONE_ORDER_CALL_NUMBER_KEY, raw: callNumber })

    for (const u of updates) {
      const result = parseRegistryUpdate(u.key, u.raw)
      if ("error" in result) {
        return NextResponse.json({ message: result.error }, { status: 400 })
      }
      await prisma.setting.upsert({
        where: { key: u.key },
        update: { value: result.value, type: result.dbType },
        create: { key: u.key, value: result.value, type: result.dbType },
      })
    }

    const s = await getPhoneOrderSettings(prisma)
    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.FOOTER_SOCIAL_SAVE,
      resourceType: "Settings",
      metadata: { keys: updates.map((u) => u.key) },
      request,
    })

    return NextResponse.json({ ok: true, ...s })
  } catch (e) {
    console.error("PUT /api/admin/phone-order:", e)
    return NextResponse.json({ message: "Kaydedilemedi." }, { status: 500 })
  }
}

