import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import {
  DEFAULT_HEADER_ANNOUNCEMENTS,
  HEADER_ANNOUNCEMENTS_KEY,
  normalizeAnnouncements,
} from "@/lib/headerAnnouncements"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

export async function GET() {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })
    }

    const row = await prisma.setting.findUnique({
      where: { key: HEADER_ANNOUNCEMENTS_KEY },
      select: { value: true },
    })

    if (!row?.value) {
      return NextResponse.json({ items: DEFAULT_HEADER_ANNOUNCEMENTS })
    }

    const parsed = normalizeAnnouncements(JSON.parse(row.value))
    return NextResponse.json({
      items: parsed.length > 0 ? parsed : DEFAULT_HEADER_ANNOUNCEMENTS,
    })
  } catch {
    return NextResponse.json({ message: "Hata" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })
    }

    const body = await request.json()
    const items = normalizeAnnouncements(body?.items)
    if (items.length === 0) {
      return NextResponse.json(
        { message: "En az bir duyuru girin." },
        { status: 400 }
      )
    }

    await prisma.setting.upsert({
      where: { key: HEADER_ANNOUNCEMENTS_KEY },
      update: { value: JSON.stringify(items), type: "json" },
      create: {
        key: HEADER_ANNOUNCEMENTS_KEY,
        value: JSON.stringify(items),
        type: "json",
      },
    })

    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.NAV_ANNOUNCEMENTS_SAVE,
      resourceType: "Settings",
      metadata: { count: items.length },
      request,
    })
    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ message: "Hata" }, { status: 500 })
  }
}
