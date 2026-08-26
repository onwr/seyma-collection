import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { verifyAccessToken } from "@/lib/jwt"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const token = (await cookies()).get("token")?.value
    if (!token) {
      return NextResponse.json({ user: null })
    }

    const payload = verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json({ user: null })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        addresses: {
          orderBy: { isDefault: 'desc' }
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                product: {
                  include: {
                    images: { take: 1 }
                  }
                }
              }
            }
          }
        },
        favorites: {
          include: {
            product: {
              include: {
                images: {
                  where: { isCover: true },
                  take: 1
                }
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ user: null })
    }

    // Exclude password hash
    const { passwordHash, ...safeUser } = user

    return NextResponse.json({
      user: safeUser,
    })
  } catch (error) {
    console.error("Auth Me Error:", error)
    return NextResponse.json({ user: null })
  }
}
