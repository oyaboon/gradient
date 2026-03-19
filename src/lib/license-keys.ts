import { randomBytes } from "node:crypto";
import { prismaClient } from "@/lib/prisma";

function buildLicenseKey(): string {
  const firstPart = randomBytes(4).toString("hex").toUpperCase();
  const secondPart = randomBytes(4).toString("hex").toUpperCase();
  const thirdPart = randomBytes(4).toString("hex").toUpperCase();

  return `GRADIENT-${firstPart}-${secondPart}-${thirdPart}`;
}

export async function createUniqueLicenseKey(): Promise<string> {
  for (let attemptIndex = 0; attemptIndex < 10; attemptIndex += 1) {
    const generatedLicenseKey = buildLicenseKey();

    const existingLicenseRecord = await prismaClient.license.findUnique({
      where: {
        licenseKey: generatedLicenseKey,
      },
    });

    if (!existingLicenseRecord) {
      return generatedLicenseKey;
    }
  }

  throw new Error("Failed to generate a unique license key");
}
