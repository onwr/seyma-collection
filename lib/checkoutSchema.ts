import { z } from "zod"

const phoneRegex = /^[\d\s+()-]{10,24}$/

const addressBlock = {
  fullName: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalıdır.").max(200),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "Geçerli bir telefon giriniz.")
    .max(40),
  line1: z.string().trim().min(3, "Adres satırı en az 3 karakter olmalıdır.").max(255),
  line2: z.union([z.string().trim().max(255), z.literal("")]).optional(),
  district: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  postalCode: z.string().trim().min(3).max(20),
}

export const checkoutBodySchema = z
  .object({
    guestEmail: z.union([z.string().trim().email().max(255), z.literal("")]).optional(),
    guestPhone: z.union([z.string().trim().max(40), z.literal("")]).optional(),
    /** Üye: kayıtlı teslimat adresi seçildiğinde sunucu snapshotı bu kayıttan alır. */
    shippingAddressId: z.number().int().positive().optional(),
    billingAddressId: z.number().int().positive().optional(),
    shippingFullName: addressBlock.fullName,
    shippingPhone: addressBlock.phone,
    shippingLine1: addressBlock.line1,
    shippingLine2: z.union([z.string().trim().max(255), z.literal("")]).optional(),
    shippingDistrict: addressBlock.district,
    shippingCity: addressBlock.city,
    shippingPostalCode: addressBlock.postalCode,
    shippingCountry: z.string().trim().length(2).default("TR"),
    billingSameAsShipping: z.boolean(),
    billingFullName: z.union([z.string().trim().max(200), z.literal("")]).optional(),
    billingPhone: z.union([z.string().trim().max(40), z.literal("")]).optional(),
    billingLine1: z.union([z.string().trim().max(255), z.literal("")]).optional(),
    billingLine2: z.union([z.string().trim().max(255), z.literal("")]).optional(),
    billingDistrict: z.union([z.string().trim().max(120), z.literal("")]).optional(),
    billingCity: z.union([z.string().trim().max(120), z.literal("")]).optional(),
    billingPostalCode: z.union([z.string().trim().max(20), z.literal("")]).optional(),
    billingCountry: z.union([z.string().trim().length(2), z.literal("")]).optional(),
    paymentMethod: z.enum(["CASH_ON_DELIVERY", "BANK_TRANSFER", "CREDIT_CARD"]),
    note: z.union([z.string().trim().max(2000), z.literal("")]).optional(),
    couponCode: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.billingSameAsShipping) {
      const need = [
        ["billingFullName", data.billingFullName],
        ["billingPhone", data.billingPhone],
        ["billingLine1", data.billingLine1],
        ["billingDistrict", data.billingDistrict],
        ["billingCity", data.billingCity],
        ["billingPostalCode", data.billingPostalCode],
      ] as const
      for (const [key, val] of need) {
        if (!val || String(val).trim().length < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Fatura adresi için tüm zorunlu alanları doldurun.",
            path: [key],
          })
        }
      }
      if (!data.billingCountry || data.billingCountry.length !== 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Fatura ulke kodu (2 harf) zorunludur.",
          path: ["billingCountry"],
        })
      }
    }
  })

export type CheckoutBody = z.infer<typeof checkoutBodySchema>
