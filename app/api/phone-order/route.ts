import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { PHONE_ORDER_FALLBACK, getPhoneOrderSettings } from "@/lib/phoneOrderSettings"

export const revalidate = 60

export async function GET() {
  try {
    const s = await getPhoneOrderSettings(prisma)
    return NextResponse.json(s)
  } catch {
    return NextResponse.json(PHONE_ORDER_FALLBACK)
  }
}

