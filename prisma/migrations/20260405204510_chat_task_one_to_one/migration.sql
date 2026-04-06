/*
  Warnings:

  - Added the required column `chat_id` to the `tasks` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "chats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT,
    "content" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "chat_id" INTEGER NOT NULL,
    "steps" TEXT,
    "estimated_time" TEXT NOT NULL,
    "implementation_suggestion" TEXT,
    "acceptance_criteria" TEXT,
    "suggested_tests" TEXT,
    "content" TEXT,
    "chat_history" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tasks_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
  CREATE TEMP TABLE "__task_chat_map" (
    "task_id" TEXT NOT NULL PRIMARY KEY,
    "chat_id" INTEGER NOT NULL UNIQUE
  );
  INSERT INTO "chats" ("title", "content", "created_at", "updated_at")
  SELECT NULL, NULL, "created_at", "updated_at" FROM "tasks" ORDER BY "id";
  INSERT INTO "__task_chat_map" ("task_id", "chat_id")
  WITH task_rows AS (
    SELECT "id" AS "task_id", ROW_NUMBER() OVER (ORDER BY "id") AS "rn"
    FROM "tasks"
  ),
  chat_rows AS (
    SELECT "id" AS "chat_id", ROW_NUMBER() OVER (ORDER BY "id") AS "rn"
    FROM "chats"
  )
  SELECT task_rows."task_id", chat_rows."chat_id"
  FROM task_rows
  JOIN chat_rows ON task_rows."rn" = chat_rows."rn";
  INSERT INTO "new_tasks" ("acceptance_criteria", "chat_history", "chat_id", "content", "created_at", "description", "estimated_time", "id", "implementation_suggestion", "steps", "suggested_tests", "title", "updated_at")
  SELECT "tasks"."acceptance_criteria", "tasks"."chat_history", "__task_chat_map"."chat_id", "tasks"."content", "tasks"."created_at", "tasks"."description", "tasks"."estimated_time", "tasks"."id", "tasks"."implementation_suggestion", "tasks"."steps", "tasks"."suggested_tests", "tasks"."title", "tasks"."updated_at"
  FROM "tasks"
  JOIN "__task_chat_map" ON "__task_chat_map"."task_id" = "tasks"."id";
  DROP TABLE "__task_chat_map";
DROP TABLE "tasks";
ALTER TABLE "new_tasks" RENAME TO "tasks";
CREATE UNIQUE INDEX "tasks_chat_id_key" ON "tasks"("chat_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
