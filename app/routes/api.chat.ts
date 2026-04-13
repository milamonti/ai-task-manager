import { redirect } from "react-router";
import prisma from "../../prisma/prisma";
import type { Route } from "./+types/api.chat";
import type { ChatMessage } from "~/features/tasks/types";
import { getChatCompletion } from "~/services/openai.server";

function createMessageId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const message = formData.get("message");
  const chatId = formData.get("chatId") as string;

  if (typeof message !== "string" || !message) {
    throw new Response("Mensagem é obrigatória.", { status: 400 });
  }

  const chatMessage: ChatMessage = {
    id: createMessageId(),
    content: message,
    role: "user",
    timestamp: new Date(),
  };

  let chat;
  if (chatId) {
    const existingChat = await prisma.chat.findUnique({
      where: {
        id: chatId,
      },
    });

    if (existingChat) {
      const existingMessages: ChatMessage[] = JSON.parse(existingChat.content);

      const answer: ChatMessage = {
        id: createMessageId(),
        content: await getChatCompletion([chatMessage]),
        role: "assistant",
        timestamp: new Date(),
      };

      chat = await prisma.chat.update({
        where: {
          id: chatId,
        },
        data: {
          content: JSON.stringify([...existingMessages, chatMessage, answer]),
        },
      });
    }
  } else {
    const answer: ChatMessage = {
      id: createMessageId(),
      content: await getChatCompletion([chatMessage]),
      role: "assistant",
      timestamp: new Date(),
    };

    chat = await prisma.chat.create({
      data: {
        content: JSON.stringify([chatMessage, answer]),
      },
    });

    return redirect(`/tasks/new?chat=${chat.id}`);
  }
}
