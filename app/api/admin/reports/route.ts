import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/authSession"

const TR_MS = 3 * 60 * 60 * 1000

/** YYYY-MM-DD = Türkiye takvim günü; UTC aralığına çevirir (UTC+3). */
function trYmdToRangeUtc(fromStr: string, toStr: string): { fromUtc: Date; toUtc: Date } {
  const [fy, fm, fd] = fromStr.split("-").map(Number)
  const [ty, tm, td] = toStr.split("-").map(Number)
  const fromUtc = new Date(Date.UTC(fy, fm - 1, fd) - TR_MS)
  const nextDayStartTr = new Date(Date.UTC(ty, tm - 1, td + 1) - TR_MS)
  const toUtc = new Date(nextDayStartTr.getTime() - 1)
  return { fromUtc, toUtc }
}

function trCalendarDayKey(d: Date): string {
  const u = new Date(d.getTime() + TR_MS)
  const y = u.getUTCFullYear()
  const m = String(u.getUTCMonth() + 1).padStart(2, "0")
  const day = String(u.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function addDaysYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + delta))
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`
}

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "from YYYY-MM-DD olmalı"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "to YYYY-MM-DD olmalı"),
})

const MAX_RANGE_DAYS = 366

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookies()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const parsed = querySchema.safeParse({
      from: searchParams.get("from") ?? "",
      to: searchParams.get("to") ?? "",
    })
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Geçersiz parametreler", issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { from, to } = parsed.data
    const { fromUtc, toUtc } = trYmdToRangeUtc(from, to)
    if (fromUtc.getTime() > toUtc.getTime()) {
      return NextResponse.json({ message: "from, to’dan sonra olamaz." }, { status: 400 })
    }

    const spanDays =
      Math.floor((toUtc.getTime() - fromUtc.getTime()) / (24 * 60 * 60 * 1000)) + 1
    if (spanDays > MAX_RANGE_DAYS) {
      return NextResponse.json(
        { message: `En fazla ${MAX_RANGE_DAYS} günlük aralık seçilebilir.` },
        { status: 400 }
      )
    }

    const paidWhere = {
      paymentStatus: "PAID" as const,
      createdAt: { gte: fromUtc, lte: toUtc },
    }

    const orderDateWhere = { createdAt: { gte: fromUtc, lte: toUtc } }

    const prevToUtc = new Date(fromUtc.getTime() - 1)
    const prevSpanMs = toUtc.getTime() - fromUtc.getTime()
    const prevFromUtc = new Date(prevToUtc.getTime() - prevSpanMs)

    const paidWherePrev = {
      paymentStatus: "PAID" as const,
      createdAt: { gte: prevFromUtc, lte: prevToUtc },
    }

    const [
      paidAgg,
      paidAggPrev,
      paidCount,
      paidCountPrev,
      ordersByStatus,
      paidOrdersForDaily,
      topProductsRaw,
      topCategoriesRaw,
      shippingRaw,
      distinctUsers,
      guestOrders,
      paymentsByMethod,
      shipmentCount,
      shipmentsByCompany,
      discountOrdersAgg,
      reviewsPending,
      reviewsPendingInRange,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: paidWhere,
        _sum: {
          grandTotal: true,
          subtotal: true,
          shippingCost: true,
          discountTotal: true,
          profit: true,
        },
      }),
      prisma.order.aggregate({
        where: paidWherePrev,
        _sum: { grandTotal: true },
      }),
      prisma.order.count({ where: paidWhere }),
      prisma.order.count({ where: paidWherePrev }),
      prisma.order.groupBy({
        by: ["status"],
        where: orderDateWhere,
        _count: { _all: true },
      }),
      prisma.order.findMany({
        where: paidWhere,
        select: { createdAt: true, grandTotal: true },
      }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        where: { order: paidWhere },
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { lineTotal: "desc" } },
        take: 50,
      }),
      prisma.$queryRaw<
        { categoryId: number | null; name: string | null; revenue: unknown; quantity: unknown }[]
      >`
        SELECT p.categoryId as categoryId,
               c.name as name,
               SUM(oi.lineTotal) as revenue,
               SUM(oi.quantity) as quantity
        FROM OrderItem oi
        INNER JOIN \`Order\` o ON oi.orderId = o.id
        INNER JOIN Product p ON oi.productId = p.id
        LEFT JOIN Category c ON p.categoryId = c.id
        WHERE o.paymentStatus = 'PAID'
          AND o.createdAt >= ${fromUtc}
          AND o.createdAt <= ${toUtc}
        GROUP BY p.categoryId, c.name
        ORDER BY revenue DESC
        LIMIT 30
      `,
      prisma.$queryRaw<{ city: string; orderCount: bigint; revenue: unknown }[]>`
        SELECT o.shippingCity as city,
               COUNT(*) as orderCount,
               SUM(o.grandTotal) as revenue
        FROM \`Order\` o
        WHERE o.paymentStatus = 'PAID'
          AND o.createdAt >= ${fromUtc}
          AND o.createdAt <= ${toUtc}
        GROUP BY o.shippingCity
        ORDER BY revenue DESC
        LIMIT 30
      `,
      prisma.order.findMany({
        where: {
          paymentStatus: "PAID",
          createdAt: paidWhere.createdAt,
          userId: { not: null },
        },
        distinct: ["userId"],
        select: { userId: true },
      }),
      prisma.order.count({
        where: {
          paymentStatus: "PAID",
          createdAt: paidWhere.createdAt,
          userId: null,
        },
      }),
      prisma.payment.groupBy({
        by: ["method"],
        where: {
          status: "PAID",
          order: orderDateWhere,
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.shipment.count({
        where: {
          shippedAt: { gte: fromUtc, lte: toUtc },
        },
      }),
      prisma.shipment.groupBy({
        by: ["cargoCompany"],
        where: {
          shippedAt: { gte: fromUtc, lte: toUtc },
          cargoCompany: { not: null },
        },
        _count: { _all: true },
      }),
      prisma.order.aggregate({
        where: {
          ...paidWhere,
          discountTotal: { gt: 0 },
        },
        _count: { _all: true },
        _sum: { discountTotal: true },
      }),
      prisma.review.count({ where: { status: "PENDING" } }),
      prisma.review.count({
        where: {
          status: "PENDING",
          createdAt: { gte: fromUtc, lte: toUtc },
        },
      }),
    ])

    const retailPaidWhere = {
      status: "COMPLETED" as const,
      createdAt: paidWhere.createdAt,
    }
    const retailPaidWherePrev = {
      status: "COMPLETED" as const,
      createdAt: paidWherePrev.createdAt,
    }

    const [
      retailAgg,
      retailAggPrev,
      retailCount,
      retailCountPrev,
      retailSalesForDaily,
      retailPaymentsByMethod,
    ] = await Promise.all([
      prisma.storeSale.aggregate({
        where: retailPaidWhere,
        _sum: { grandTotal: true },
      }),
      prisma.storeSale.aggregate({
        where: retailPaidWherePrev,
        _sum: { grandTotal: true },
      }),
      prisma.storeSale.count({ where: retailPaidWhere }),
      prisma.storeSale.count({ where: retailPaidWherePrev }),
      prisma.storeSale.findMany({
        where: retailPaidWhere,
        select: { createdAt: true, grandTotal: true },
      }),
      prisma.storeSale.groupBy({
        by: ["paymentMethod"],
        where: retailPaidWhere,
        _sum: { grandTotal: true },
        _count: { _all: true },
      }),
    ])

    const dailyMap = new Map<
      string,
      { revenue: number; orderCount: number; retailRevenue: number; retailCount: number }
    >()
    for (let cur = from; ; cur = addDaysYmd(cur, 1)) {
      dailyMap.set(cur, { revenue: 0, orderCount: 0, retailRevenue: 0, retailCount: 0 })
      if (cur === to) break
    }

    for (const row of paidOrdersForDaily) {
      const k = trCalendarDayKey(row.createdAt)
      const cell = dailyMap.get(k) ?? {
        revenue: 0,
        orderCount: 0,
        retailRevenue: 0,
        retailCount: 0,
      }
      cell.revenue += Number(row.grandTotal)
      cell.orderCount += 1
      dailyMap.set(k, cell)
    }

    for (const row of retailSalesForDaily) {
      const k = trCalendarDayKey(row.createdAt)
      const cell = dailyMap.get(k) ?? {
        revenue: 0,
        orderCount: 0,
        retailRevenue: 0,
        retailCount: 0,
      }
      cell.retailRevenue += Number(row.grandTotal)
      cell.retailCount += 1
      dailyMap.set(k, cell)
    }

    const daily = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        revenue: v.revenue,
        orderCount: v.orderCount,
        retailRevenue: v.retailRevenue,
        retailCount: v.retailCount,
      }))

    const grandTotal = Number(paidAgg._sum.grandTotal || 0)
    const prevGrand = Number(paidAggPrev._sum.grandTotal || 0)
    const retailGrand = Number(retailAgg._sum.grandTotal || 0)
    const retailPrevGrand = Number(retailAggPrev._sum.grandTotal || 0)
    const pct = (cur: number, prev: number) => {
      if (prev === 0) return cur > 0 ? 100 : 0
      return Math.round(((cur - prev) / prev) * 1000) / 10
    }

    const topProducts = await Promise.all(
      topProductsRaw.map(async (row) => {
        const p = await prisma.product.findUnique({
          where: { id: row.productId },
          select: { name: true, slug: true },
        })
        return {
          productId: row.productId,
          name: p?.name ?? "Bilinmeyen",
          slug: p?.slug ?? "",
          quantity: Number(row._sum.quantity || 0),
          revenue: Number(row._sum.lineTotal || 0),
        }
      })
    )

    const topCategories = topCategoriesRaw.map((r) => ({
      categoryId: r.categoryId,
      name: r.name ?? "Kategorisiz",
      quantity: Number(r.quantity ?? 0),
      revenue: Number(r.revenue ?? 0),
    }))

    const shippingCities = shippingRaw.map((r) => ({
      city: r.city || "—",
      orderCount: Number(r.orderCount),
      revenue: Number(r.revenue ?? 0),
    }))

    const pctChangeRevenue = pct(grandTotal, prevGrand)
    const pctChangeOrders = pct(paidCount, paidCountPrev)
    const pctChangeRetailRevenue = pct(retailGrand, retailPrevGrand)
    const pctChangeRetailCount = pct(retailCount, retailCountPrev)

    return NextResponse.json({
      range: { from, to, fromUtc: fromUtc.toISOString(), toUtc: toUtc.toISOString() },
      summary: {
        revenue: grandTotal,
        onlineRevenue: grandTotal,
        retailRevenue: retailGrand,
        combinedRevenue: grandTotal + retailGrand,
        orderCount: paidCount,
        retailSaleCount: retailCount,
        averageOrderValue: paidCount > 0 ? Math.round((grandTotal / paidCount) * 100) / 100 : 0,
        subtotal: Number(paidAgg._sum.subtotal || 0),
        shippingCost: Number(paidAgg._sum.shippingCost || 0),
        discountTotal: Number(paidAgg._sum.discountTotal || 0),
        profit: paidAgg._sum.profit != null ? Number(paidAgg._sum.profit) : null,
        ordersWithDiscountCount: discountOrdersAgg._count._all,
        ordersWithDiscountSum: Number(discountOrdersAgg._sum.discountTotal || 0),
        previousPeriod: {
          fromUtc: prevFromUtc.toISOString(),
          toUtc: prevToUtc.toISOString(),
          revenue: prevGrand,
          orderCount: paidCountPrev,
          retailRevenue: retailPrevGrand,
          retailSaleCount: retailCountPrev,
        },
        pctChangeRevenue,
        pctChangeOrders,
        pctChangeRetailRevenue,
        pctChangeRetailCount,
      },
      daily,
      ordersByStatus: ordersByStatus.map((r) => ({
        status: r.status,
        count: r._count._all,
      })),
      paymentsByMethod: paymentsByMethod.map((r) => ({
        method: r.method,
        count: r._count._all,
        amount: Number(r._sum.amount || 0),
      })),
      retailPaymentsByMethod: retailPaymentsByMethod.map((r) => ({
        method: r.paymentMethod,
        count: r._count._all,
        amount: Number(r._sum.grandTotal || 0),
      })),
      topProducts,
      topCategories,
      shippingCities,
      customers: {
        registeredWithOrders: distinctUsers.length,
        guestOrders,
      },
      shipments: {
        shippedCount: shipmentCount,
        byCompany: shipmentsByCompany.map((s) => ({
          company: s.cargoCompany || "—",
          count: s._count._all,
        })),
      },
      reviews: {
        pendingTotal: reviewsPending,
        pendingCreatedInRange: reviewsPendingInRange,
      },
    })
  } catch (e) {
    console.error("admin reports:", e)
    return NextResponse.json({ message: "Rapor oluşturulamadı." }, { status: 500 })
  }
}
