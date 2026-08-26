import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { runTrendyolSync } from "@/lib/trendyolSync"

// Admin panelindeki "Şimdi Senkronize Et" butonu — crontab'ın 5 dakikasını beklemeden
// aynı senkronizasyon turunu (sipariş çek → stok/fiyat it → sonuçları kontrol et) tetikler.
export async function POST() {
  const session = await getSessionFromCookies()
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
  }

  const result = await runTrendyolSync(prisma)
  return NextResponse.json(result)
}
