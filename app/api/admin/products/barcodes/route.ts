import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get("ids")
    const variantIdsParam = searchParams.get("variantIds")

    if (!idsParam && !variantIdsParam) {
      return NextResponse.json({ items: [] })
    }

    if (variantIdsParam) {
      const vIds = variantIdsParam.split(",").map((id) => Number(id)).filter((id) => !isNaN(id))
      const variants = await prisma.productVariant.findMany({
        where: { id: { in: vIds } },
        include: {
          product: {
            select: {
              name: true,
              sku: true,
              barcode: true,
              basePrice: true
            }
          }
        }
      })

      // Ürün formatına dönüştür (frontend uyumluluğu için)
      const items = variants.map(v => ({
        id: v.productId,
        name: v.product.name,
        sku: v.product.sku, // bu aslında parent sku, varyant sku aşağıda
        barcode: v.product.barcode,
        basePrice: v.product.basePrice,
        variants: [{
          id: v.id,
          name: v.name,
          sku: v.sku,
          price: v.price
        }]
      }))

      return NextResponse.json({ items })
    }

    const ids = idsParam?.split(",").map((id) => Number(id)).filter((id) => !isNaN(id)) || []
    
    if (ids.length === 0) {
      return NextResponse.json({ items: [] })
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: ids }
      },
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        basePrice: true,
        variants: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
          }
        }
      }
    })

    return NextResponse.json({ items: products })
  } catch (error) {
    console.error("Products barcodes GET error:", error)
    return NextResponse.json({ message: "Sunucu hatası." }, { status: 500 })
  }
}
