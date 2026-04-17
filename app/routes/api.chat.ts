import { redirect } from "react-router";
import prisma from "../../prisma/prisma";
import type { Route } from "./+types/api.chat";
import {
  createChatMessages,
  getChatCompletion,
} from "~/services/chat.server";
import { Role } from "~/generated/prisma/client";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const userInput = formData.get("message");
  const chatId = formData.get("chatId") as string;

  if (typeof userInput !== "string" || !userInput) {
    throw new Response("Mensagem é obrigatória.", { status: 400 });
  }

  const userMessage = {
    content: userInput,
    role: Role.user,
  };

  const aiMessage = {
    role: userMessage.role,
    content: userMessage.content,
  };

  let chat;
  if (chatId) {
    const chat = await prisma.chat.findUnique({
      where: {
        id: chatId,
      },
      include: {
        chatMessages: true,
      },
    });

    if (chat) {
      const assistantMessage = {
        content:
          (await getChatCompletion([...chat.chatMessages, aiMessage])) ??
          "Desculpe, não consegui gerar uma resposta.",
        role: Role.assistant,
      };

      await createChatMessages(chat.id, userMessage, assistantMessage);
    }
  } else {
    const assistantMessage = {
      content:
        (await getChatCompletion([aiMessage])) ??
        "Desculpe, não consegui gerar uma resposta.",
      role: Role.assistant,
    };
    chat = await prisma.chat.create({
      data: {},
    });

    await createChatMessages(chat.id, userMessage, assistantMessage);

    return redirect(`/tasks/new?chat=${chat.id}`);
  }
}
