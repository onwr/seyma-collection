import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")

  if (!query || query.length < 2) {
    return NextResponse.json({ products: [] })
  }

  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query } },
          { slug: { contains: query } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { url: true }
        },
        variants: {
          take: 1,
          select: { price: true }
        }
      },
      take: 5,
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error("Search API Error:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
