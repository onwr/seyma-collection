import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { saveFile } from "@/lib/storage"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    const category = await prisma.category.findUnique({
      where: { id: Number(id) },
      include: {
        parent: true,
        children: {
           include: {
              _count: { select: { products: true } }
           }
        },
        _count: { select: { products: true } }
      }
    })

    if (!category) {
      return NextResponse.json({ message: "Kategori bulunamadı." }, { status: 404 })
    }

    return NextResponse.json(category)
  } catch (error: any) {
    return NextResponse.json({ message: "Kategori yüklenirken bir hata oluştu." }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    const body = await request.json()
    const { name, slug, description, imageUrl, parentId } = body

    if (parentId && Number(parentId) === Number(id)) {
       return NextResponse.json({ message: "Bir kategori kendisinin üst kategorisi olamaz." }, { status: 400 })
    }

    // Görseli CDN'e kaydet (Eğer base64 ise)
    let finalImageUrl = imageUrl
    if (imageUrl && imageUrl.startsWith('data:')) {
       const uploadedUrl = await saveFile(imageUrl, "categories")
       if (!uploadedUrl) {
          return NextResponse.json(
             { message: "Görsel CDN sunucusuna yüklenemedi. Lütfen bağlantıyı kontrol edin." },
             { status: 400 }
          )
       }
       finalImageUrl = uploadedUrl
    }

    const updated = await prisma.category.update({
      where: { id: Number(id) },
      data: {
        name,
        slug,
        description,
        imageUrl: finalImageUrl,
        parentId: parentId ? Number(parentId) : null
      }
    })

    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.CATEGORY_UPDATE,
      resourceType: "Category",
      resourceId: String(id),
      metadata: { slug: updated.slug, name: updated.name },
      request,
    })
    return NextResponse.json(updated)
  } catch (error: any) {
    if (error.code === 'P2002') {
       return NextResponse.json({ message: "Bu slug zaten başka bir kategoride kullanılıyor." }, { status: 400 })
    }
    return NextResponse.json({ message: "Kategori güncellenirken bir hata oluştu." }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    // Alt kategorileri kontrol et
    const childrenCount = await prisma.category.count({ where: { parentId: Number(id) } })
    if (childrenCount > 0) {
       return NextResponse.json({ message: "Bu kategorinin alt kategorileri var. Önce onları silmeli veya taşımalısınız." }, { status: 400 })
    }

    // Ürünleri kontrol et
    const productsCount = await prisma.product.count({ where: { categoryId: Number(id) } })
    if (productsCount > 0) {
       return NextResponse.json({ message: "Bu kategoriye ait ürünler var. Önce ürünleri başka bir kategoriye taşımalısınız." }, { status: 400 })
    }

    await prisma.category.delete({
      where: { id: Number(id) }
    })

    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.CATEGORY_DELETE,
      resourceType: "Category",
      resourceId: String(id),
      request,
    })
    return NextResponse.json({ message: "Kategori başarıyla silindi." })
  } catch (error: any) {
    return NextResponse.json({ message: "Kategori silinirken bir hata oluştu." }, { status: 500 })
  }
}
