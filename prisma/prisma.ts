import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "~/generated/prisma/client";

declare global {
  var prismaClient: PrismaClient | undefined;
}

const databaseUrl = process.env.DATABASE_URL ?? process.env.TURSO_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Defina DATABASE_URL ou TURSO_DATABASE_URL.");
}

const adapter = new PrismaLibSql({
  url: databaseUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

globalThis.prismaClient ??= new PrismaClient({ adapter });

const prisma = globalThis.prismaClient;

export default prisma;
