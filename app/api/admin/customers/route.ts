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
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const query = searchParams.get("q") || ""
    const skip = (page - 1) * limit

    const where: any = {}
    if (query) {
      where.OR = [
        { name: { contains: query } },
        { email: { contains: query } },
        { phone: { contains: query } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { orders: true }
          },
          orders: {
            where: { paymentStatus: "PAID" },
            select: { grandTotal: true }
          }
        }
      }),
      prisma.user.count({ where })
    ])

    const formattedUsers = users.map(user => {
      const totalSpent = user.orders.reduce((acc, order) => acc + Number(order.grandTotal), 0)
      const { orders, ...userWithoutOrders } = user
      return {
        ...userWithoutOrders,
        totalSpent,
        orderCount: user._count.orders
      }
    })

    return NextResponse.json({
      items: formattedUsers,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error: any) {
    console.error("Customers GET error:", error)
    return NextResponse.json({ message: "Hata oluştu: " + error.message }, { status: 500 })
  }
}
