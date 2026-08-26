import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { FOOTER_SOCIAL_FALLBACK, getFooterSocialUrls } from "@/lib/footerSocialSettings"

export const revalidate = 60

export async function GET() {
  try {
    const urls = await getFooterSocialUrls(prisma)
    return NextResponse.json(urls)
  } catch {
    return NextResponse.json(FOOTER_SOCIAL_FALLBACK)
  }
}
