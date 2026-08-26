import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  HEADER_ANNOUNCEMENTS_KEY,
  normalizeAnnouncements,
} from "@/lib/headerAnnouncements"

export async function GET() {
  try {
    const row = await prisma.setting.findUnique({
      where: { key: HEADER_ANNOUNCEMENTS_KEY },
      select: { value: true },
    })

    if (!row?.value) return NextResponse.json({ items: [] })

    const parsed = normalizeAnnouncements(JSON.parse(row.value))
    return NextResponse.json({ items: parsed })
  } catch {
    return NextResponse.json({ items: [] })
  }
}
