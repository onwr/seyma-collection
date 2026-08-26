import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

const bodySchema = z.object({
  variantIds: z.array(z.number().int().positive()).min(1).max(500),
  amount: z.number().int().min(1).max(99_999),
})

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    const json = await request.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Geçersiz istek", issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const variantIds = [...new Set(parsed.data.variantIds)]
    const amount = parsed.data.amount

    const existing = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true },
    })
    if (existing.length !== variantIds.length) {
      return NextResponse.json(
        { message: "Bazı varyant kimlikleri bulunamadı." },
        { status: 400 }
      )
    }

    await prisma.$transaction(
      variantIds.map((id) =>
        prisma.productVariant.update({
          where: { id },
          data: { stock: { increment: amount } },
        })
      )
    )

    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.STOCK_INCREASE,
      resourceType: "ProductVariant",
      metadata: { variantCount: variantIds.length, amount },
      request,
    })
    return NextResponse.json({ ok: true, updated: variantIds.length, amount })
  } catch (e) {
    console.error("stock increase:", e)
    return NextResponse.json({ message: "Sunucu hatası." }, { status: 500 })
  }
}
