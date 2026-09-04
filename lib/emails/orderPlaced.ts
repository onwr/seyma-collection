import type { PaymentMethod } from "@/generated/prisma/client"
import { escapeHtml, transactionalEmailHtml } from "@/lib/emails/emailLayout"

function paymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case "CARD":
      return "Kredi kartı (ödeme sayfasına yönlendirileceksiniz)"
    case "CASH_ON_DELIVERY":
      return "Kapıda ödeme"
    case "BANK_TRANSFER":
      return "Havale / EFT"
    default:
      return String(method)
  }
}

export function orderPlacedEmailContent(params: {
  siteUrl: string
  orderNo: string
  grandTotal: string
  paymentMethod: PaymentMethod
  storeName?: string
}): { subject: string; text: string; html: string } {
  const base = params.siteUrl.replace(/\/$/, "")
  const store = params.storeName ?? "Şeyma Collection"
  const pm = paymentMethodLabel(params.paymentMethod)
  const ordersLink = `${base}/siparislerim/${encodeURIComponent(params.orderNo)}`

  const subject = `${store} — Siparişiniz alındı (${params.orderNo})`
  const text = [
    `Merhaba,`,
    ``,
    `Siparişiniz kaydedildi.`,
    ``,
    `Sipariş no: ${params.orderNo}`,
    `Toplam: ${params.grandTotal} TL`,
    `Ödeme: ${pm}`,
    ``,
    params.paymentMethod === "CARD"
      ? "Kredi kartı ile ödeme için sitedeki yönlendirmeyi tamamlayın."
      : "Sipariş durumunu hesabınızdan veya aşağıdaki bağlantıdan takip edebilirsiniz.",
    ``,
    `Sipariş detayı: ${ordersLink}`,
    ``,
    store,
  ].join("\n")

  const hint =
    params.paymentMethod === "CARD"
      ? `<p style="margin:0;padding:12px 14px;background-color:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:14px;line-height:1.5;color:#92400e;">Kredi kartı ile ödeme için sitedeki yönlendirmeyi tamamlayın.</p>`
      : `<p style="margin:0;padding:12px 14px;background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:14px;line-height:1.5;color:#166534;">Sipariş durumunu aşağıdaki bağlantıdan veya hesabınızdan takip edebilirsiniz.</p>`

  const innerHtml = `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px 0;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
  <tr>
    <td style="padding:16px 18px;">
      <p style="margin:0 0 8px 0;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">Sipariş özeti</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#64748b;">Sipariş no</td>
          <td align="right" style="padding:6px 0;font-size:15px;font-weight:700;color:#0f172a;">${escapeHtml(params.orderNo)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#64748b;">Toplam</td>
          <td align="right" style="padding:6px 0;font-size:15px;font-weight:700;color:#0f172a;">${escapeHtml(params.grandTotal)} TL</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#64748b;">Ödeme</td>
          <td align="right" style="padding:6px 0;font-size:14px;color:#334155;">${escapeHtml(pm)}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
${hint}
`

  const html = transactionalEmailHtml({
    siteUrl: params.siteUrl,
    storeName: store,
    preheader: `Sipariş no ${params.orderNo} — ${params.grandTotal} TL`,
    title: "Siparişiniz alındı",
    lead: "Merhaba, siparişiniz başarıyla kaydedildi. Teşekkür ederiz.",
    innerHtml,
    primaryCta: { href: ordersLink, label: "Siparişi görüntüle" },
  })

  return { subject, text, html }
}
