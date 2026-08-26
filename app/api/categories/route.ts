import { Prisma } from "@/generated/prisma/client"
import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { saveFile } from "@/lib/storage"

type CategoryCreateBody = {
  name?: string
  slug?: string
  description?: string
  imageUrl?: string
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

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ name: "asc" }],
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        children: {
          select: { id: true, name: true, slug: true, parentId: true },
          orderBy: { name: "asc" },
        },
        _count: {
          select: { products: true, subProducts: true, children: true, productLinks: true },
        },
      },
    })

    // Ürün sayılarını hiyerarşiye göre normalize edelim
    const transformedItems = categories.map((cat) => {
      return {
        ...cat,
        _count: {
          ...cat._count,
          // Toplam ürün sayısı = Ana Kategori + Alt Kategori (if exists) + Ek Kategoriler
          products: (cat._count.products || 0) + (cat._count.subProducts || 0) + (cat._count.productLinks || 0),
        },
      };
    });

    return NextResponse.json({ items: transformedItems })
  } catch (error) {
    console.error("Categories GET error:", error)
    return NextResponse.json(
      { message: "Kategoriler listelenirken beklenmeyen bir hata olustu." },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CategoryCreateBody
    const name = body.name?.trim()
    const slug = body.slug ? toSlug(body.slug) : name ? toSlug(name) : ""
    const description = body.description?.trim() || null
    const imageUrl = body.imageUrl?.trim() || null
    const parentId = body.parentId ?? null

    if (!name || !slug) {
      return NextResponse.json(
        { message: "name ve slug (veya name) zorunludur." },
        { status: 400 }
      )
    }

    // Görseli CDN'e kaydet (Eğer base64 ise)
    let finalImageUrl = null
    if (imageUrl) {
      finalImageUrl = await saveFile(imageUrl, "categories")
      if (!finalImageUrl) {
        return NextResponse.json(
          { message: "Görsel yüklenirken bir hata oluştu. CDN sunucusunu veya görsel formatını kontrol edin." },
          { status: 400 }
        )
      }
    }

    if (parentId !== null) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId },
        select: { id: true },
      })
      if (!parent) {
        return NextResponse.json({ message: "parentId gecersiz." }, { status: 400 })
      }
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        imageUrl: finalImageUrl,
        parentId,
      },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
      },
    })

    return NextResponse.json(
      { message: "Kategori olusturuldu.", item: category },
      { status: 201 }
    )
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "Bu slug zaten kullaniliyor." },
        { status: 409 }
      )
    }
    console.error("Categories POST error:", error)
    return NextResponse.json(
      { message: "Kategori olusturulurken beklenmeyen bir hata olustu." },
      { status: 500 }
    )
  }
}
