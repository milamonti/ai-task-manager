/*
  Warnings:

  - You are about to drop the `posts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `chat_id` on the `tasks` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "users_email_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "posts";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "users";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "chat_message_id" TEXT,
    CONSTRAINT "tasks_chat_message_id_fkey" FOREIGN KEY ("chat_message_id") REFERENCES "chat_messages" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_tasks" ("acceptance_criteria", "chat_history", "content", "created_at", "description", "estimated_time", "id", "implementation_suggestion", "steps", "suggested_tests", "title", "updated_at") SELECT "acceptance_criteria", "chat_history", "content", "created_at", "description", "estimated_time", "id", "implementation_suggestion", "steps", "suggested_tests", "title", "updated_at" FROM "tasks";
DROP TABLE "tasks";
ALTER TABLE "new_tasks" RENAME TO "tasks";
CREATE UNIQUE INDEX "tasks_chat_message_id_key" ON "tasks"("chat_message_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
