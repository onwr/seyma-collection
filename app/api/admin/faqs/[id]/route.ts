import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

const updateSchema = z.object({
  question: z.string().min(1).max(500).optional(),
  answer: z.string().min(1).optional(),
  category: z.union([z.string().max(120), z.literal(""), z.null()]).optional(),
  sortOrder: z.coerce.number().int().min(0).max(999_999).optional(),
  isActive: z.boolean().optional(),
  showOnHome: z.boolean().optional(),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })
    }

    const { id: rawId } = await context.params
    const id = Number(rawId)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ message: "Geçersiz id." }, { status: 400 })
    }

    const row = await prisma.faq.findUnique({ where: { id } })
    if (!row) {
      return NextResponse.json({ message: "Bulunamadı." }, { status: 404 })
    }
    return NextResponse.json(row)
  } catch (e) {
    console.error("GET /api/admin/faqs/[id]:", e)
    return NextResponse.json({ message: "Yüklenemedi." }, { status: 500 })
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })
    }

    const { id: rawId } = await context.params
    const id = Number(rawId)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ message: "Geçersiz id." }, { status: 400 })
    }

    const json = await request.json()
    const parsed = updateSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Geçersiz veri", issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data

    const row = await prisma.faq.update({
      where: { id },
      data: {
        ...(data.question !== undefined && { question: data.question.trim() }),
        ...(data.answer !== undefined && { answer: data.answer.trim() }),
        ...(data.category !== undefined && {
          category:
            data.category === null || data.category === ""
              ? null
              : String(data.category).trim() || null,
        }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.showOnHome !== undefined && { showOnHome: data.showOnHome }),
      },
    })
    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.FAQ_UPDATE,
      resourceType: "Faq",
      resourceId: String(id),
      metadata: { keys: Object.keys(data) },
      request,
    })
    return NextResponse.json(row)
  } catch (e) {
    console.error("PUT /api/admin/faqs/[id]:", e)
    return NextResponse.json({ message: "Güncellenemedi." }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })
    }

    const { id: rawId } = await context.params
    const id = Number(rawId)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ message: "Geçersiz id." }, { status: 400 })
    }

    await prisma.faq.delete({ where: { id } })
    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.FAQ_DELETE,
      resourceType: "Faq",
      resourceId: String(id),
      request,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("DELETE /api/admin/faqs/[id]:", e)
    return NextResponse.json({ message: "Silinemedi." }, { status: 500 })
  }
}
