import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.trim()
    const status = searchParams.get("status")
    const page = Number(searchParams.get("page") ?? 1)
    const limit = Number(searchParams.get("limit") ?? 20)
    const skip = (page - 1) * limit

    const where: any = {}

    if (search) {
      where.OR = [
        { orderNo: { contains: search } },
        { shippingFullName: { contains: search } },
        { guestEmail: { contains: search } }
      ]
    }

    if (status && status !== "ALL") {
      where.status = status
    }

    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) {
        const d = new Date(endDate)
        d.setHours(23, 59, 59, 999)
        where.createdAt.lte = d
      }
    }

    const sort = searchParams.get("sort") ?? "createdAt"
    const dir = searchParams.get("dir") ?? "desc"

    // Sanitize sort field
    const allowedSortFields = ["orderNo", "createdAt", "grandTotal", "status"]
    const orderByField = allowedSortFields.includes(sort) ? sort : "createdAt"
    const orderDirection = dir === "asc" ? "asc" : "desc"

    const [items, total, summaryRaw] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: orderDirection },
        include: {
          _count: { select: { items: true } },
          user: { select: { email: true } }
        }
      }),
      prisma.order.count({ where }),
      prisma.order.groupBy({
        by: ['status'],
        _count: true
      })
    ])

    const summary = summaryRaw.reduce((acc: any, curr: any) => {
      acc[curr.status] = curr._count
      return acc
    }, {})

    return NextResponse.json({
      items: items.map(o => ({
        ...o,
        grandTotal: Number(o.grandTotal),
        subtotal: Number(o.subtotal),
        shippingCost: Number(o.shippingCost),
        discountTotal: Number(o.discountTotal),
        itemCount: o._count.items
      })),
      summary,
      pagination: {
        page,
        limit,
        totalCount: total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Admin orders GET error:", error)
    return NextResponse.json({ message: "Siparişler listelenirken bir hata oluştu." }, { status: 500 })
  }
}
