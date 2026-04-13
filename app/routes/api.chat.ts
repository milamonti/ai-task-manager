import { redirect } from "react-router";
import prisma from "../../prisma/prisma";
import type { Route } from "./+types/api.chat";
import { getChatCompletion } from "~/services/openai.server";
import { Role, type ChatMessage } from "~/generated/prisma/client";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const message = formData.get("message");
  const chatId = formData.get("chatId") as string;

  if (typeof message !== "string" || !message) {
    throw new Response("Mensagem é obrigatória.", { status: 400 });
  }

  const chatMessage = {
    content: message,
    role: Role.user,
  };

  const aiMessage = {
    role: chatMessage.role,
    content: chatMessage.content,
  };

  let chat;
  if (chatId) {
    const existingChat = await prisma.chat.findUnique({
      where: {
        id: chatId,
      },
      include: {
        chatMessages: true,
      },
    });

    if (existingChat) {
      const existingMessages: ChatMessage[] = existingChat.chatMessages;

      const answer = {
        content:
          (await getChatCompletion([aiMessage])) ??
          "Desculpe, não consegui gerar uma resposta.",
        role: Role.assistant,
      };

      chat = await prisma.chat.update({
        where: {
          id: chatId,
        },
        data: {
          content: JSON.stringify([...existingMessages, chatMessage, answer]),
        },
      });

      await prisma.chatMessage.createMany({
        data: [
          {
            chat_id: chat.id,
            ...chatMessage,
          },
          {
            chat_id: chat.id,
            ...answer,
          },
        ],
      });
    }
  } else {
    const answer = {
      content:
        (await getChatCompletion([aiMessage])) ??
        "Desculpe, não consegui gerar uma resposta.",
      role: Role.assistant,
    };
    chat = await prisma.chat.create({
      data: {
        content: JSON.stringify([chatMessage, answer]),
      },
    });

    await prisma.chatMessage.createMany({
      data: [
        {
          chat_id: chat.id,
          ...chatMessage,
        },
        {
          chat_id: chat.id,
          ...answer,
        },
      ],
    });

    return redirect(`/tasks/new?chat=${chat.id}`);
  }
}
