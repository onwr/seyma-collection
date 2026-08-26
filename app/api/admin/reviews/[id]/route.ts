import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    const body = await request.json()
    const { status, rating, comment } = body

    const updated = await prisma.review.update({
      where: { id: Number(id) },
      data: {
        status,
        rating: rating !== undefined ? Number(rating) : undefined,
        comment: comment !== undefined ? comment : undefined
      }
    })

    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.REVIEW_UPDATE,
      resourceType: "Review",
      resourceId: String(id),
      metadata: { status: updated.status },
      request,
    })
    return NextResponse.json({ message: "Yorum güncellendi.", item: updated })
  } catch (error: any) {
    console.error("Review PUT error:", error)
    return NextResponse.json({ message: "Güncelleme hatası." }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    await prisma.review.delete({
      where: { id: Number(id) }
    })

    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.REVIEW_DELETE,
      resourceType: "Review",
      resourceId: String(id),
      request,
    })
    return NextResponse.json({ message: "Yorum kalıcı olarak silindi." })
  } catch (error: any) {
    console.error("Review DELETE error:", error)
    return NextResponse.json({ message: "Silme hatası." }, { status: 500 })
  }
}
