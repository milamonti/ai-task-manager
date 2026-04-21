import { TasksChatbot } from "~/features/tasks/tasks-chatbot";
import type { Route } from "./+types/task-new";
import prisma from "../../prisma/prisma";
import { redirect } from "react-router";
import { Role, type ChatMessage } from "~/generated/prisma/client";
import type { TaskContent } from "~/features/tasks/types";

function ensureUniqueMessageIds(messages: ChatMessage[]): ChatMessage[] {
  const seenIds = new Set<string>();

  return messages.map((message, index) => {
    const rawId = message.id ? String(message.id) : `message-${index}`;
    const normalizedId = seenIds.has(rawId) ? `${rawId}-${index}` : rawId;

    seenIds.add(normalizedId);
    return { ...message, id: normalizedId };
  });
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const messageId = formData.get("messageId") as string;
  const taskId = formData.get("taskId") as string;

  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    return { error: 404, message: "Mensagem não encontrada" };
  }

  const content = JSON.parse(message.content);
  const taskData = {
    title: content.title,
    description: content.description,
    steps: JSON.stringify(content.steps),
    acceptance_criteria: JSON.stringify(content.acceptance_criteria),
    suggested_tests: JSON.stringify(content.suggested_tests),
    estimated_time: content.estimated_time,
    implementation_suggestion: content.implementation_suggestion,
    chat_message_id: messageId,
  };

  if (taskId) {
    await prisma.task.update({
      where: { id: taskId },
      data: taskData,
    });
  } else {
    await prisma.task.create({
      data: taskData,
    });
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const chatId = url.searchParams.get("chat");

  let messages: ChatMessage[] = [];
  let taskJson, messageId, taskId;

  if (chatId) {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        chatMessages: {
          include: {
            task: true,
          },
        },
      },
    });

    if (!chat) {
      return redirect("/tasks/new");
    }
    messages = ensureUniqueMessageIds(
      chat.chatMessages.map((msg) => ({
        id: msg.id,
        content:
          msg.role === Role.assistant
            ? msg.content === "{}"
              ? "🤷‍♂️ Sua pergunta gerou uma resposta inválida."
              : "✅ Solicitação atendida! Verifique os detalhes da tarefa ao lado."
            : msg.content,
        role: msg.role as Role,
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        chat_id: msg.chat_id,
      })),
    );

    const message = chat.chatMessages[messages.length - 1];
    taskJson = message?.content;
    messageId = message?.id;
    taskId = message?.task?.id;
  }

  return {
    chatId,
    messages,
    messageId,
    taskId,
    task: taskJson ? (JSON.parse(taskJson) as TaskContent) : null,
  };
}

export default function TaskNew() {
  return <TasksChatbot />;
}
