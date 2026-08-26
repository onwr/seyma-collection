import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

export async function GET() {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })

    const categories = await prisma.category.findMany({
      where: { parentId: null }, // Sadece ana kategoriler anasayfada gösterilebilir (tercih)
      orderBy: { sortOrder: "asc" }
    })
    return NextResponse.json(categories)
  } catch (error) {
    return NextResponse.json({ message: "Hata" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })

    const body = await request.json()
    const { id, showOnHome, sortOrder } = body

    const category = await prisma.category.update({
      where: { id: Number(id) },
      data: {
        showOnHome,
        sortOrder: parseInt(sortOrder || "0")
      }
    })
    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.HOMEPAGE_CATEGORIES_SAVE,
      resourceType: "Category",
      resourceId: String(id),
      metadata: { showOnHome, sortOrder: category.sortOrder },
      request,
    })
    return NextResponse.json(category)
  } catch (error) {
    return NextResponse.json({ message: "Hata" }, { status: 500 })
  }
}
