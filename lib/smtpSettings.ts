import type { Transporter } from "nodemailer"
import nodemailer from "nodemailer"
import type SMTPTransport from "nodemailer/lib/smtp-transport"
import type { PrismaClient } from "@/generated/prisma/client"
import { normalizeSmtpHost } from "@/lib/smtpHostNormalize"

export { normalizeSmtpHost }

export const SMTP_HOST_KEY = "SMTP_HOST"
export const SMTP_PORT_KEY = "SMTP_PORT"
export const SMTP_ENCRYPTION_KEY = "SMTP_ENCRYPTION"
export const SMTP_USER_KEY = "SMTP_USER"
export const SMTP_PASSWORD_KEY = "SMTP_PASSWORD"
export const SMTP_FROM_EMAIL_KEY = "SMTP_FROM_EMAIL"
export const SMTP_FROM_NAME_KEY = "SMTP_FROM_NAME"
export const SMTP_AUTO_TLS_KEY = "SMTP_AUTO_TLS"
/** "true" / "false" — kapalıyken sendMail ve SMTP testi gönderim yapmaz. */
export const SMTP_MAIL_ENABLED_KEY = "SMTP_MAIL_ENABLED"

export const SMTP_SETTING_KEYS = [
  SMTP_HOST_KEY,
  SMTP_PORT_KEY,
  SMTP_ENCRYPTION_KEY,
  SMTP_USER_KEY,
  SMTP_PASSWORD_KEY,
  SMTP_FROM_EMAIL_KEY,
  SMTP_FROM_NAME_KEY,
  SMTP_AUTO_TLS_KEY,
] as const

export type SmtpEncryption = "none" | "ssl" | "tls"

export type SmtpConfig = {
  host: string
  port: number
  encryption: SmtpEncryption
  user: string
  password: string
  fromEmail: string
  fromName: string
  autoTls: boolean
}

export type SmtpConfigForAdmin = Omit<SmtpConfig, "password"> & {
  hasPassword: boolean
  mailEnabled: boolean
}

const DEFAULT_PORT = 587
const DEFAULT_ENCRYPTION: SmtpEncryption = "tls"

function parseEncryption(raw: string | undefined): SmtpEncryption {
  if (raw === "none" || raw === "ssl" || raw === "tls") return raw
  return DEFAULT_ENCRYPTION
}

function parseBool(raw: string | undefined, defaultVal: boolean): boolean {
  if (raw == null || raw === "") return defaultVal
  return raw === "true" || raw === "1"
}

export async function getMailOutboundEnabled(prisma: PrismaClient): Promise<boolean> {
  const row = await prisma.setting.findUnique({
    where: { key: SMTP_MAIL_ENABLED_KEY },
  })
  return parseBool(row?.value, false)
}

export async function getSmtpConfig(prisma: PrismaClient): Promise<SmtpConfig> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [...SMTP_SETTING_KEYS] } },
  })
  const map = new Map(rows.map((r) => [r.key, r.value]))

  const port = Number(map.get(SMTP_PORT_KEY) ?? DEFAULT_PORT)
  return {
    host: normalizeSmtpHost(map.get(SMTP_HOST_KEY) ?? ""),
    port: Number.isFinite(port) && port > 0 && port <= 65535 ? port : DEFAULT_PORT,
    encryption: parseEncryption(map.get(SMTP_ENCRYPTION_KEY)),
    user: (map.get(SMTP_USER_KEY) ?? "").trim(),
    password: map.get(SMTP_PASSWORD_KEY) ?? "",
    fromEmail: (map.get(SMTP_FROM_EMAIL_KEY) ?? "").trim(),
    fromName: (map.get(SMTP_FROM_NAME_KEY) ?? "").trim(),
    autoTls: parseBool(map.get(SMTP_AUTO_TLS_KEY), true),
  }
}

export async function getSmtpConfigForAdmin(prisma: PrismaClient): Promise<SmtpConfigForAdmin> {
  const full = await getSmtpConfig(prisma)
  const mailEnabled = await getMailOutboundEnabled(prisma)
  return {
    host: full.host,
    port: full.port,
    encryption: full.encryption,
    user: full.user,
    fromEmail: full.fromEmail,
    fromName: full.fromName,
    autoTls: full.autoTls,
    hasPassword: full.password.length > 0,
    mailEnabled,
  }
}

export type PersistSmtpInput = {
  host: string
  port: number
  encryption: SmtpEncryption
  user: string
  /** Boş string = mevcut şifreyi koru (persist sırasında atlanır) */
  password?: string
  fromEmail: string
  fromName: string
  autoTls: boolean
  mailEnabled: boolean
}

export async function persistSmtpSettings(
  prisma: PrismaClient,
  data: PersistSmtpInput
): Promise<void> {
  const stringRow = (key: string, value: string) =>
    prisma.setting.upsert({
      where: { key },
      create: { key, value, type: "string" },
      update: { value, type: "string" },
    })

  const ops = [
    stringRow(SMTP_HOST_KEY, normalizeSmtpHost(data.host)),
    stringRow(SMTP_PORT_KEY, String(data.port)),
    stringRow(SMTP_ENCRYPTION_KEY, data.encryption),
    stringRow(SMTP_USER_KEY, data.user.trim()),
    stringRow(SMTP_FROM_EMAIL_KEY, data.fromEmail.trim()),
    stringRow(SMTP_FROM_NAME_KEY, data.fromName.trim()),
    stringRow(SMTP_AUTO_TLS_KEY, data.autoTls ? "true" : "false"),
    stringRow(SMTP_MAIL_ENABLED_KEY, data.mailEnabled ? "true" : "false"),
  ]

  if (data.password !== undefined && data.password !== "") {
    ops.push(stringRow(SMTP_PASSWORD_KEY, data.password))
  }

  await prisma.$transaction(ops)
}

/** Nodemailer `createTransport` seçenekleri (host/port/şifreleme/autoTls). */
export function buildSmtpTransportOptions(config: SmtpConfig): SMTPTransport.Options {
  const { host, port, encryption, user, password, autoTls } = config

  const userTrim = user.trim()
  /** Boş şifreyle auth göndermek AUTH PLAIN "Missing credentials" üretir (Yandex vb.). */
  const auth =
    userTrim.length > 0 && password.length > 0
      ? { user: userTrim, pass: password }
      : undefined

  const base = {
    host,
    port,
    auth,
  }

  if (encryption === "ssl") {
    return {
      ...base,
      secure: true,
    }
  }

  if (encryption === "tls") {
    if (!autoTls) {
      return {
        ...base,
        secure: false,
        ignoreTLS: true,
        requireTLS: false,
      }
    }
    return {
      ...base,
      secure: false,
    }
  }

  return {
    ...base,
    secure: false,
    ignoreTLS: true,
  }
}

export function createMailTransport(config: SmtpConfig): Transporter {
  return nodemailer.createTransport(buildSmtpTransportOptions(config))
}

export type SendMailOptions = {
  to: string | string[]
  subject: string
  text?: string
  html?: string
}

export async function sendMailWithConfig(
  config: SmtpConfig,
  options: SendMailOptions
): Promise<void> {
  if (!config.host) {
    throw new Error("SMTP sunucusu ayarlı değil.")
  }
  if (!config.fromEmail) {
    throw new Error("Gönderen e-posta ayarlı değil.")
  }
  if (!config.user.trim()) {
    throw new Error("SMTP kullanıcı adı ayarlı değil.")
  }
  if (!config.password) {
    throw new Error(
      "SMTP şifresi kayıtlı değil. Şifreyi yazıp Kaydet’e basın (Yandex için hesap uygulama şifresi kullanın)."
    )
  }

  const transport = createMailTransport(config)
  const from =
    config.fromName && config.fromName.length > 0
      ? `"${config.fromName.replace(/"/g, "")}" <${config.fromEmail}>`
      : config.fromEmail

  await transport.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  })
}

export async function sendMail(
  prisma: PrismaClient,
  options: SendMailOptions
): Promise<void> {
  const enabled = await getMailOutboundEnabled(prisma)
  if (!enabled) {
    return
  }
  const config = await getSmtpConfig(prisma)
  await sendMailWithConfig(config, options)
}
