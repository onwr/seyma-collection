import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""

    const where: any = {}
    if (query) {
      where.OR = [
        { code: { contains: query } },
        { description: { contains: query } },
      ]
    }

    const coupons = await prisma.coupon.findMany({
      where,
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ items: coupons })
  } catch (error: any) {
    console.error("Coupons GET error:", error)
    return NextResponse.json({ message: "Hata oluştu." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
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

    if (!code || !type || value === undefined) {
      return NextResponse.json({ message: "Eksik bilgi." }, { status: 400 })
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase().trim(),
        description,
        type,
        value: parseFloat(value),
        minPurchase: minPurchase ? parseFloat(minPurchase) : null,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        isActive: isActive ?? true
      }
    })

    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.COUPON_CREATE,
      resourceType: "Coupon",
      resourceId: String(coupon.id),
      metadata: { code: coupon.code },
      request,
    })
    return NextResponse.json({ message: "Kupon başarıyla oluşturuldu.", item: coupon }, { status: 201 })
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ message: "Bu kupon kodu zaten mevcut." }, { status: 409 })
    }
    console.error("Coupon POST error:", error)
    return NextResponse.json({ message: "Oluşturma sırasında hata oluştu." }, { status: 500 })
  }
}
