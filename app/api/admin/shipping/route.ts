import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { getShippingSettings, persistShippingSettings } from "@/lib/shippingSettings"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

const putSchema = z.object({
  freeShippingThreshold: z.coerce.number().min(0).max(1_000_000),
  standardShippingCost: z.coerce.number().min(0).max(50_000),
})

export async function GET() {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }
    const s = await getShippingSettings(prisma)
    return NextResponse.json({
      freeShippingThreshold: s.threshold,
      standardShippingCost: s.cost,
    })
  } catch (e) {
    console.error("GET /api/admin/shipping:", e)
    return NextResponse.json({ message: "Ayarlar yüklenemedi." }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    const json = await request.json()
    const parsed = putSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Geçersiz veri", issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { freeShippingThreshold, standardShippingCost } = parsed.data
    await persistShippingSettings(prisma, {
      threshold: freeShippingThreshold,
      cost: standardShippingCost,
    })

    const s = await getShippingSettings(prisma)
    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.SHIPPING_SAVE,
      resourceType: "Settings",
      metadata: {
        freeShippingThreshold: s.threshold,
        standardShippingCost: s.cost,
      },
      request,
    })
    return NextResponse.json({
      ok: true,
      freeShippingThreshold: s.threshold,
      standardShippingCost: s.cost,
    })
  } catch (e) {
    console.error("PUT /api/admin/shipping:", e)
    return NextResponse.json({ message: "Kaydedilemedi." }, { status: 500 })
  }
}
