import { TasksChatbot } from "~/features/tasks/tasks-chatbot";
import type { Route } from "./+types/task-new";
import prisma from "../../prisma/prisma";
import { redirect } from "react-router";
import type { ChatMessage } from "~/generated/prisma/client";
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

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const chatId = url.searchParams.get("chat");

  let messages: ChatMessage[] = [];
  let taskJson;

  if (chatId) {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { chatMessages: true },
    });

    if (!chat) {
      return redirect("/tasks/new");
    }
    messages = ensureUniqueMessageIds(
      chat.chatMessages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        role: msg.role as "system" | "user" | "assistant",
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        chat_id: msg.chat_id,
      })),
    );

    taskJson = messages[messages.length - 1]?.content;
  }

  return {
    chatId,
    messages,
    task: taskJson ? (JSON.parse(taskJson) as TaskContent) : null,
  };
}

export default function TaskNew() {
  return <TasksChatbot />;
}
