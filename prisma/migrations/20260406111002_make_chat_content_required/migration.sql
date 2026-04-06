/*
  Warnings:

  - The primary key for the `chats` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Made the column `content` on table `chats` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_chats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_chats" ("content", "created_at", "id", "title", "updated_at") SELECT COALESCE("content", ''), "created_at", "id", "title", "updated_at" FROM "chats";
DROP TABLE "chats";
ALTER TABLE "new_chats" RENAME TO "chats";
CREATE TABLE "new_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "steps" TEXT,
    "estimated_time" TEXT NOT NULL,
    "implementation_suggestion" TEXT,
    "acceptance_criteria" TEXT,
    "suggested_tests" TEXT,
    "content" TEXT,
    "chat_history" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "chat_id" TEXT NOT NULL,
    CONSTRAINT "tasks_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_tasks" ("acceptance_criteria", "chat_history", "chat_id", "content", "created_at", "description", "estimated_time", "id", "implementation_suggestion", "steps", "suggested_tests", "title", "updated_at") SELECT "acceptance_criteria", "chat_history", "chat_id", "content", "created_at", "description", "estimated_time", "id", "implementation_suggestion", "steps", "suggested_tests", "title", "updated_at" FROM "tasks";
DROP TABLE "tasks";
ALTER TABLE "new_tasks" RENAME TO "tasks";
CREATE UNIQUE INDEX "tasks_chat_id_key" ON "tasks"("chat_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
