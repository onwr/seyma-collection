import type { Order, OrderItem, Payment, Shipment } from "@/generated/prisma/client"

const MAX_ITEMS_IN_LOG = 400

type OrderForDeleteLog = Order & {
  items: OrderItem[]
  payments: Payment[]
  shipment: Shipment | null
  user: { id: number; email: string } | null
}

function num(d: unknown): number {
  if (d == null) return 0
  if (typeof d === "number" && Number.isFinite(d)) return d
  const n = Number(d)
  return Number.isFinite(n) ? n : 0
}

/** Silinen siparişin işlem günlüğüne yazılacak tam JSON anlık görüntüsü (Decimal / Date güvenli). */
export function buildOrderDeletionSnapshot(o: OrderForDeleteLog): Record<string, unknown> {
  const items = o.items
  const itemsTruncated = items.length > MAX_ITEMS_IN_LOG
  const itemsSlice = itemsTruncated ? items.slice(0, MAX_ITEMS_IN_LOG) : items

  return {
    id: o.id,
    orderNo: o.orderNo,
    userId: o.userId,
    status: o.status,
    paymentStatus: o.paymentStatus,
    subtotal: num(o.subtotal),
    shippingCost: num(o.shippingCost),
    discountTotal: num(o.discountTotal),
    grandTotal: num(o.grandTotal),
    profit: o.profit != null ? num(o.profit) : null,
    note: o.note,
    guestEmail: o.guestEmail,
    guestPhone: o.guestPhone,
    shippingFullName: o.shippingFullName,
    shippingPhone: o.shippingPhone,
    shippingLine1: o.shippingLine1,
    shippingLine2: o.shippingLine2,
    shippingDistrict: o.shippingDistrict,
    shippingCity: o.shippingCity,
    shippingPostalCode: o.shippingPostalCode,
    shippingCountry: o.shippingCountry,
    billingSameAsShipping: o.billingSameAsShipping,
    billingFullName: o.billingFullName,
    billingPhone: o.billingPhone,
    billingLine1: o.billingLine1,
    billingLine2: o.billingLine2,
    billingDistrict: o.billingDistrict,
    billingCity: o.billingCity,
    billingPostalCode: o.billingPostalCode,
    billingCountry: o.billingCountry,
    billingAddressId: o.billingAddressId,
    shippingAddressId: o.shippingAddressId,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    user: o.user ? { id: o.user.id, email: o.user.email } : null,
    itemsTruncated,
    itemsTotalCount: items.length,
    items: itemsSlice.map((i) => ({
      id: i.id,
      productId: i.productId,
      variantId: i.variantId,
      name: i.name,
      sku: i.sku,
      unitPrice: num(i.unitPrice),
      quantity: i.quantity,
      lineTotal: num(i.lineTotal),
      createdAt: i.createdAt.toISOString(),
    })),
    payments: o.payments.map((p) => ({
      id: p.id,
      method: p.method,
      status: p.status,
      amount: num(p.amount),
      provider: p.provider,
      providerPaymentId: p.providerPaymentId,
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
    shipment: o.shipment
      ? {
          id: o.shipment.id,
          cargoCompany: o.shipment.cargoCompany,
          trackingNo: o.shipment.trackingNo,
          shippedAt: o.shipment.shippedAt?.toISOString() ?? null,
          deliveredAt: o.shipment.deliveredAt?.toISOString() ?? null,
          createdAt: o.shipment.createdAt.toISOString(),
          updatedAt: o.shipment.updatedAt.toISOString(),
        }
      : null,
  }
}
