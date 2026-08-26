import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })

    const { id: rawId } = await params
    const id = Number(rawId)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ message: "Geçersiz id." }, { status: 400 })
    }
    const body = await request.json()
    
    const section = await prisma.homeProductSection.update({
      where: { id },
      data: {
        title: body.title,
        subtitle: body.subtitle,
        type: body.type,
        categoryId: body.categoryId ? parseInt(body.categoryId) : null,
        productsJson: body.productsJson,
        sortOrder: parseInt(body.sortOrder || "0"),
        isActive: body.isActive
      }
    })
    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.HOMEPAGE_SECTION_UPDATE,
      resourceType: "HomeProductSection",
      resourceId: String(id),
      metadata: { title: section.title },
      request,
    })
    return NextResponse.json(section)
  } catch (error) {
    return NextResponse.json({ message: "Hata oluştu." }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })

    const { id: rawId } = await params
    const id = Number(rawId)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ message: "Geçersiz id." }, { status: 400 })
    }
    await prisma.homeProductSection.delete({
      where: { id }
    })
    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.HOMEPAGE_SECTION_DELETE,
      resourceType: "HomeProductSection",
      resourceId: String(id),
      request,
    })
    return NextResponse.json({ message: "Bölüm silindi." })
  } catch (error) {
    return NextResponse.json({ message: "Hata oluştu." }, { status: 500 })
  }
}
