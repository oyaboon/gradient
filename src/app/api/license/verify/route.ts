import { NextResponse } from "next/server";

export type VerifyRequest = { license_key: string };
export type VerifyResponse = {
  is_valid: boolean;
  license_status: string;
};

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

    // Placeholder: Stripe (or other provider) verification will be wired here.
    // For MVP, accept a known test key for development.
    const STRIPE_LICENSE_CHECK = process.env.STRIPE_SECRET_KEY;
    const isTestKey = license_key === "gradient-mvp-test-key";

    if (isTestKey) {
      return NextResponse.json<VerifyResponse>({
        is_valid: true,
        license_status: "active",
      });
    }

    if (!STRIPE_LICENSE_CHECK) {
      return NextResponse.json<VerifyResponse>({
        is_valid: false,
        license_status: "invalid",
      });
    }

    // TODO: call Stripe (or license service) to validate license_key
    return NextResponse.json<VerifyResponse>({
      is_valid: false,
      license_status: "invalid",
    });
  } catch {
    return NextResponse.json<VerifyResponse>(
      { is_valid: false, license_status: "invalid" },
      { status: 500 }
    );
  }
}
