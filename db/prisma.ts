import { PrismaClient } from "@/lib/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaNeon({ connectionString });
export const prisma = new PrismaClient({ adapter });
