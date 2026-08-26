import { escapeHtml, transactionalEmailHtml } from "@/lib/emails/emailLayout"

export function passwordResetEmailContent(params: {
  siteUrl: string
  token: string
  storeName?: string
}): { subject: string; text: string; html: string } {
  const base = params.siteUrl.replace(/\/$/, "")
  const store = params.storeName ?? "Little Mom's Store"
  const link = `${base}/reset-password?token=${encodeURIComponent(params.token)}`

  const subject = `${store} — Şifre sıfırlama`
  const text = [
    `Merhaba,`,
    ``,
    `Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın (1 saat geçerlidir):`,
    link,
    ``,
    `Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.`,
    ``,
    store,
  ].join("\n")

  const innerHtml = `
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#334155;">Hesabınız için şifre sıfırlama talebi alındı. Aşağıdaki düğmeye tıklayarak yeni şifrenizi belirleyebilirsiniz. Bağlantı <strong>1 saat</strong> geçerlidir.</p>
<p style="margin:0;padding:12px 14px;background-color:#fef3c7;border:1px solid #fde68a;border-radius:8px;font-size:13px;line-height:1.5;color:#92400e;">Bu isteği <strong>siz yapmadıysanız</strong> bu e-postayı silmeniz yeterlidir; hesabınız güvendedir.</p>
`

  const html = transactionalEmailHtml({
    siteUrl: params.siteUrl,
    storeName: store,
    preheader: "Şifre sıfırlama bağlantısı — 1 saat geçerli",
    title: "Şifre sıfırlama",
    lead: "Merhaba,",
    innerHtml,
    primaryCta: { href: link, label: "Şifremi sıfırla" },
  })

  return { subject, text, html }
}
