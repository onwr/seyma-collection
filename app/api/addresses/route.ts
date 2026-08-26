import { NextResponse } from "next/server"
import { getUserIdFromCookies } from "@/lib/authSession"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const userId = await getUserIdFromCookies()
    if (!userId) {
      return NextResponse.json({ message: "Giris gerekli." }, { status: 401 })
    }

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { id: "desc" }],
      select: {
        id: true,
        title: true,
        fullName: true,
        phone: true,
        line1: true,
        line2: true,
        district: true,
        city: true,
        postalCode: true,
        country: true,
        isDefault: true,
      },
    })

    return NextResponse.json({ addresses })
  } catch (error) {
    console.error("GET /api/addresses error:", error)
    return NextResponse.json(
      { message: "Adresler yuklenemedi." },
      { status: 500 }
    )
  }
}
