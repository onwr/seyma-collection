import { after } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyPaytrCallback } from "@/lib/paytr"
import { OrderStatus, PaymentStatus } from "@/generated/prisma/client"
import { orderPaymentConfirmedEmailContent } from "@/lib/emails/orderPaymentConfirmed"
import { sendMail } from "@/lib/smtpSettings"

function logPaytr(event: string, meta?: Record<string, unknown>) {
  const line = `[paytr-callback] ${event}${meta ? ` ${JSON.stringify(meta)}` : ""}\n`

  try {
    process.stderr.write(line)
  } catch {}

  try {
    process.stdout.write(line)
  } catch {}
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const rawParams = Object.fromEntries(formData.entries())

    const params = {
      merchant_oid: String(rawParams.merchant_oid || ""),
      status: String(rawParams.status || ""),
      total_amount: String(rawParams.total_amount || ""),
      hash: String(rawParams.hash || ""),
      failed_reason_msg: String(rawParams.failed_reason_msg || ""),
    }

    logPaytr("hit", {
      merchant_oid: params.merchant_oid,
      status: params.status,
      total_amount: params.total_amount,
      hashPresent: Boolean(params.hash),
    })

    if (!params.merchant_oid || !params.status || !params.total_amount || !params.hash) {
      logPaytr("missing_required_params", params)
      return new Response("PAYTR: missing params", { status: 400 })
    }

    const isValid = verifyPaytrCallback({
      merchant_oid: params.merchant_oid,
      status: params.status,
      total_amount: params.total_amount,
      hash: params.hash,
    })

    if (!isValid) {
      logPaytr("hash_invalid", {
        merchant_oid: params.merchant_oid,
        status: params.status,
        total_amount: params.total_amount,
        failed_reason_msg: params.failed_reason_msg,
        hashPresent: Boolean(params.hash),
      })

      return new Response("PAYTR: hash check failed", { status: 400 })
    }

    const orderNo = params.merchant_oid

    const order = await prisma.order.findUnique({
      where: { orderNo },
      select: {
        id: true,
        orderNo: true,
        paymentStatus: true,
        guestEmail: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    })

    if (!order) {
      logPaytr("order_not_found", { orderNo })
      return new Response("OK", { status: 200 })
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      logPaytr("skip_already_paid", {
        orderNo,
        incomingStatus: params.status,
      })

      return new Response("OK", { status: 200 })
    }

    if (params.status === "success") {
      const [, payRes] = await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: OrderStatus.PROCESSING,
          },
        }),

        prisma.payment.updateMany({
          where: { orderId: order.id },
          data: {
            status: PaymentStatus.PAID,
          },
        }),
      ])

      if (payRes.count === 0) {
        logPaytr("payment_update_zero_rows", {
          orderId: order.id,
          orderNo,
        })
      }

      logPaytr("payment_success", {
        orderNo,
        paymentRowsUpdated: payRes.count,
      })

      const to = order.user?.email?.trim() || order.guestEmail?.trim() || null
      const siteUrlBase =
        process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.littlemomstore.com"

      if (to) {
        const no = order.orderNo

        after(() => {
          void (async () => {
            try {
              const { subject, text, html } = orderPaymentConfirmedEmailContent({
                siteUrl: siteUrlBase,
                orderNo: no,
              })

              await sendMail(prisma, {
                to,
                subject,
                text,
                html,
              })
            } catch (err) {
              logPaytr("payment_confirmed_email_error", {
                message: err instanceof Error ? err.message : String(err),
              })
            }
          })()
        })
      }
    } else {
      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: PaymentStatus.FAILED,
          },
        }),

        prisma.payment.updateMany({
          where: { orderId: order.id },
          data: {
            status: PaymentStatus.FAILED,
          },
        }),
      ])

      logPaytr("payment_failed", {
        orderNo,
        paytrStatus: params.status,
        failed_reason_msg: params.failed_reason_msg,
      })
    }

    return new Response("OK", { status: 200 })
  } catch (error) {
    logPaytr("handler_exception", {
      message: error instanceof Error ? error.message : String(error),
    })

    return new Response("Error", { status: 500 })
  }
}