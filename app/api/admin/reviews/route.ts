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
    const status = searchParams.get("status")
    const rating = searchParams.get("rating")
    const query = searchParams.get("q") || ""
    const skip = (page - 1) * limit

    const where: any = {}
    
    if (status) where.status = status
    if (rating) where.rating = parseInt(rating)
    
    if (query) {
      where.OR = [
        { comment: { contains: query } },
        { product: { name: { contains: query } } },
        { user: { name: { contains: query } } },
      ]
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: {
                where: { isCover: true },
                take: 1
              }
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.review.count({ where })
    ])

    return NextResponse.json({
      items: reviews,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error: any) {
    console.error("Reviews GET error:", error)
    return NextResponse.json({ message: "Hata oluştu." }, { status: 500 })
  }
}
