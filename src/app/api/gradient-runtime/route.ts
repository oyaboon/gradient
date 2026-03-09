import { NextResponse } from "next/server";
import { generateRuntimeJavascript, RUNTIME_FILENAME } from "@/engine/export-embed";

/**
 * GET /api/gradient-runtime
 * Serves the gradient runtime JS so the browser can download it via a same-origin
 * URL. This avoids "Insecure download blocked" when triggering download from blob.
 */
export async function GET() {
  const body = generateRuntimeJavascript();

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Content-Disposition": `attachment; filename="${RUNTIME_FILENAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
