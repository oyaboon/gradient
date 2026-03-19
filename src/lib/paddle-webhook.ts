import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify Paddle webhook signature.
 * Payload: ts + ":" + rawBody; signature = HMAC-SHA256(secret, payload).
 * Reject if timestamp is too old (replay protection).
 */
const REPLAY_TOLERANCE_SEC = 300;

export function verifyPaddleWebhook(
  rawBody: string,
  paddleSignatureHeader: string,
  secret: string
): boolean {
  if (!paddleSignatureHeader || !secret) return false;

  const parts = paddleSignatureHeader.split(";").reduce<Record<string, string>>(
    (acc, part) => {
      const [key, value] = part.split("=").map((s) => s.trim());
      if (key && value) acc[key] = value;
      return acc;
    },
    {}
  );

  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;

  const tsNum = parseInt(ts, 10);
  if (Number.isNaN(tsNum)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - tsNum) > REPLAY_TOLERANCE_SEC) return false;

  const signedPayload = `${ts}:${rawBody}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(h1, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
