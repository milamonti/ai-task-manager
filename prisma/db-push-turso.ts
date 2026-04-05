import "dotenv/config";
import { createClient } from "@libsql/client";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

type MigrationDir = {
  name: string;
  sqlPath: string;
};

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const prev = i > 0 ? sql[i - 1] : "";

    if ((char === "'" || char === '"') && prev !== "\\") {
      if (quote === char) {
        quote = null;
      } else if (!quote) {
        quote = char;
      }
    }

    if (char === ";" && !quote) {
      const statement = current.trim();
      if (statement.length > 0) {
        statements.push(statement);
      }
      current = "";
      continue;
    }

    current += char;
  }

  const trailing = current.trim();
  if (trailing.length > 0) {
    statements.push(trailing);
  }

  return statements;
}

async function listMigrations(migrationsRoot: string): Promise<MigrationDir[]> {
  const entries = await readdir(migrationsRoot, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      sqlPath: path.join(migrationsRoot, entry.name, "migration.sql"),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function main() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (!url) {
    throw new Error(
      "Defina TURSO_DATABASE_URL para aplicar migrations no Turso.",
    );
  }

  if (!authToken) {
    throw new Error(
      "Defina TURSO_AUTH_TOKEN para aplicar migrations no Turso.",
    );
  }

  const client = createClient({ url, authToken });
  const migrationsRoot = path.resolve("prisma", "migrations");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS __turso_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const existing = await client.execute(
    "SELECT migration_name FROM __turso_migrations",
  );
  const applied = new Set(
    existing.rows.map((row) => String(row.migration_name)),
  );
  const migrations = await listMigrations(migrationsRoot);

  for (const migration of migrations) {
    if (applied.has(migration.name)) {
      console.log(`- migration ja aplicada: ${migration.name}`);
      continue;
    }

    const sql = await readFile(migration.sqlPath, "utf-8");
    const statements = splitSqlStatements(sql);

    for (const statement of statements) {
      try {
        await client.execute(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const alreadyExists =
          message.includes("already exists") ||
          message.includes("duplicate column name") ||
          message.includes("UNIQUE constraint failed");

        if (!alreadyExists) {
          throw error;
        }
      }
    }

    await client.execute({
      sql: "INSERT INTO __turso_migrations (migration_name) VALUES (?)",
      args: [migration.name],
    });

    console.log(`+ migration aplicada no Turso: ${migration.name}`);
  }

  client.close();
  console.log("Sincronizacao com Turso concluida.");
}

main().catch((error) => {
  console.error("Erro ao sincronizar schema no Turso:", error);
  process.exit(1);
});
