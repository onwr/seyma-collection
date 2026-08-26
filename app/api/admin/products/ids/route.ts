import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { buildProductListWhere } from "@/lib/productListWhere"

const MAX_IDS = 10_000

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const where = buildProductListWhere({
      search: searchParams.get("search"),
      categoryId: searchParams.get("categoryId"),
      active: searchParams.get("active"),
      featured: searchParams.get("featured"),
      stockFilter: searchParams.get("stockFilter"),
    })

    const total = await prisma.product.count({ where })
    const rows = await prisma.product.findMany({
      where,
      select: { id: true },
      take: MAX_IDS,
      orderBy: { id: "asc" },
    })

    const ids = rows.map((r) => r.id)
    const capped = total > MAX_IDS

    return NextResponse.json({
      ids,
      total,
      capped,
      maxIds: MAX_IDS,
    })
  } catch (error) {
    console.error("Admin product ids GET error:", error)
    return NextResponse.json({ message: "Sunucu hatası." }, { status: 500 })
  }
}
