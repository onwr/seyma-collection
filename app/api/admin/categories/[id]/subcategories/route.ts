import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"

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

    const subcategories = await prisma.category.findMany({
      where: { parentId: Number(id) },
      orderBy: { name: "asc" }
    })

    return NextResponse.json(subcategories)
  } catch (error: any) {
    console.error("Subcategories GET error:", error)
    return NextResponse.json({ message: "Alt kategoriler yüklenirken bir hata oluştu." }, { status: 500 })
  }
}
