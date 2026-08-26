import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
    const rows = await prisma.headerNavItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    })
    const items = rows.map((row) => ({
      id: row.id,
      label: row.label,
      href: row.href,
      labelUppercase: row.labelUppercase,
      openInNewTab: row.openInNewTab,
      sortOrder: row.sortOrder,
      children: parseChildren((row as { childrenJson?: string | null }).childrenJson ?? null),
    }))

    const res = NextResponse.json({ items })
    res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120")
    return res
  } catch {
    return NextResponse.json({ items: [] }, { status: 200 })
  }
}
