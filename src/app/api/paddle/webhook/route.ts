import { NextResponse } from "next/server";
import { prismaClient } from "@/lib/prisma";
import { createUniqueLicenseKey } from "@/lib/license-keys";
import { verifyPaddleWebhook } from "@/lib/paddle-webhook";
import { fetchPaddleCustomerEmail } from "@/lib/paddle";

export const runtime = "nodejs";

type PaddleWebhookPayload = {
  event_type: string;
  data: Record<string, unknown>;
};

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "PADDLE_WEBHOOK_SECRET is not configured" },
      { status: 500 }
    );
  }

  const signatureHeader = request.headers.get("paddle-signature");
  if (!signatureHeader) {
    return NextResponse.json(
      { error: "Missing Paddle-Signature header" },
      { status: 400 }
    );
  }

  const rawBody = await request.text();

  if (!verifyPaddleWebhook(rawBody, signatureHeader, secret)) {
    console.error("Paddle webhook signature verification failed");
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  let payload: PaddleWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as PaddleWebhookPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook body" },
      { status: 400 }
    );
  }

  try {
    if (payload.event_type === "transaction.completed") {
      const data = payload.data as {
        id: string;
        status: string;
        customer_id?: string | null;
        currency_code?: string;
        details?: { totals?: { total: string } };
        custom_data?: Record<string, string> | null;
      };

      if (data.status !== "completed") {
        return NextResponse.json({ received: true });
      }

      const transactionId = data.id;
      if (!transactionId?.startsWith("txn_")) {
        return NextResponse.json({ received: true });
      }

      const existing = await prismaClient.license.findUnique({
        where: { transactionId },
      });
      if (existing) {
        return NextResponse.json({ received: true });
      }

      const amountTotal = data.details?.totals?.total;
      const amountInCents = amountTotal != null ? parseInt(String(amountTotal), 10) : 0;
      const productCode =
        data.custom_data?.product_code ?? "gradient_full_access";

      let customerEmail: string | null = null;
      if (data.customer_id) {
        customerEmail = await fetchPaddleCustomerEmail(data.customer_id);
      }

      const generatedLicenseKey = await createUniqueLicenseKey();

      await prismaClient.license.create({
        data: {
          licenseKey: generatedLicenseKey,
          status: "active",
          customerEmail,
          paymentProvider: "paddle",
          transactionId,
          stripeCheckoutSessionId: null,
          stripePaymentIntentId: null,
          stripeCustomerId: null,
          stripeRefundId: null,
          refundId: null,
          amountInCents: Number.isNaN(amountInCents) ? 0 : amountInCents,
          currencyCode: data.currency_code ?? "usd",
          productCode,
        },
      });
    }

    if (payload.event_type === "adjustment.updated") {
      const data = payload.data as {
        id: string;
        transaction_id: string;
        action: string;
        status: string;
      };

      if (data.action !== "refund" || data.status !== "approved") {
        return NextResponse.json({ received: true });
      }

      const transactionId = data.transaction_id;
      if (!transactionId) {
        return NextResponse.json({ received: true });
      }

      await prismaClient.license.updateMany({
        where: { transactionId },
        data: {
          status: "refunded",
          refundId: data.id,
          refundedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (errorObject) {
    console.error("Paddle webhook handling failed", errorObject);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
