import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { saveFile } from "@/lib/storage"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    const { image, folder } = await request.json()

    if (!image) {
      return NextResponse.json({ message: "Görsel verisi eksik." }, { status: 400 })
    }

    const url = await saveFile(image, folder || "general")

    if (!url) {
      return NextResponse.json({ message: "Görsel yüklenirken bir hata oluştu." }, { status: 500 })
    }

    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.UPLOAD_FILE,
      resourceType: "Media",
      metadata: { folder: folder || "general", path: url.slice(0, 200) },
      request,
    })
    return NextResponse.json({ url })
  } catch (error: any) {
    console.error("Upload API error:", error)
    return NextResponse.json({ message: "Sunucu hatası: " + error.message }, { status: 500 })
  }
}
