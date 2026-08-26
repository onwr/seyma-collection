import { z } from "zod"

const hrefSchema = z
  .string()
  .min(1, "Link gerekli")
  .refine(
    (v) => v.startsWith("/") || v.startsWith("http://") || v.startsWith("https://"),
    "Link / veya http(s):// ile başlamalı"
  )

export const headerNavChildSchema = z.object({
  label: z.string().min(1, "Alt link etiketi gerekli").max(191),
  href: hrefSchema,
  openInNewTab: z.boolean().optional().default(false),
})

export const headerNavItemBodySchema = z.object({
  label: z.string().min(1, "Etiket gerekli").max(191),
  href: hrefSchema,
  labelUppercase: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
  openInNewTab: z.boolean().optional().default(false),
  children: z.array(headerNavChildSchema).optional().default([]),
})

export type HeaderNavItemBody = z.infer<typeof headerNavItemBodySchema>
