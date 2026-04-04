import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "~/generated/prisma/client";

declare global {
  var prismaClient: PrismaClient | undefined;
}

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

globalThis.prismaClient ??= new PrismaClient({ adapter });

const prisma = globalThis.prismaClient;

export default prisma;
