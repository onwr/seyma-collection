import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { headerNavItemBodySchema } from "@/lib/navigationSchemas"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })
    }

    const { id } = await params
    const idNum = Number(id)
    if (!Number.isFinite(idNum)) {
      return NextResponse.json({ message: "Geçersiz id." }, { status: 400 })
    }

    const json = await request.json()
    const parsed = headerNavItemBodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const row = await prisma.headerNavItem.update({
      where: { id: idNum },
      data: {
        label: parsed.data.label,
        href: parsed.data.href,
        labelUppercase: parsed.data.labelUppercase,
        sortOrder: parsed.data.sortOrder,
        isActive: parsed.data.isActive,
        openInNewTab: parsed.data.openInNewTab,
        childrenJson: parsed.data.children.length
          ? JSON.stringify(parsed.data.children)
          : null,
      },
    })
    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.NAV_ITEM_UPDATE,
      resourceType: "HeaderNavItem",
      resourceId: String(idNum),
      metadata: { label: row.label, href: row.href },
      request,
    })
    return NextResponse.json(row)
  } catch {
    return NextResponse.json({ message: "Hata" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })
    }

    const { id } = await params
    const idNum = Number(id)
    if (!Number.isFinite(idNum)) {
      return NextResponse.json({ message: "Geçersiz id." }, { status: 400 })
    }

    await prisma.headerNavItem.delete({
      where: { id: idNum },
    })
    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.NAV_ITEM_DELETE,
      resourceType: "HeaderNavItem",
      resourceId: String(idNum),
      request,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ message: "Hata" }, { status: 500 })
  }
}
