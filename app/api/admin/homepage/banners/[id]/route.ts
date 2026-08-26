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
    const banner = await prisma.banner.update({
      where: { id: Number(id) },
      data: {
        title: body.title,
        imageUrl: await saveFile(body.imageUrl, "homepage") || body.imageUrl,
        linkUrl: body.linkUrl,
        position: body.position,
        sortOrder: parseInt(body.sortOrder || "0"),
        isActive: body.isActive
      }
    })
    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.HOMEPAGE_BANNER_UPDATE,
      resourceType: "Banner",
      resourceId: String(id),
      metadata: { title: banner.title },
      request,
    })
    return NextResponse.json(banner)
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

    await prisma.banner.delete({ where: { id: Number(id) } })
    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.HOMEPAGE_BANNER_DELETE,
      resourceType: "Banner",
      resourceId: String(id),
      request,
    })
    return NextResponse.json({ message: "Silindi" })
  } catch (error) {
    return NextResponse.json({ message: "Hata" }, { status: 500 })
  }
}
