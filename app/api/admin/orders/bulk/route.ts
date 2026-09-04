import { NextResponse } from "next/server"
import { after } from "next/server"
import { OrderStatus } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { orderStatusEmailContent } from "@/lib/emails/orderStatus"
import { sendMail } from "@/lib/smtpSettings"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

const ORDER_STATUSES = new Set<string>(Object.values(OrderStatus))

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    const { ids, action, value } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ message: "Sipariş seçilmedi." }, { status: 400 })
    }

    const idsNum = ids
      .map((x: unknown) => Number(x))
      .filter((n: number) => Number.isInteger(n) && n > 0)

    if (idsNum.length === 0) {
      return NextResponse.json({ message: "Geçersiz sipariş listesi." }, { status: 400 })
    }

    if (action === "status_update") {
      if (!value || !ORDER_STATUSES.has(String(value))) {
        return NextResponse.json({ message: "Geçersiz durum." }, { status: 400 })
      }
      const nextStatus = String(value) as OrderStatus

      const orders = await prisma.order.findMany({
        where: { id: { in: idsNum } },
        select: {
          orderNo: true,
          status: true,
          guestEmail: true,
          user: { select: { email: true } },
        },
      })

      const toNotify = orders.filter((o) => o.status !== nextStatus)

      await prisma.order.updateMany({
        where: { id: { in: idsNum } },
        data: { status: nextStatus },
      })

      const siteUrlBase =
        process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.seymacollection.com"

      for (const o of toNotify) {
        const to = o.user?.email?.trim() || o.guestEmail?.trim() || null
        if (!to) continue
        const no = o.orderNo
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
              console.error("bulk order status email:", err)
            }
          })()
        })
      }

      await logAdminActivity(prisma, session, {
        action: AdminActivityAction.ORDER_BULK_UPDATE,
        resourceType: "Order",
        metadata: {
          kind: "status_update",
          count: idsNum.length,
          newStatus: nextStatus,
        },
        request,
      })
      return NextResponse.json({ message: `${idsNum.length} sipariş güncellendi.` })
    }

    if (action === "payment_update") {
      await prisma.order.updateMany({
        where: { id: { in: idsNum } },
        data: { paymentStatus: value },
      })
      await logAdminActivity(prisma, session, {
        action: AdminActivityAction.ORDER_BULK_UPDATE,
        resourceType: "Order",
        metadata: {
          kind: "payment_update",
          count: idsNum.length,
          paymentStatus: value,
        },
        request,
      })
      return NextResponse.json({ message: `${idsNum.length} sipariş ödeme durumu güncellendi.` })
    }

    return NextResponse.json({ message: "Geçersiz işlem." }, { status: 400 })
  } catch (error) {
    console.error("Bulk action error:", error)
    return NextResponse.json({ message: "Sunucu hatası." }, { status: 500 })
  }
}
