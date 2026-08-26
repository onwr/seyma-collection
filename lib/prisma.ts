import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import { PrismaClient } from "@/generated/prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: InstanceType<typeof PrismaClient> | undefined
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL tanımlı değil.")
  }
  const adapter = new PrismaMariaDb(url)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
