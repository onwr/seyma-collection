import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { verifyAccessToken } from "@/lib/jwt"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const token = (await cookies()).get("token")?.value
    if (!token) {
      return NextResponse.json({ message: "Favorilere eklemek için giriş yapmalısınız." }, { status: 401 })
    }

    const payload = verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json({ message: "Oturum geçersiz." }, { status: 401 })
    }

    const { productId } = await request.json()
    if (!productId) {
      return NextResponse.json({ message: "Ürün ID gereklidir." }, { status: 400 })
    }

    // Check if already favorited
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId: payload.userId,
          productId: Number(productId)
        }
      }
    })

    if (existing) {
      // Remove from favorites
      await prisma.favorite.delete({
        where: { id: existing.id }
      })
      return NextResponse.json({ message: "Ürün favorilerden çıkarıldı.", isFavorite: false })
    } else {
      // Add to favorites
      await prisma.favorite.create({
        data: {
          userId: payload.userId,
          productId: Number(productId)
        }
      })
      return NextResponse.json({ message: "Ürün favorilere eklendi.", isFavorite: true })
    }
  } catch (error) {
    console.error("Favorite Toggle Error:", error)
    return NextResponse.json({ message: "İşlem sırasında bir hata oluştu." }, { status: 500 })
  }
}
