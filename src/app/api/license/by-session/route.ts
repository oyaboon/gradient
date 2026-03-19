import { NextResponse } from "next/server";
import { prismaClient } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const stripeCheckoutSessionId = requestUrl.searchParams.get("session_id");

  if (!stripeCheckoutSessionId) {
    return NextResponse.json(
      { error: "session_id is required" },
      { status: 400 }
    );
  }

  const licenseRecord = await prismaClient.license.findUnique({
    where: {
      stripeCheckoutSessionId,
    },
  });

  if (!licenseRecord) {
    return NextResponse.json({
      status: "processing",
    });
  }

  return NextResponse.json({
    status: licenseRecord.status,
    license_key: licenseRecord.licenseKey,
  });
}
