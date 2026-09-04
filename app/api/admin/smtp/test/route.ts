import { NextResponse } from "next/server"
import { z } from "zod"
import { PaymentMethod } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"
import { moneyString } from "@/lib/checkoutTotals"
import { orderPlacedEmailContent } from "@/lib/emails/orderPlaced"
import {
  getMailOutboundEnabled,
  getSmtpConfig,
  sendMailWithConfig,
} from "@/lib/smtpSettings"
import { AdminActivityAction, logAdminActivity } from "@/lib/adminActivityLog"

const PAYMENT_METHODS = ["CARD", "CASH_ON_DELIVERY", "BANK_TRANSFER"] as const

const testSchema = z.object({
  to: z.string().email(),
  /** `simple`: kısa doğrulama mesajı. `order_placed`: checkout sonrası gönderilen sipariş alındı şablonu (simülasyon). */
  template: z.enum(["simple", "order_placed"]).optional().default("simple"),
  /** Yalnızca `order_placed` için; checkout’taki `orderPlacedEmailContent` ile aynı metin varyantı. */
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
})

function safeErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) {
    const msg = err.message.trim()
    const lower = msg.toLowerCase()
    if (lower.includes("eula") || lower.includes("accept eula")) {
      return (
        "Yandex (ve benzeri) posta: Sunucu “kullanım koşullarını kabul edin” diyor. " +
        "Tarayıcıdan bu posta kutusuna giriş yapın (ör. mail.yandex.com), çıkan sözleşmeyi onaylayın; " +
        "gerekirse “Posta programları” / uygulama şifresi ile SMTP kullanın. Ardından testi tekrarlayın."
      )
    }
    if (msg.includes("Missing credentials") || msg.includes("EAUTH")) {
      return "SMTP kimlik doğrulaması başarısız. Kullanıcı adı ve uygulama şifresini girip Kaydet’e basın, ardından tekrar deneyin."
    }
    if (msg.length > 200) return "Gönderim başarısız. Ayarları ve sunucu günlüklerini kontrol edin."
    return msg
  }
  return "Gönderim başarısız."
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz." }, { status: 403 })
    }

    const json = await request.json()
    const parsed = testSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Geçerli bir alıcı e-postası girin.", issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const mailOn = await getMailOutboundEnabled(prisma)
    if (!mailOn) {
      return NextResponse.json(
        {
          message:
            "E-posta gönderimi kapalı. SMTP sayfasından “E-posta gönderimini aç” seçeneğini etkinleştirip Kaydet’e basın.",
        },
        { status: 400 }
      )
    }

    const config = await getSmtpConfig(prisma)
    if (!config.host) {
      return NextResponse.json({ message: "SMTP sunucusu (host) ayarlı değil." }, { status: 400 })
    }
    if (!config.fromEmail) {
      return NextResponse.json({ message: "Gönderen e-posta ayarlı değil." }, { status: 400 })
    }

    const siteUrlBase =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.seymacollection.com"

    try {
      if (parsed.data.template === "order_placed") {
        const pm = (parsed.data.paymentMethod ?? "BANK_TRANSFER") as PaymentMethod
        const demoOrderNo = "DEMO-SMTP-TEST"
        const { subject, text, html } = orderPlacedEmailContent({
          siteUrl: siteUrlBase,
          orderNo: demoOrderNo,
          grandTotal: moneyString(1499.99),
          paymentMethod: pm,
        })
        await sendMailWithConfig(config, { to: parsed.data.to, subject, text, html })
      } else {
        await sendMailWithConfig(config, {
          to: parsed.data.to,
          subject: "Şeyma Collection — SMTP testi",
          text: "Bu e-posta, yönetim panelindeki SMTP ayarlarınızın doğru çalıştığını doğrulamak için gönderilmiştir.",
          html: "<p>Bu e-posta, yönetim panelindeki <strong>SMTP</strong> ayarlarınızın doğru çalıştığını doğrulamak için gönderilmiştir.</p>",
        })
      }
    } catch (err) {
      console.error("SMTP test send:", err)
      const message = safeErrorMessage(err)
      const clientConfigError =
        message.includes("ayarlı değil") ||
        message.includes("kayıtlı değil") ||
        message.includes("Kaydet")
      return NextResponse.json(
        { message },
        { status: clientConfigError ? 400 : 502 }
      )
    }

    const pmForLog =
      parsed.data.template === "order_placed"
        ? (parsed.data.paymentMethod ?? "BANK_TRANSFER")
        : undefined
    await logAdminActivity(prisma, session, {
      action: AdminActivityAction.SMTP_TEST,
      resourceType: "SMTP",
      metadata: {
        to: parsed.data.to,
        template: parsed.data.template,
        ...(pmForLog ? { paymentMethod: pmForLog } : {}),
      },
      request,
    })
    const okMessage =
      parsed.data.template === "order_placed"
        ? "“Sipariş alındı” şablonu gönderildi (sipariş no DEMO-SMTP-TEST — yalnızca örnek)."
        : "Test e-postası gönderildi."
    return NextResponse.json({ ok: true, message: okMessage })
  } catch (e) {
    console.error("POST /api/admin/smtp/test:", e)
    return NextResponse.json({ message: "İşlem tamamlanamadı." }, { status: 500 })
  }
}
