import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
try {
  const result = await prisma.$queryRaw`SELECT 1 AS ok`;
  console.log("DATABASE_URL connection OK:", result);
} catch (error) {
  console.error("DATABASE_URL connection failed:", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
