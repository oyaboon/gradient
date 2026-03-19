-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "licenseKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "customerEmail" TEXT,
    "stripeCheckoutSessionId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeCustomerId" TEXT,
    "stripeRefundId" TEXT,
    "amountInCents" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "refundedAt" TIMESTAMP(3),

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "License_licenseKey_key" ON "License"("licenseKey");

-- CreateIndex
CREATE UNIQUE INDEX "License_stripeCheckoutSessionId_key" ON "License"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "License_stripePaymentIntentId_key" ON "License"("stripePaymentIntentId");
