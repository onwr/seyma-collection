import type { OrderStatus } from "@/generated/prisma/client"
import { escapeHtml, transactionalEmailHtml } from "@/lib/emails/emailLayout"

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Bekliyor",
  PAID: "Ödendi",
  PROCESSING: "Hazırlanıyor",
  SHIPPED: "Kargoya verildi",
  DELIVERED: "Teslim edildi",
  CANCELLED: "İptal edildi",
  REFUNDED: "İade edildi",
}

/** Duruma göre kısa açıklama (satır içi) */
function statusBlurb(status: OrderStatus): string {
  switch (status) {
    case "SHIPPED":
      return "Kargonuz yola çıktı; takip için sipariş detayına göz atabilirsiniz."
    case "DELIVERED":
      return "Teslimat tamamlandı. Alışverişiniz için teşekkür ederiz."
    case "CANCELLED":
      return "Bu sipariş iptal edilmiştir. Sorularınız için bizimle iletişime geçebilirsiniz."
    case "REFUNDED":
      return "İade süreciyle ilgili bilgiler hesabınızdan takip edilebilir."
    case "PROCESSING":
      return "Siparişiniz hazırlanıyor; güncellemeler için bildirimleri kontrol edin."
    default:
      return "Sipariş durumunuz güncellendi."
  }
}

export function orderStatusLabel(status: OrderStatus): string {
  return STATUS_LABELS[status] ?? status
}

export function orderStatusEmailContent(params: {
  siteUrl: string
  orderNo: string
  newStatus: OrderStatus
  storeName?: string
}): { subject: string; text: string; html: string } {
  const base = params.siteUrl.replace(/\/$/, "")
  const store = params.storeName ?? "Little Mom's Store"
  const label = orderStatusLabel(params.newStatus)
  const ordersLink = `${base}/siparislerim/${encodeURIComponent(params.orderNo)}`

  const subject = `${store} — Sipariş durumu: ${label} (${params.orderNo})`
  const text = [
    `Merhaba,`,
    ``,
    `Sipariş numaranız ${params.orderNo} için durum güncellendi.`,
    ``,
    `Yeni durum: ${label}`,
    ``,
    `Detay: ${ordersLink}`,
    ``,
    store,
  ].join("\n")

  const blurb = statusBlurb(params.newStatus)
  const badgeBg =
    params.newStatus === "CANCELLED" || params.newStatus === "REFUNDED"
      ? "#fef2f2"
      : params.newStatus === "DELIVERED"
        ? "#f0fdf4"
        : "#eff6ff"
  const badgeBorder =
    params.newStatus === "CANCELLED" || params.newStatus === "REFUNDED"
      ? "#fecaca"
      : params.newStatus === "DELIVERED"
        ? "#bbf7d0"
        : "#bfdbfe"
  const badgeColor =
    params.newStatus === "CANCELLED" || params.newStatus === "REFUNDED"
      ? "#991b1b"
      : params.newStatus === "DELIVERED"
        ? "#166534"
        : "#1e40af"

  const innerHtml = `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px 0;">
  <tr>
    <td style="padding:14px 16px;background-color:${badgeBg};border:1px solid ${badgeBorder};border-radius:10px;text-align:center;">
      <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Yeni durum</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:${badgeColor};">${escapeHtml(label)}</p>
    </td>
  </tr>
</table>
<p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#334155;">Sipariş numaranız <strong>${escapeHtml(params.orderNo)}</strong> için güncelleme yapıldı.</p>
<p style="margin:0;font-size:14px;line-height:1.55;color:#64748b;">${escapeHtml(blurb)}</p>
`

  const html = transactionalEmailHtml({
    siteUrl: params.siteUrl,
    storeName: store,
    preheader: `${label} — ${params.orderNo}`,
    title: "Sipariş durumu güncellendi",
    lead: "Merhaba, siparişinizle ilgili yeni bir güncelleme var.",
    innerHtml,
    primaryCta: { href: ordersLink, label: "Siparişi görüntüle" },
  })

  return { subject, text, html }
}
