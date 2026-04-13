import { redirect } from "react-router";
import prisma from "../../prisma/prisma";
import type { Route } from "./+types/api.chat";
import type { ChatMessage } from "~/features/tasks/types";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const message = formData.get("message");
  const chatId = formData.get("chatId") as string;

  if (!message) {
    throw new Response("Mensagem é obrigatória.", { status: 400 });
  }

  const chatMessage: ChatMessage = {
    id: Date.now().toFixed(),
    content: message,
    role: "user",
    timestamp: new Date().toISOString(),
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
      chat = await prisma.chat.update({
        where: {
          id: chatId,
        },
        data: {
          content: JSON.stringify([...existingMessages, chatMessage]),
        },
      });
    }
  } else {
    chat = await prisma.chat.create({
      data: {
        content: JSON.stringify([chatMessage]),
      },
    });
    return redirect(`/tasks/new?chat=${chat.id}`);
  }
}
