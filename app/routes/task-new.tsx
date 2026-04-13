import { TasksChatbot } from "~/features/tasks/tasks-chatbot";
import type { Route } from "./+types/task-new";
import type { ChatMessage } from "~/features/tasks/types";
import prisma from "../../prisma/prisma";
import { redirect } from "react-router";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const chatId = url.searchParams.get("chat");

  let messages: ChatMessage[] = [];

  if (chatId) {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      return redirect("/tasks/new");
    }
    messages = JSON.parse(chat?.content || "[]");
  }

  return { chatId, messages };
}

export default function TaskNew() {
  return <TasksChatbot />;
}
