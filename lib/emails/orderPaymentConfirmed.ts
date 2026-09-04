import { escapeHtml, transactionalEmailHtml } from "@/lib/emails/emailLayout"

export function orderPaymentConfirmedEmailContent(params: {
  siteUrl: string
  orderNo: string
  storeName?: string
}): { subject: string; text: string; html: string } {
  const base = params.siteUrl.replace(/\/$/, "")
  const store = params.storeName ?? "Şeyma Collection"
  const ordersLink = `${base}/siparislerim/${encodeURIComponent(params.orderNo)}`

  const subject = `${store} — Ödemeniz alındı (${params.orderNo})`
  const text = [
    `Merhaba,`,
    ``,
    `${params.orderNo} numaralı siparişiniz için ödemeniz başarıyla alındı.`,
    ``,
    `Detay: ${ordersLink}`,
    ``,
    store,
  ].join("\n")

  const innerHtml = `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px 0;">
  <tr>
    <td align="center" style="padding:20px 16px;background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;">
      <p style="margin:0 0 6px 0;font-size:13px;font-weight:600;color:#047857;letter-spacing:0.02em;">Ödeme onaylandı</p>
      <p style="margin:0;font-size:20px;font-weight:800;letter-spacing:-0.02em;color:#065f46;">Sipariş no ${escapeHtml(params.orderNo)}</p>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:15px;line-height:1.65;color:#334155;">Ödemeniz güvenle alındı. Siparişiniz işleme alınacaktır; ilerleyen adımlar için e-posta ile bilgilendirileceksiniz.</p>
`

  const html = transactionalEmailHtml({
    siteUrl: params.siteUrl,
    storeName: store,
    preheader: `Ödeme onaylandı — ${params.orderNo}`,
    title: "Ödemeniz alındı",
    lead: "Merhaba, ödemeniz başarıyla tamamlandı.",
    innerHtml,
    primaryCta: { href: ordersLink, label: "Siparişi görüntüle" },
  })

  return { subject, text, html }
}
