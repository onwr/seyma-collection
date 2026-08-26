import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import {
  FOOTER_SOCIAL_FACEBOOK_URL_KEY,
  FOOTER_SOCIAL_GOOGLE_URL_KEY,
  FOOTER_SOCIAL_INSTAGRAM_URL_KEY,
  FOOTER_SOCIAL_TWITTER_URL_KEY,
  FOOTER_SOCIAL_YOUTUBE_URL_KEY,
  parseRegistryUpdate,
} from "@/lib/admin/storeSettingsRegistry"
import { getFooterSocialUrls, type FooterSocialUrls } from "@/lib/footerSocialSettings"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

const optionalUrl = z.union([z.literal(""), z.string().url().max(500)])

const putSchema = z.object({
  facebook: optionalUrl.optional(),
  twitter: optionalUrl.optional(),
  instagram: optionalUrl.optional(),
  youtube: optionalUrl.optional(),
  google: optionalUrl.optional(),
})

const FIELD_TO_KEY: Record<keyof FooterSocialUrls, string> = {
  facebook: FOOTER_SOCIAL_FACEBOOK_URL_KEY,
  twitter: FOOTER_SOCIAL_TWITTER_URL_KEY,
  instagram: FOOTER_SOCIAL_INSTAGRAM_URL_KEY,
  youtube: FOOTER_SOCIAL_YOUTUBE_URL_KEY,
  google: FOOTER_SOCIAL_GOOGLE_URL_KEY,
}

export async function GET() {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })
    }
    const urls = await getFooterSocialUrls(prisma)
    return NextResponse.json(urls)
  } catch (e) {
    console.error("GET /api/admin/footer-social:", e)
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

    const data = parsed.data
    const entries = Object.entries(data).filter(([, v]) => v !== undefined) as [
      keyof FooterSocialUrls,
      string,
    ][]

    for (const [field, raw] of entries) {
      const key = FIELD_TO_KEY[field]
      const result = parseRegistryUpdate(key, raw)
      if ("error" in result) {
        return NextResponse.json({ message: result.error }, { status: 400 })
      }
      await prisma.setting.upsert({
        where: { key },
        update: { value: result.value, type: result.dbType },
        create: { key, value: result.value, type: result.dbType },
      })
    }

    const urls = await getFooterSocialUrls(prisma)
    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.FOOTER_SOCIAL_SAVE,
      resourceType: "Settings",
      metadata: { fields: entries.map(([k]) => k) },
      request,
    })
    return NextResponse.json({ ok: true, ...urls })
  } catch (e) {
    console.error("PUT /api/admin/footer-social:", e)
    return NextResponse.json({ message: "Kaydedilemedi." }, { status: 500 })
  }
}
