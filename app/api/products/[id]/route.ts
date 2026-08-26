import { Prisma } from "@/generated/prisma/client"
import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

type ProductUpdateBody = {
  name?: string
  slug?: string
  description?: string | null
  shortDescription?: string | null
  categoryId?: number | null
  basePrice?: number
  compareAtPrice?: number | null
  sku?: string | null
  barcode?: string | null
  isActive?: boolean
  isFeatured?: boolean
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const productId = Number(id)
    if (Number.isNaN(productId)) {
      return NextResponse.json({ message: "Gecersiz urun id." }, { status: 400 })
    }

    const body = (await request.json()) as ProductUpdateBody
    const data: Prisma.ProductUpdateInput = {}

    if (body.name !== undefined) data.name = body.name.trim()
    if (body.slug !== undefined) data.slug = toSlug(body.slug)
    if (body.description !== undefined) data.description = body.description?.trim() || null
    if (body.shortDescription !== undefined) {
      data.shortDescription = body.shortDescription?.trim() || null
    }
    if (body.categoryId !== undefined) {
      data.category =
        body.categoryId === null
          ? { disconnect: true }
          : { connect: { id: body.categoryId } }
    }
    if (body.basePrice !== undefined) {
      if (body.basePrice < 0) {
        return NextResponse.json({ message: "basePrice sifirdan kucuk olamaz." }, { status: 400 })
      }
      data.basePrice = body.basePrice
    }
    if (body.compareAtPrice !== undefined) {
      if (body.compareAtPrice !== null && body.compareAtPrice < 0) {
        return NextResponse.json(
          { message: "compareAtPrice sifirdan kucuk olamaz." },
          { status: 400 }
        )
      }
      data.compareAtPrice = body.compareAtPrice
    }
    if (body.sku !== undefined) data.sku = body.sku?.trim() || null
    if (body.barcode !== undefined) data.barcode = body.barcode?.trim() || null
    if (body.isActive !== undefined) data.isActive = body.isActive
    if (body.isFeatured !== undefined) data.isFeatured = body.isFeatured

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { message: "Guncellenecek en az bir alan gondermelisiniz." },
        { status: 400 }
      )
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: {
          select: { id: true, name: true, sku: true, price: true, stock: true, isActive: true },
        },
      },
    })

    return NextResponse.json({ message: "Urun guncellendi.", item: updated })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ message: "Urun bulunamadi." }, { status: 404 })
      }
      if (error.code === "P2002") {
        return NextResponse.json(
          { message: "slug, sku veya barcode alaninda benzersizlik ihlali var." },
          { status: 409 }
        )
      }
    }

    console.error("Product PUT error:", error)
    return NextResponse.json(
      { message: "Urun guncellenirken beklenmeyen bir hata olustu." },
      { status: 500 }
    )
  }
}
