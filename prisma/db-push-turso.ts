import "dotenv/config";
import { createClient } from "@libsql/client";
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

type MigrationDir = {
  name: string;
  sqlPath: string;
};

type AppliedMigration = {
  migrationName: string;
  checksum: string | null;
};

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let quote: "'" | '"' | "`" | null = null;
  let lineComment = false;
  let blockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const next = i + 1 < sql.length ? sql[i + 1] : "";

    if (lineComment) {
      current += char;
      if (char === "\n") {
        lineComment = false;
      }
      continue;
    }

    if (blockComment) {
      current += char;
      if (char === "*" && next === "/") {
        current += "/";
        i++;
        blockComment = false;
      }
      continue;
    }

    if (!quote && char === "-" && next === "-") {
      current += "--";
      i++;
      lineComment = true;
      continue;
    }

    if (!quote && char === "/" && next === "*") {
      current += "/*";
      i++;
      blockComment = true;
      continue;
    }

    if (!quote && (char === "'" || char === '"' || char === "`")) {
      quote = char;
      current += char;
      continue;
    }

    if (quote) {
      current += char;

      if (char === quote) {
        // SQL escapes single and double quotes by doubling them.
        if ((quote === "'" || quote === '"') && next === quote) {
          current += next;
          i++;
          continue;
        }
        quote = null;
      }
      continue;
    }

    if (char === ";") {
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

function computeChecksum(sql: string): string {
  return createHash("sha256").update(sql, "utf8").digest("hex");
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

async function executeInTransaction(
  client: ReturnType<typeof createClient>,
  statements: string[],
): Promise<void> {
  await client.execute("BEGIN");
  try {
    for (const statement of statements) {
      await client.execute(statement);
    }
    await client.execute("COMMIT");
  } catch (error) {
    try {
      await client.execute("ROLLBACK");
    } catch {
      // Ignore rollback error and throw original migration error.
    }
    throw error;
  }
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
      checksum TEXT,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const tableInfo = await client.execute(
    "PRAGMA table_info('__turso_migrations')",
  );
  const hasChecksumColumn = tableInfo.rows.some(
    (row) => String(row.name) === "checksum",
  );
  if (!hasChecksumColumn) {
    await client.execute(
      "ALTER TABLE __turso_migrations ADD COLUMN checksum TEXT",
    );
  }

  const existing = await client.execute(
    "SELECT migration_name, checksum FROM __turso_migrations",
  );
  const appliedByName = new Map<string, AppliedMigration>();
  for (const row of existing.rows) {
    const migrationName = String(row.migration_name);
    const checksum = row.checksum == null ? null : String(row.checksum);
    appliedByName.set(migrationName, { migrationName, checksum });
  }

  const migrations = await listMigrations(migrationsRoot);

  for (const migration of migrations) {
    const sql = await readFile(migration.sqlPath, "utf-8");
    const checksum = computeChecksum(sql);
    const alreadyApplied = appliedByName.get(migration.name);

    if (alreadyApplied) {
      if (alreadyApplied.checksum && alreadyApplied.checksum !== checksum) {
        throw new Error(
          `Checksum divergente na migration '${migration.name}'. Nao altere migrations ja aplicadas; crie uma nova migration.`,
        );
      }
      console.log(`- migration ja aplicada: ${migration.name}`);
      continue;
    }

    const statements = splitSqlStatements(sql);

    if (statements.length === 0) {
      console.log(
        `- migration vazia, marcada como aplicada: ${migration.name}`,
      );
    } else {
      await executeInTransaction(client, statements);
    }

    await client.execute("BEGIN");
    try {
      await client.execute({
        sql: "INSERT INTO __turso_migrations (migration_name, checksum) VALUES (?, ?)",
        args: [migration.name, checksum],
      });
      await client.execute("COMMIT");
    } catch (error) {
      try {
        await client.execute("ROLLBACK");
      } catch {
        // Ignore rollback error and throw original insert error.
      }
      throw error;
    }

    console.log(`+ migration aplicada no Turso: ${migration.name}`);
  }

  client.close();
  console.log("Sincronizacao com Turso concluida.");
}

main().catch((error) => {
  console.error("Erro ao sincronizar schema no Turso:", error);
  process.exit(1);
});
