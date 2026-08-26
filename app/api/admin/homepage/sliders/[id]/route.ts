import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { saveFile } from "@/lib/storage"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })

    const body = await request.json()
    
    // Sadece mevcut olan alanları güncelle
    const updateData: any = {
      imageUrl: await saveFile(body.imageUrl, "homepage") || body.imageUrl,
      linkUrl: body.linkUrl,
      sortOrder: parseInt(body.sortOrder || "0"),
      isActive: body.isActive
    }

    if (body.title !== undefined) updateData.title = body.title
    if (body.subtitle !== undefined) updateData.subtitle = body.subtitle
    if (body.buttonText !== undefined) updateData.buttonText = body.buttonText

    const slider = await prisma.slider.update({
      where: { id: Number(id) },
      data: updateData
    })
    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.HOMEPAGE_SLIDER_UPDATE,
      resourceType: "Slider",
      resourceId: String(id),
      request,
    })
    return NextResponse.json(slider)
  } catch (error) {
    return NextResponse.json({ message: "Hata" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })

    await prisma.slider.delete({ where: { id: Number(id) } })
    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.HOMEPAGE_SLIDER_DELETE,
      resourceType: "Slider",
      resourceId: String(id),
      request,
    })
    return NextResponse.json({ message: "Silindi" })
  } catch (error) {
    return NextResponse.json({ message: "Hata" }, { status: 500 })
  }
}
