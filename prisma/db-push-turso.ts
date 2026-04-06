import "dotenv/config";
import { createClient } from "@libsql/client";
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

type MigrationDir = {
  name: string;
  sqlPath: string;
};

type DatabaseObject = {
  name: string;
  type: "table" | "index" | "view" | "trigger";
  sql: string | null;
};

function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function toSqlArg(
  value: unknown,
): string | number | bigint | boolean | Uint8Array | ArrayBuffer | null {
  if (value == null) {
    return null;
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }

  return JSON.stringify(value);
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

async function listDatabaseObjects(
  client: ReturnType<typeof createClient>,
): Promise<DatabaseObject[]> {
  const result = await client.execute(`
    SELECT name, type, sql
    FROM sqlite_master
    WHERE type IN ('table', 'index', 'view', 'trigger')
      AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `);

  return result.rows.map((row) => ({
    name: String(row.name),
    type: String(row.type) as DatabaseObject["type"],
    sql: row.sql == null ? null : String(row.sql),
  }));
}

async function dropDestinationObjects(
  destination: ReturnType<typeof createClient>,
): Promise<void> {
  const destinationObjects = await listDatabaseObjects(destination);
  const byType = {
    trigger: destinationObjects.filter((object) => object.type === "trigger"),
    view: destinationObjects.filter((object) => object.type === "view"),
    index: destinationObjects.filter((object) => object.type === "index"),
    table: destinationObjects.filter((object) => object.type === "table"),
  };

  for (const trigger of byType.trigger) {
    await destination.execute(
      `DROP TRIGGER IF EXISTS ${quoteIdentifier(trigger.name)}`,
    );
  }
  for (const view of byType.view) {
    await destination.execute(
      `DROP VIEW IF EXISTS ${quoteIdentifier(view.name)}`,
    );
  }
  for (const index of byType.index) {
    await destination.execute(
      `DROP INDEX IF EXISTS ${quoteIdentifier(index.name)}`,
    );
  }
  for (const table of byType.table) {
    await destination.execute(
      `DROP TABLE IF EXISTS ${quoteIdentifier(table.name)}`,
    );
  }
}

async function copyTableRows(
  source: ReturnType<typeof createClient>,
  destination: ReturnType<typeof createClient>,
  tableName: string,
): Promise<number> {
  const tableInfo = await source.execute(
    `PRAGMA table_info(${quoteIdentifier(tableName)})`,
  );
  const columns = tableInfo.rows.map((row) => String(row.name));

  if (columns.length === 0) {
    return 0;
  }

  const data = await source.execute(
    `SELECT * FROM ${quoteIdentifier(tableName)}`,
  );

  if (data.rows.length === 0) {
    return 0;
  }

  const insertSql = `INSERT INTO ${quoteIdentifier(tableName)} (${columns
    .map(quoteIdentifier)
    .join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;

  for (const row of data.rows) {
    const rowData = row as Record<string, unknown>;
    const args = columns.map((column) => toSqlArg(rowData[column]));
    await destination.execute({ sql: insertSql, args });
  }

  return data.rows.length;
}

async function resolveTableCopyOrder(
  source: ReturnType<typeof createClient>,
  tableNames: string[],
): Promise<string[]> {
  const tableSet = new Set(tableNames);
  const dependencies = new Map<string, Set<string>>();
  const reverseEdges = new Map<string, Set<string>>();

  for (const tableName of tableNames) {
    dependencies.set(tableName, new Set<string>());
    reverseEdges.set(tableName, new Set<string>());
  }

  for (const tableName of tableNames) {
    const fkInfo = await source.execute(
      `PRAGMA foreign_key_list(${quoteIdentifier(tableName)})`,
    );

    for (const row of fkInfo.rows) {
      const referencedTable = String(row.table);
      if (tableSet.has(referencedTable)) {
        dependencies.get(tableName)!.add(referencedTable);
        reverseEdges.get(referencedTable)!.add(tableName);
      }
    }
  }

  const inDegree = new Map<string, number>();
  for (const tableName of tableNames) {
    inDegree.set(tableName, dependencies.get(tableName)!.size);
  }

  const queue = tableNames
    .filter((tableName) => inDegree.get(tableName) === 0)
    .sort((a, b) => a.localeCompare(b));
  const ordered: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    ordered.push(current);

    const dependents = Array.from(reverseEdges.get(current) ?? []).sort(
      (a, b) => a.localeCompare(b),
    );
    for (const dependent of dependents) {
      const nextInDegree = (inDegree.get(dependent) ?? 0) - 1;
      inDegree.set(dependent, nextInDegree);
      if (nextInDegree === 0) {
        queue.push(dependent);
        queue.sort((a, b) => a.localeCompare(b));
      }
    }
  }

  if (ordered.length === tableNames.length) {
    return ordered;
  }

  const remaining = tableNames
    .filter((tableName) => !ordered.includes(tableName))
    .sort((a, b) => a.localeCompare(b));

  return [...ordered, ...remaining];
}

async function mirrorLocalDatabaseToTurso(
  source: ReturnType<typeof createClient>,
  destination: ReturnType<typeof createClient>,
): Promise<void> {
  const sourceObjects = await listDatabaseObjects(source);
  const sourceTables = sourceObjects
    .filter(
      (object) =>
        object.type === "table" &&
        object.sql &&
        object.name !== "__turso_migrations",
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  const sourceIndexes = sourceObjects
    .filter((object) => object.type === "index" && object.sql)
    .sort((a, b) => a.name.localeCompare(b.name));
  const sourceViews = sourceObjects
    .filter((object) => object.type === "view" && object.sql)
    .sort((a, b) => a.name.localeCompare(b.name));
  const sourceTriggers = sourceObjects
    .filter((object) => object.type === "trigger" && object.sql)
    .sort((a, b) => a.name.localeCompare(b.name));

  const tableCopyOrder = await resolveTableCopyOrder(
    source,
    sourceTables.map((table) => table.name),
  );

  await destination.execute("PRAGMA foreign_keys=OFF");
  try {
    await dropDestinationObjects(destination);

    for (const table of sourceTables) {
      await destination.execute(table.sql!);
    }

    for (const tableName of tableCopyOrder) {
      const copied = await copyTableRows(source, destination, tableName);
      if (copied > 0) {
        console.log(`+ ${copied} registro(s) copiados para ${tableName}`);
      }
    }

    for (const index of sourceIndexes) {
      await destination.execute(index.sql!);
    }
    for (const view of sourceViews) {
      await destination.execute(view.sql!);
    }
    for (const trigger of sourceTriggers) {
      await destination.execute(trigger.sql!);
    }
  } finally {
    await destination.execute("PRAGMA foreign_keys=ON");
  }
}

async function refreshMigrationMetadata(
  destination: ReturnType<typeof createClient>,
  migrationsRoot: string,
): Promise<void> {
  const migrations = await listMigrations(migrationsRoot);

  await destination.execute(`
    CREATE TABLE IF NOT EXISTS __turso_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_name TEXT NOT NULL UNIQUE,
      checksum TEXT,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await destination.execute("DELETE FROM __turso_migrations");

  for (const migration of migrations) {
    const sql = await readFile(migration.sqlPath, "utf-8");
    const checksum = computeChecksum(sql);
    await destination.execute({
      sql: "INSERT INTO __turso_migrations (migration_name, checksum) VALUES (?, ?)",
      args: [migration.name, checksum],
    });
  }
}

async function main() {
  const localDatabaseUrl = process.env.DATABASE_URL?.trim();
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (!localDatabaseUrl) {
    throw new Error("Defina DATABASE_URL apontando para o SQLite local.");
  }

  if (!localDatabaseUrl.startsWith("file:")) {
    throw new Error(
      "DATABASE_URL precisa usar o formato file:... para sincronizar local -> Turso.",
    );
  }

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

  const localClient = createClient({ url: localDatabaseUrl });
  const tursoClient = createClient({ url, authToken });
  const migrationsRoot = path.resolve("prisma", "migrations");

  try {
    console.log("Sincronizando schema e dados do SQLite local para o Turso...");
    await mirrorLocalDatabaseToTurso(localClient, tursoClient);
    await refreshMigrationMetadata(tursoClient, migrationsRoot);
  } finally {
    localClient.close();
    tursoClient.close();
  }

  console.log("Sincronizacao com Turso concluida.");
}

main().catch((error) => {
  console.error("Erro ao sincronizar schema no Turso:", error);
  process.exit(1);
});
