import type { PrismaClient } from "@/generated/prisma/client"
import {
  PHONE_ORDER_CALL_NUMBER_KEY,
  PHONE_ORDER_WHATSAPP_NUMBER_KEY,
} from "@/lib/admin/storeSettingsRegistry"

export type PhoneOrderSettings = {
  whatsappNumber: string
  callNumber: string
}

export const PHONE_ORDER_FALLBACK: PhoneOrderSettings = {
  whatsappNumber: "",
  callNumber: "",
}

function digitsOnly(input: string): string {
  return input.replace(/\D/g, "")
}

function normalizeWhatsappNumber(raw: string): string {
  return digitsOnly(raw.trim())
}

function normalizeCallNumber(raw: string): string {
  const t = raw.trim()
  if (!t) return ""
  if (t.startsWith("+")) {
    const d = digitsOnly(t)
    return d ? `+${d}` : ""
  }
  return digitsOnly(t)
}

export function telHref(callNumber: string): string {
  if (!callNumber) return "tel:"
  return callNumber.startsWith("+") ? `tel:${callNumber}` : `tel:+${callNumber}`
}

export async function getPhoneOrderSettings(
  prisma: Pick<PrismaClient, "setting">
): Promise<PhoneOrderSettings> {
  const rows = await prisma.setting.findMany({
    where: {
      key: { in: [PHONE_ORDER_WHATSAPP_NUMBER_KEY, PHONE_ORDER_CALL_NUMBER_KEY] },
    },
  })
  const map = new Map(rows.map((r) => [r.key, r.value]))

  const whatsappRaw = map.get(PHONE_ORDER_WHATSAPP_NUMBER_KEY) ?? ""
  const callRaw = map.get(PHONE_ORDER_CALL_NUMBER_KEY) ?? ""

  return {
    whatsappNumber: normalizeWhatsappNumber(whatsappRaw),
    callNumber: normalizeCallNumber(callRaw),
  }
}

