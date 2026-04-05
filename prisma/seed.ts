import "dotenv/config";
import { faker } from "@faker-js/faker";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../app/generated/prisma/client";

type SeedTarget = {
  name: string;
  url: string;
  authToken?: string;
};

async function ensureSchema(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      age INTEGER,
      name TEXT
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      published BOOLEAN NOT NULL DEFAULT false,
      author_id INTEGER NOT NULL,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `);

  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users(email)`,
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      steps TEXT,
      estimated_time TEXT NOT NULL,
      implementation_suggestion TEXT,
      acceptance_criteria TEXT,
      suggested_tests TEXT,
      content TEXT,
      chat_history TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function buildTargets(): SeedTarget[] {
  const targets: SeedTarget[] = [];
  const localUrl = process.env.DATABASE_URL;
  const tursoUrl = process.env.TURSO_DATABASE_URL;

  if (localUrl) {
    targets.push({ name: "local", url: localUrl });
  }

  if (tursoUrl && tursoUrl !== localUrl) {
    targets.push({
      name: "turso",
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }

  return targets;
}

function createPrismaForTarget(target: SeedTarget): PrismaClient {
  const adapter = new PrismaLibSql({
    url: target.url,
    authToken: target.authToken,
  });

  return new PrismaClient({ adapter });
}

async function seedDatabase(target: SeedTarget) {
  const prisma = createPrismaForTarget(target);

  await ensureSchema(prisma);

  // Clear child records first due to relation constraints.
  await prisma.$executeRawUnsafe(`DELETE FROM tasks`);
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  const users = await prisma.$transaction(
    Array.from({ length: 20 }).map(() =>
      prisma.user.create({
        data: {
          email: faker.internet.email().toLowerCase(),
          name: faker.person.fullName(),
          age: faker.number.int({ min: 18, max: 75 }),
        },
      }),
    ),
  );

  const postsData = Array.from({ length: 60 }).map(() => {
    const randomUser =
      users[faker.number.int({ min: 0, max: users.length - 1 })];

    return {
      title: faker.lorem.sentence({ min: 3, max: 8 }),
      content: faker.lorem.paragraphs({ min: 1, max: 3 }, "\n\n"),
      published: faker.datatype.boolean(0.7),
      author_id: randomUser.id,
    };
  });

  await prisma.post.createMany({
    data: postsData,
  });

  const tasksData = Array.from({ length: 20 }).map(() => {
    const steps = [
      `Analisar requisito: ${faker.hacker.phrase()}`,
      `Implementar solução técnica para ${faker.commerce.productName()}`,
      `Validar resultado com dados de teste controlados`,
    ];

    const acceptanceCriteria = [
      "A funcionalidade deve salvar dados sem erro",
      "A resposta da interface deve ocorrer em até 2 segundos",
      "Deve existir cobertura de casos de sucesso e falha",
    ];

    const suggestedTests = [
      "Teste unitário do caso de sucesso",
      "Teste unitário de validação de entrada inválida",
      "Teste de integração do fluxo principal",
    ];

    const chatHistory = [
      {
        role: "user",
        message: faker.lorem.sentence({ min: 6, max: 12 }),
        timestamp: new Date().toISOString(),
      },
      {
        role: "assistant",
        message: faker.lorem.sentences({ min: 1, max: 2 }),
        timestamp: new Date().toISOString(),
      },
    ];

    const title = faker.company.buzzPhrase();
    const description = faker.lorem.paragraphs({ min: 1, max: 2 }, "\n\n");
    const implementationSuggestion = faker.lorem.sentences({ min: 1, max: 2 });

    return {
      title,
      description,
      steps: JSON.stringify(steps),
      estimated_time: `${faker.number.int({ min: 1, max: 16 })}h`,
      implementation_suggestion: implementationSuggestion,
      acceptance_criteria: JSON.stringify(acceptanceCriteria),
      suggested_tests: JSON.stringify(suggestedTests),
      content: `# ${title}\n\n${description}\n\n## Sugestao de implementacao\n${implementationSuggestion}`,
      chat_history: JSON.stringify(chatHistory),
    };
  });

  for (const task of tasksData) {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO tasks (
          id,
          title,
          description,
          steps,
          estimated_time,
          implementation_suggestion,
          acceptance_criteria,
          suggested_tests,
          content,
          chat_history,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      faker.string.uuid(),
      task.title,
      task.description,
      task.steps,
      task.estimated_time,
      task.implementation_suggestion,
      task.acceptance_criteria,
      task.suggested_tests,
      task.content,
      task.chat_history,
    );
  }

  const insertedTasks = await prisma.$queryRawUnsafe<Array<{ total: number }>>(
    "SELECT COUNT(*) as total FROM tasks",
  );

  console.log(`Seed concluido com sucesso no destino: ${target.name}.`);
  console.log(`Users criados: ${users.length}`);
  console.log(`Posts criados: ${postsData.length}`);
  console.log(`Tasks criadas: ${tasksData.length}`);
  console.log(`Tasks persistidas no banco: ${insertedTasks[0]?.total ?? 0}`);

  await prisma.$disconnect();
}

async function main() {
  const targets = buildTargets();

  if (targets.length === 0) {
    throw new Error(
      "Defina DATABASE_URL ou TURSO_DATABASE_URL para executar o seed.",
    );
  }

  for (const target of targets) {
    await seedDatabase(target);
  }
}

main().catch((error) => {
  console.error("Erro ao executar seed:", error);
  process.exit(1);
});
