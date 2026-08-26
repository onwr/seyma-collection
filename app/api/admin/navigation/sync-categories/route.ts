import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"
import type { Category } from "@/generated/prisma/client"

type NavChild = { label: string; href: string; openInNewTab: boolean }

function sortCats(cats: Category[]) {
  return [...cats].sort(
    (a, b) => a.name.localeCompare(b.name, "tr")
  )
}

/** parentId -> doğrudan çocuklar (tüm kategoriler tek sorguda). */
function childrenByParentId(categories: Category[]) {
  const map = new Map<number | null, Category[]>()
  for (const c of categories) {
    const key = c.parentId ?? null
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(c)
  }
  for (const list of map.values()) sortCats(list)
  return map
}

/** Bir kök kategorinin tüm alt ağacını düz alt menü öğeleri olarak üret (çok seviye: "A › B"). */
function flattenDescendants(
  byParent: Map<number | null, Category[]>,
  parentId: number,
  prefix: string
): NavChild[] {
  const direct = byParent.get(parentId) ?? []
  const out: NavChild[] = []
  for (const c of direct) {
    const label = prefix ? `${prefix} › ${c.name}` : c.name
    out.push({
      label,
      href: `/categories/${c.slug}`,
      openInNewTab: false,
    })
    out.push(...flattenDescendants(byParent, c.id, prefix ? `${prefix} › ${c.name}` : c.name))
  }
  return out
}

/**
 * Anasayfa öğesini korur (veya yoksa oluşturur), kategori menülerini yeniden üretir.
 */
export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })
    }

    const allCategories = await prisma.category.findMany()
    const byParent = childrenByParentId(allCategories)
    const roots = byParent.get(null) ?? []

    await prisma.$transaction(async (tx) => {
      const existingHome = await tx.headerNavItem.findFirst({
        where: { href: "/" },
        orderBy: { sortOrder: "asc" },
      })

      let homeId = existingHome?.id ?? null
      if (!existingHome) {
        const createdHome = await tx.headerNavItem.create({
          data: {
            label: "ANASAYFA",
            href: "/",
            labelUppercase: false,
            sortOrder: 0,
            isActive: true,
            openInNewTab: false,
            childrenJson: null,
          },
        })
        homeId = createdHome.id
      } else {
        await tx.headerNavItem.update({
          where: { id: existingHome.id },
          data: { sortOrder: 0 },
        })
      }

      await tx.headerNavItem.deleteMany({
        where: homeId ? { id: { not: homeId } } : undefined,
      })

      for (let i = 0; i < roots.length; i++) {
        const cat = roots[i]
        const children = flattenDescendants(byParent, cat.id, "")
        await tx.headerNavItem.create({
          data: {
            label: cat.name,
            href: `/categories/${cat.slug}`,
            labelUppercase: true,
            sortOrder: i + 1,
            isActive: true,
            openInNewTab: false,
            childrenJson: children.length > 0 ? JSON.stringify(children) : null,
          },
        })
      }
    })

    const rows = await prisma.headerNavItem.findMany({
      orderBy: { sortOrder: "asc" },
    })

    const parseChildren = (childrenJson: string | null) => {
      if (!childrenJson) return []
      try {
        const parsed = JSON.parse(childrenJson)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }

    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.NAV_SYNC_CATEGORIES,
      resourceType: "HeaderNavItem",
      metadata: { itemCount: rows.length },
      request,
    })
    return NextResponse.json(
      rows.map((row) => ({
        ...row,
        children: parseChildren(row.childrenJson),
      }))
    )
  } catch (e) {
    console.error("navigation sync-categories:", e)
    return NextResponse.json({ message: "Senkronizasyon başarısız." }, { status: 500 })
  }
}
