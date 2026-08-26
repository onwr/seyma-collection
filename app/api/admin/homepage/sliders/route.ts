import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { saveFile } from "@/lib/storage"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

export async function GET() {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })
    }

    const sliders = await prisma.slider.findMany({
      orderBy: { sortOrder: "asc" }
    })
    return NextResponse.json(sliders)
  } catch (error) {
    return NextResponse.json({ message: "Hata" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })

    const body = await request.json()
    
    // Sadece mevcut olan alanları gönder (Unknown argument hatalarını önlemek için)
    const sliderData: any = {
      imageUrl: await saveFile(body.imageUrl, "homepage") || body.imageUrl,
      linkUrl: body.linkUrl,
      sortOrder: parseInt(body.sortOrder || "0"),
      isActive: body.isActive ?? true
    }

    if (body.title) sliderData.title = body.title
    if (body.subtitle) sliderData.subtitle = body.subtitle
    if (body.buttonText) sliderData.buttonText = body.buttonText

    const slider = await prisma.slider.create({
      data: sliderData
    })
    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.HOMEPAGE_SLIDER_CREATE,
      resourceType: "Slider",
      resourceId: String(slider.id),
      request,
    })
    return NextResponse.json(slider)
  } catch (error) {
    return NextResponse.json({ message: "Hata" }, { status: 500 })
  }
}
