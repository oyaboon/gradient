import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrismaClient = globalThis as unknown as {
  prismaClient?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

export const prismaClient =
  globalForPrismaClient.prismaClient ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrismaClient.prismaClient = prismaClient;
}
