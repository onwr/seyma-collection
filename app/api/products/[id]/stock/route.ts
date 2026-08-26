import { Prisma, StockMovementType } from "@/generated/prisma/client"
import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

type StockBody = {
  variantId?: number
  quantity?: number
  type?: StockMovementType
  source?: string
  note?: string
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const productId = Number(id)
    if (Number.isNaN(productId)) {
      return NextResponse.json({ message: "Gecersiz urun id." }, { status: 400 })
    }

    const body = (await request.json()) as StockBody
    const variantId = body.variantId
    const quantity = body.quantity
    const type = body.type
    const source = body.source?.trim()
    const note = body.note?.trim() || null

    if (!variantId || Number.isNaN(variantId)) {
      return NextResponse.json(
        { message: "Stok yonetimi icin variantId zorunludur." },
        { status: 400 }
      )
    }

    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { message: "quantity sifirdan buyuk bir sayi olmalidir." },
        { status: 400 }
      )
    }

    if (!type || !Object.values(StockMovementType).includes(type)) {
      return NextResponse.json(
        { message: "type zorunludur. Gecerli tipler: IN, OUT, ADJUSTMENT, RETURN." },
        { status: 400 }
      )
    }

    if (!source) {
      return NextResponse.json({ message: "source zorunludur." }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findFirst({
        where: { id: variantId, productId },
        select: { id: true, stock: true, productId: true, sku: true, name: true },
      })

      if (!variant) {
        throw new Error("VARIANT_NOT_FOUND")
      }

      const deltaByType: Record<StockMovementType, number> = {
        IN: quantity,
        RETURN: quantity,
        OUT: -quantity,
        ADJUSTMENT: quantity,
      }

      let newStock = variant.stock + deltaByType[type]
      if (type === "ADJUSTMENT") {
        newStock = quantity
      }

      if (newStock < 0) {
        throw new Error("NEGATIVE_STOCK")
      }

      const updatedVariant = await tx.productVariant.update({
        where: { id: variant.id },
        data: { stock: newStock },
        select: { id: true, stock: true, sku: true, name: true, productId: true },
      })

      const movement = await tx.stockMovement.create({
        data: {
          productId,
          variantId: variant.id,
          type,
          quantity,
          source,
          note,
        },
      })

      return { updatedVariant, movement }
    })

    return NextResponse.json({
      message: "Stok hareketi kaydedildi.",
      variant: result.updatedVariant,
      movement: result.movement,
    })
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "VARIANT_NOT_FOUND") {
        return NextResponse.json(
          { message: "Bu urune ait variant bulunamadi." },
          { status: 404 }
        )
      }
      if (error.message === "NEGATIVE_STOCK") {
        return NextResponse.json(
          { message: "Stok sifirin altina dusurulemez." },
          { status: 400 }
        )
      }
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json(
        { message: "Gonderilen productId/variantId iliskisi gecersiz." },
        { status: 400 }
      )
    }

    console.error("Stock POST error:", error)
    return NextResponse.json(
      { message: "Stok guncellenirken beklenmeyen bir hata olustu." },
      { status: 500 }
    )
  }
}
