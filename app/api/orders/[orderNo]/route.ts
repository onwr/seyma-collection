import { NextResponse } from "next/server"
import { after } from "next/server"
import { OrderStatus } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { orderStatusEmailContent } from "@/lib/emails/orderStatus"
import { sendMail } from "@/lib/smtpSettings"
import {
  AdminActivityAction,
  logAdminActivity,
  sanitizeAdminActivityMetadata,
} from "@/lib/adminActivityLog"
import { getClientIp } from "@/lib/checkoutRateLimit"
import { buildOrderDeletionSnapshot } from "@/lib/orderDeleteSnapshot"

const ORDER_STATUSES = new Set<string>(Object.values(OrderStatus))

function trunc(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + "…"
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    const { orderNo: rawOrderNo } = await params
    const orderNo = decodeURIComponent(rawOrderNo).trim()

    if (!orderNo) {
      return NextResponse.json({ message: "Geçersiz sipariş numarası." }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { orderNo },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { take: 1 },
              },
            },
          },
        },
        shipment: true,
        payments: true,
        user: { select: { email: true } },
      },
    })

    if (!order) {
      return NextResponse.json({ message: "Sipariş bulunamadı." }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("Admin order GET detail error:", error)
    return NextResponse.json({ message: "Sipariş detayları getirilirken bir hata oluştu." }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    const { orderNo } = await params
    const { status } = (await request.json()) as { status?: string }

    if (!status || !ORDER_STATUSES.has(status)) {
      return NextResponse.json({ message: "Geçersiz durum." }, { status: 400 })
    }

    const nextStatus = status as OrderStatus

    const existing = await prisma.order.findUnique({
      where: { orderNo },
      select: {
        orderNo: true,
        status: true,
        guestEmail: true,
        user: { select: { email: true } },
      },
    })

    if (!existing) {
      return NextResponse.json({ message: "Sipariş bulunamadı." }, { status: 404 })
    }

    const order = await prisma.order.update({
      where: { orderNo },
      data: { status: nextStatus },
      select: { orderNo: true, status: true },
    })

    const to =
      existing.user?.email?.trim() || existing.guestEmail?.trim() || null
    const siteUrlBase =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.littlemomstore.com"

    if (to && existing.status !== nextStatus) {
      const no = order.orderNo
      const st = nextStatus
      after(() => {
        void (async () => {
          try {
            const { subject, text, html } = orderStatusEmailContent({
              siteUrl: siteUrlBase,
              orderNo: no,
              newStatus: st,
            })
            await sendMail(prisma, { to, subject, text, html })
          } catch (err) {
            console.error("order status email:", err)
          }
        })()
      })
    }

    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.ORDER_STATUS_UPDATE,
      resourceType: "Order",
      resourceId: order.orderNo,
      metadata: {
        from: existing.status,
        to: nextStatus,
      },
      request,
    })
    return NextResponse.json({ message: "Sipariş durumu güncellendi.", order })
  } catch (error) {
    console.error("Admin order status update error:", error)
    return NextResponse.json({ message: "Sipariş güncellenirken bir hata oluştu." }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    const { orderNo: rawOrderNo } = await params
    const orderNo = decodeURIComponent(rawOrderNo).trim()
    if (!orderNo) {
      return NextResponse.json({ message: "Geçersiz sipariş numarası." }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { orderNo },
      include: {
        items: true,
        payments: true,
        shipment: true,
        user: { select: { id: true, email: true } },
      },
    })

    if (!order) {
      return NextResponse.json({ message: "Sipariş bulunamadı." }, { status: 404 })
    }

    const snapshot = buildOrderDeletionSnapshot(order)
    const deletedAt = new Date().toISOString()
    const ipRaw = getClientIp(request)
    const ip =
      ipRaw && ipRaw !== "unknown" && ipRaw.length > 0 ? trunc(ipRaw, 45) : null

    await prisma.$transaction(async (tx) => {
      await tx.order.delete({ where: { id: order.id } })
      await tx.adminActivity.create({
        data: {
          actorUserId: session.userId,
          actorEmail: trunc(session.email.trim() || "unknown", 255),
          action: trunc(AdminActivityAction.ORDER_DELETE, 80),
          resourceType: trunc("Order", 80),
          resourceId: trunc(order.orderNo, 255),
          metadata: sanitizeAdminActivityMetadata(
            {
              deletedAt,
              order: snapshot,
            },
            { generous: true }
          ),
          ip,
        },
      })
    })

    return NextResponse.json({
      message: "Sipariş kalıcı olarak silindi. Kayıt işlem günlüğüne yazıldı.",
      orderNo: order.orderNo,
    })
  } catch (error) {
    console.error("Admin order DELETE error:", error)
    return NextResponse.json({ message: "Sipariş silinirken bir hata oluştu." }, { status: 500 })
  }
}
