import { Prisma } from "@/generated/prisma/client"
import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { buildProductListOrderBy, buildProductListWhere } from "@/lib/productListWhere"

type ProductCreateBody = {
  name?: string
  slug?: string
  description?: string
  shortDescription?: string
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.trim()
    const active = searchParams.get("active")
    const featured = searchParams.get("featured")
    const categoryId = searchParams.get("categoryId")
    const stockFilter = searchParams.get("stockFilter")
    const sort = searchParams.get("sort")
    const dir = searchParams.get("dir")
    const page = Number(searchParams.get("page") ?? 1)
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100)
    const skip = (Math.max(page, 1) - 1) * Math.max(limit, 1)

    const where = buildProductListWhere({
      search,
      categoryId,
      active,
      featured,
      stockFilter,
    })

    const orderBy =
      sort === "stock"
        ? ({ createdAt: dir === "asc" ? "asc" : "desc" } as const)
        : buildProductListOrderBy(sort, dir)

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: {
            orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }],
            take: 3,
            select: { id: true, url: true, isCover: true, sortOrder: true },
          },
          variants: {
            where: { isActive: true },
            select: { id: true, name: true, sku: true, price: true, stock: true },
            take: 20,
          },
        },
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalCount: total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Products GET error:", error)
    return NextResponse.json(
      { message: "Urunler listelenirken beklenmeyen bir hata olustu." },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProductCreateBody
    const name = body.name?.trim()
    const providedSlug = body.slug?.trim()
    const slug = providedSlug ? toSlug(providedSlug) : name ? toSlug(name) : ""

    if (!name || !slug || body.basePrice === undefined || body.basePrice === null) {
      return NextResponse.json(
        { message: "name, slug (veya name), basePrice zorunludur." },
        { status: 400 }
      )
    }

    if (body.basePrice < 0) {
      return NextResponse.json(
        { message: "basePrice sifirdan kucuk olamaz." },
        { status: 400 }
      )
    }

    if (body.compareAtPrice !== undefined && body.compareAtPrice !== null && body.compareAtPrice < 0) {
      return NextResponse.json(
        { message: "compareAtPrice sifirdan kucuk olamaz." },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: body.description?.trim() || null,
        shortDescription: body.shortDescription?.trim() || null,
        categoryId: body.categoryId ?? null,
        basePrice: body.basePrice,
        compareAtPrice: body.compareAtPrice ?? null,
        sku: body.sku?.trim() || null,
        barcode: body.barcode?.trim() || null,
        isActive: body.isActive ?? true,
        isFeatured: body.isFeatured ?? false,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    })

    return NextResponse.json({ message: "Urun olusturuldu.", item: product }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "slug, sku veya barcode alaninda benzersizlik ihlali var." },
        { status: 409 }
      )
    }

    console.error("Products POST error:", error)
    return NextResponse.json(
      { message: "Urun olusturulurken beklenmeyen bir hata olustu." },
      { status: 500 }
    )
  }
}
