import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  FALLBACK_ALL_FAQS,
  FALLBACK_HOME_FAQS,
  type FaqPublic,
} from "@/lib/faq"

export const dynamic = "force-dynamic"

type Row = {
  id: number
  question: string
  answer: string
  category: string | null
  sortOrder: number
}

function mapRows(rows: Row[]): FaqPublic[] {
  return rows.map((r) => ({
    id: r.id,
    question: r.question,
    answer: r.answer,
    category: r.category,
    sortOrder: r.sortOrder,
  }))
}

/**
 * Public SSS listesi. Panel ve harici istemciler için.
 * `?home=1` — sadece anasayfada gösterilecek kayıtlar.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const homeOnly = searchParams.get("home") === "1" || searchParams.get("home") === "true"

  try {
    const rows = await prisma.faq.findMany({
      where: {
        isActive: true,
        ...(homeOnly ? { showOnHome: true } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      take: 200,
      select: {
        id: true,
        question: true,
        answer: true,
        category: true,
        sortOrder: true,
      },
    })

    const items = mapRows(rows as Row[])
    if (items.length > 0 || !homeOnly) {
      return NextResponse.json({ items })
    }
  } catch {
    // DB yok / migrate yok
  }

  if (homeOnly) {
    return NextResponse.json({ items: FALLBACK_HOME_FAQS })
  }

  return NextResponse.json({ items: FALLBACK_ALL_FAQS })
}
