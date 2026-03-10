import { NextResponse } from "next/server";
import { RUNTIME_FILENAME } from "@/engine/export-embed";
import { readRuntimeGlobalArtifact } from "@/runtime/runtime-artifacts.server";

/**
 * GET /api/gradient-runtime
 * Serves the gradient runtime JS so the browser can download it via a same-origin
 * URL. This avoids "Insecure download blocked" when triggering download from blob.
 */
export async function GET() {
  const body = await readRuntimeGlobalArtifact();

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Content-Disposition": `attachment; filename="${RUNTIME_FILENAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
