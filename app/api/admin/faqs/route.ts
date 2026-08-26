import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

const createSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1),
  category: z.union([z.string().max(120), z.literal(""), z.null()]).optional(),
  sortOrder: z.coerce.number().int().min(0).max(999_999).optional(),
  isActive: z.boolean().optional(),
  showOnHome: z.boolean().optional(),
})

export async function GET() {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })
    }

    const items = await prisma.faq.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    })
    return NextResponse.json({ items })
  } catch (e) {
    console.error("GET /api/admin/faqs:", e)
    return NextResponse.json({ message: "Liste alınamadı." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })
    }

    const json = await request.json()
    const parsed = createSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Geçersiz veri", issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { question, answer, category, sortOrder, isActive, showOnHome } = parsed.data
    const cat =
      category === undefined || category === null || category === ""
        ? null
        : category.trim() || null

    const row = await prisma.faq.create({
      data: {
        question: question.trim(),
        answer: answer.trim(),
        category: cat,
        sortOrder: sortOrder ?? 0,
        isActive: isActive ?? true,
        showOnHome: showOnHome ?? false,
      },
    })

    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.FAQ_CREATE,
      resourceType: "Faq",
      resourceId: String(row.id),
      metadata: { question: question.slice(0, 120) },
      request,
    })
    return NextResponse.json(row)
  } catch (e) {
    console.error("POST /api/admin/faqs:", e)
    return NextResponse.json({ message: "Kayıt oluşturulamadı." }, { status: 500 })
  }
}
