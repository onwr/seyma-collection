import { Prisma } from "@/generated/prisma/client"
import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

type CategoryUpdateBody = {
  name?: string
  slug?: string
  description?: string | null
  parentId?: number | null
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        children: {
          select: { id: true, name: true, slug: true, parentId: true },
          orderBy: { name: "asc" },
        },
        products: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            slug: true,
            basePrice: true,
            isActive: true,
            isFeatured: true,
            createdAt: true,
          },
          take: 100,
        },
      },
    })

    if (!category) {
      return NextResponse.json({ message: "Kategori bulunamadi." }, { status: 404 })
    }

    return NextResponse.json({ item: category })
  } catch (error) {
    console.error("Category GET by slug error:", error)
    return NextResponse.json(
      { message: "Kategori getirilirken beklenmeyen bir hata olustu." },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = (await request.json()) as CategoryUpdateBody

    const existing = await prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ message: "Kategori bulunamadi." }, { status: 404 })
    }

    const data: Prisma.CategoryUpdateInput = {}

    if (body.name !== undefined) data.name = body.name.trim()
    if (body.slug !== undefined) data.slug = toSlug(body.slug)
    if (body.description !== undefined) data.description = body.description?.trim() || null
    if (body.parentId !== undefined) {
      if (body.parentId === existing.id) {
        return NextResponse.json(
          { message: "Kategori kendisini parent olarak alamaz." },
          { status: 400 }
        )
      }
      if (body.parentId !== null) {
        const parent = await prisma.category.findUnique({
          where: { id: body.parentId },
          select: { id: true },
        })
        if (!parent) {
          return NextResponse.json({ message: "parentId gecersiz." }, { status: 400 })
        }
        data.parent = { connect: { id: body.parentId } }
      } else {
        data.parent = { disconnect: true }
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { message: "Guncellenecek en az bir alan gondermelisiniz." },
        { status: 400 }
      )
    }

    const updated = await prisma.category.update({
      where: { id: existing.id },
      data,
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: { select: { id: true, name: true, slug: true } },
      },
    })

    return NextResponse.json({ message: "Kategori guncellendi.", item: updated })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "Bu slug zaten kullaniliyor." },
        { status: 409 }
      )
    }
    console.error("Category PUT by slug error:", error)
    return NextResponse.json(
      { message: "Kategori guncellenirken beklenmeyen bir hata olustu." },
      { status: 500 }
    )
  }
}
