import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { pushProductById } from "@/lib/trendyolProductSync"

// Admin panelindeki "Trendyol'a Gönder/Güncelle" butonu — tek bir ürünü (daha önce
// gönderilmiş olsa bile) anında Trendyol'a gönderir/günceller.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies()
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
  }

  const { id } = await params
  const productId = Number(id)
  if (!Number.isInteger(productId)) {
    return NextResponse.json({ message: "Geçersiz ürün ID." }, { status: 400 })
  }

  try {
    const result = await pushProductById(prisma, productId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Trendyol manuel ürün gönderimi hatası:", error)
    // Trendyol, aynı ürün için bir önceki istek hâlâ işlenirken çok kısa aralıkla gelen tekrar
    // gönderim isteklerini senkron olarak reddediyor ("batchRequest.recurring.product.create.not.allowed").
    // Bu bir veri hatası değil, sadece zamanlama — kullanıcıya bunu net söylüyoruz.
    const message =
      error instanceof Error && error.message.includes("recurring.product.create.not.allowed")
        ? "Bu ürün az önce gönderildi ve Trendyol tarafında hâlâ işleniyor. Trendyol aynı ürünü bu kadar kısa sürede tekrar kabul etmiyor — birkaç dakika bekleyip tekrar deneyin."
        : "Trendyol'a gönderilirken hata oluştu."
    return NextResponse.json({ message }, { status: 500 })
  }
}
