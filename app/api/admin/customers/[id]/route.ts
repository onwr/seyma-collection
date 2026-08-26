import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      include: {
        addresses: true,
        orders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            orderNo: true,
            status: true,
            grandTotal: true,
            createdAt: true,
            paymentStatus: true
          }
        },
        _count: {
          select: { orders: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ message: "Kullanıcı bulunamadı." }, { status: 404 })
    }

    // Toplam harcamayı tüm "PAID" siparişler üzerinden hesapla
    const aggregate = await prisma.order.aggregate({
      where: {
        userId: user.id,
        paymentStatus: "PAID"
      },
      _sum: {
        grandTotal: true
      }
    })

    const totalSpent = Number(aggregate._sum.grandTotal || 0)
    const orderCount = user._count.orders

    const { passwordHash, ...safeUser } = user
    return NextResponse.json({
      ...safeUser,
      totalSpent,
      orderCount
    })
  } catch (error: any) {
    console.error("Customer GET Detail error:", error)
    return NextResponse.json({ message: "Hata oluştu." }, { status: 500 })
  }
}

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
    const { name, email, phone, role, isActive } = body

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        name,
        email,
        phone,
        role,
        isActive
      }
    })

    const { passwordHash, ...safeUser } = updatedUser
    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.CUSTOMER_UPDATE,
      resourceType: "User",
      resourceId: String(id),
      metadata: { role: updatedUser.role, isActive: updatedUser.isActive },
      request,
    })
    return NextResponse.json(safeUser)
  } catch (error: any) {
    console.error("Customer PUT error:", error)
    return NextResponse.json({ message: "Güncelleme sırasında hata oluştu." }, { status: 500 })
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

    // Gerçek silme yerine isActive = false da yapılabilir ama kullanıcı silme istediği için:
    // Not: İlişkili veriler (siparişler vb.) Restrict ise hata verir.
    // Bu yüzden isActive = false daha güvenlidir.
    await prisma.user.update({
      where: { id: Number(id) },
      data: { isActive: false }
    })

    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.CUSTOMER_DELETE,
      resourceType: "User",
      resourceId: String(id),
      metadata: { deactivated: true },
      request,
    })
    return NextResponse.json({ message: "Kullanıcı başarıyla pasifleştirildi." })
  } catch (error: any) {
    console.error("Customer DELETE error:", error)
    return NextResponse.json({ message: "Kullanıcı pasifleştirilemedi." }, { status: 500 })
  }
}
