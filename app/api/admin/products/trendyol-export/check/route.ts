import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { EXPORT_PRODUCT_SELECT, ExportProduct, buildRow } from "@/lib/trendyolExport"

// İndirmeden önce hangi ürünlerde Trendyol'a gerçek veri yerine varsayılan/tahmini
// değer yazılacağını (ör. renk bulunamadı, açıklama boş) özetleyen kontrol uç noktası.
export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get("ids")

    const where: any = {}
    if (idsParam) {
      const ids = idsParam.split(",").map((id) => Number(id)).filter((n) => Number.isInteger(n))
      if (ids.length === 0) {
        return NextResponse.json({ message: "Geçerli ürün seçilmedi." }, { status: 400 })
      }
      where.id = { in: ids }
    } else {
      where.isActive = true
    }

    const products = (await prisma.product.findMany({
      where,
      orderBy: { id: "asc" },
      select: EXPORT_PRODUCT_SELECT,
    })) as unknown as ExportProduct[]

    let rowCount = 0
    const items: { productId: number; productName: string; variantSku: string; field: string; note: string }[] = []

    for (const p of products) {
      for (const v of p.variants) {
        rowCount++
        const row = buildRow(p, v, 1)
        for (const w of row.warnings) {
          items.push({ productId: p.id, productName: p.name, variantSku: row.variantSku, field: w.field, note: w.note })
        }
      }
    }

    const byField: Record<string, number> = {}
    for (const item of items) {
      byField[item.field] = (byField[item.field] ?? 0) + 1
    }

    return NextResponse.json({
      productCount: products.length,
      rowCount,
      warningCount: items.length,
      byField,
      items,
    })
  } catch (error) {
    console.error("Trendyol export check error:", error)
    return NextResponse.json({ message: "Kontrol sırasında hata oluştu." }, { status: 500 })
  }
}
