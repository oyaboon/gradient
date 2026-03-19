-- Add provider-agnostic payment fields (additive; safe for existing Vercel/Neon data)
ALTER TABLE "License" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT;
ALTER TABLE "License" ADD COLUMN IF NOT EXISTS "transactionId" TEXT;
ALTER TABLE "License" ADD COLUMN IF NOT EXISTS "refundId" TEXT;

-- Allow Paddle-only rows: lookup by transactionId instead of stripe session
ALTER TABLE "License" ALTER COLUMN "stripeCheckoutSessionId" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "License_transactionId_key" ON "License"("transactionId");
