import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const { code, subtotal } = await req.json()
    
    if (!code) {
      return NextResponse.json({ message: "Kupon kodu gerekli." }, { status: 400 })
    }

    // Database'den kuponu çek
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        isActive: true,
        OR: [
          { startDate: null },
          { startDate: { lte: new Date() } }
        ],
        AND: [
          { OR: [{ endDate: null }, { endDate: { gte: new Date() } }] }
        ]
      }
    })

    if (!coupon) {
      return NextResponse.json({ message: "Geçersiz veya süresi dolmuş kupon kodu." }, { status: 404 })
    }

    // Kullanım limiti kontrolü
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json({ message: "Bu kuponun kullanım limiti dolmuş." }, { status: 400 })
    }

    // Minimum alışveriş tutarı kontrolü
    if (coupon.minPurchase && Number(subtotal) < Number(coupon.minPurchase)) {
      return NextResponse.json({ 
        message: `Bu kuponu kullanabilmek için sepet tutarı en az ${coupon.minPurchase} TL olmalıdır.` 
      }, { status: 400 })
    }

    let discount = 0
    const val = Number(coupon.value)
    if (coupon.type === "PERCENTAGE") {
      discount = (subtotal * val) / 100
      // Maksimum indirim kontrolü
      if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) {
        discount = Number(coupon.maxDiscount)
      }
    } else {
      discount = val
    }

    // İndirim sepetten büyük olamaz
    if (discount > subtotal) {
      discount = subtotal
    }

    return NextResponse.json({
      code: coupon.code,
      discount: Number(discount.toFixed(2)),
      description: coupon.description
    })

  } catch (error) {
    console.error("Coupon API error:", error)
    return NextResponse.json({ message: "Sunucu hatası." }, { status: 500 })
  }
}
