import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { headerNavItemBodySchema } from "@/lib/navigationSchemas"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

function parseChildren(childrenJson: string | null) {
  if (!childrenJson) return []
  try {
    const parsed = JSON.parse(childrenJson)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function GET() {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })
    }

    const rows = await prisma.headerNavItem.findMany({
      orderBy: { sortOrder: "asc" },
    })
    const items = rows.map((row) => ({
      ...row,
      children: parseChildren(row.childrenJson),
    }))
    return NextResponse.json(items)
  } catch {
    return NextResponse.json({ message: "Hata" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })
    }

    const json = await request.json()
    const parsed = headerNavItemBodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const row = await prisma.headerNavItem.create({
      data: {
        label: parsed.data.label,
        href: parsed.data.href,
        labelUppercase: parsed.data.labelUppercase,
        sortOrder: parsed.data.sortOrder,
        isActive: parsed.data.isActive,
        openInNewTab: parsed.data.openInNewTab,
        childrenJson: parsed.data.children.length
          ? JSON.stringify(parsed.data.children)
          : null,
      },
    })
    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.NAV_ITEM_CREATE,
      resourceType: "HeaderNavItem",
      resourceId: String(row.id),
      metadata: { label: row.label, href: row.href },
      request,
    })
    return NextResponse.json({
      ...row,
      children: parseChildren(row.childrenJson),
    })
  } catch {
    return NextResponse.json({ message: "Hata" }, { status: 500 })
  }
}
