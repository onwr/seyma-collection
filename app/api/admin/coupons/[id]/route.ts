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
    const { 
      code, 
      description, 
      type, 
      value, 
      minPurchase, 
      maxDiscount, 
      startDate, 
      endDate, 
      usageLimit, 
      isActive 
    } = body

    const updated = await prisma.coupon.update({
      where: { id: Number(id) },
      data: {
        code: code?.toUpperCase().trim(),
        description,
        type,
        value: value !== undefined ? parseFloat(value) : undefined,
        minPurchase: minPurchase !== undefined ? (minPurchase ? parseFloat(minPurchase) : null) : undefined,
        maxDiscount: maxDiscount !== undefined ? (maxDiscount ? parseFloat(maxDiscount) : null) : undefined,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
        usageLimit: usageLimit !== undefined ? (usageLimit ? parseInt(usageLimit) : null) : undefined,
        isActive: isActive !== undefined ? isActive : undefined
      }
    })

    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.COUPON_UPDATE,
      resourceType: "Coupon",
      resourceId: String(id),
      metadata: { code: updated.code },
      request,
    })
    return NextResponse.json({ message: "Kupon güncellendi.", item: updated })
  } catch (error: any) {
    console.error("Coupon PUT error:", error)
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

    await prisma.coupon.delete({
      where: { id: Number(id) }
    })

    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.COUPON_DELETE,
      resourceType: "Coupon",
      resourceId: String(id),
      request,
    })
    return NextResponse.json({ message: "Kupon silindi." })
  } catch (error: any) {
    console.error("Coupon DELETE error:", error)
    return NextResponse.json({ message: "Kupon silinemedi." }, { status: 500 })
  }
}
