import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

export async function GET() {
  try {
    const sections = await prisma.homeProductSection.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { category: { select: { name: true } } }
    })
    return NextResponse.json(sections)
  } catch (error) {
    return NextResponse.json({ message: "Hata oluştu." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })

    const body = await request.json()
    const section = await prisma.homeProductSection.create({
      data: {
        title: body.title,
        subtitle: body.subtitle,
        type: body.type || "CATEGORY",
        categoryId: body.categoryId ? parseInt(body.categoryId) : null,
        productsJson: body.productsJson,
        sortOrder: parseInt(body.sortOrder || "0"),
        isActive: body.isActive ?? true
      }
    })
    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.HOMEPAGE_SECTION_CREATE,
      resourceType: "HomeProductSection",
      resourceId: String(section.id),
      metadata: { title: String(body.title ?? "").slice(0, 120), type: section.type },
      request,
    })
    return NextResponse.json(section)
  } catch (error) {
    console.error("Section create error:", error)
    return NextResponse.json({ message: "Hata oluştu." }, { status: 500 })
  }
}
