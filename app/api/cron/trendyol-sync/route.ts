import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runTrendyolSync } from "@/lib/trendyolSync"

// VPS'teki sistem crontab'ı bu uç noktayı periyodik `curl` ile tetikler (örn. her 5 dakikada bir).
// Yeni bir arka plan süreci/pm2 kaydı gerektirmiyor. `CRON_SECRET` olmadan 401 döner.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")

  const secret = process.env.CRON_SECRET
  if (!secret || token !== secret) {
    return NextResponse.json({ message: "Yetkisiz." }, { status: 401 })
  }

  const result = await runTrendyolSync(prisma)
  return NextResponse.json(result)
}
