import { NextResponse } from "next/server";
import { prismaClient } from "@/lib/prisma";

export type VerifyRequest = { license_key: string };
export type VerifyResponse = {
  is_valid: boolean;
  license_status: string;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyRequest;
    const license_key = body?.license_key?.trim();

    if (!license_key) {
      return NextResponse.json<VerifyResponse>(
        { is_valid: false, license_status: "invalid" },
        { status: 400 }
      );
    }

    const licenseRecord = await prismaClient.license.findUnique({
      where: {
        licenseKey: license_key,
      },
    });

    if (!licenseRecord) {
      return NextResponse.json<VerifyResponse>({
        is_valid: false,
        license_status: "invalid",
      });
    }

    if (licenseRecord.status === "refunded") {
      return NextResponse.json<VerifyResponse>({
        is_valid: false,
        license_status: "refunded",
      });
    }

    if (licenseRecord.status === "revoked") {
      return NextResponse.json<VerifyResponse>({
        is_valid: false,
        license_status: "invalid",
      });
    }

    return NextResponse.json<VerifyResponse>({
      is_valid: true,
      license_status: "active",
    });
  } catch {
    return NextResponse.json<VerifyResponse>(
      { is_valid: false, license_status: "invalid" },
      { status: 500 }
    );
  }
}
