import { redirect } from "react-router";
import prisma from "../../prisma/prisma";
import type { Route } from "./+types/api.chat";
import { getChatCompletion } from "~/services/openai.server";
import type { ChatMessage, Role } from "~/generated/prisma/client";
import type { ChatPayloadMessage } from "~/features/tasks/types";
import { createMessageId } from "~/lib/utils";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const message = formData.get("message");
  const chatId = formData.get("chatId") as string;

  if (typeof message !== "string" || !message) {
    throw new Response("Mensagem é obrigatória.", { status: 400 });
  }

  const chatMessage: ChatPayloadMessage = {
    id: createMessageId(),
    content: message,
    role: "user",
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

      const answer: ChatPayloadMessage = {
        id: createMessageId(),
        content:
          (await getChatCompletion([chatMessage])) ??
          "Desculpe, não consegui gerar uma resposta.",
        role: "assistant",
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
            content: chatMessage.content as string,
            role: chatMessage.role,
          },
          {
            chat_id: chat.id,
            content: answer.content as string,
            role: answer.role,
          },
        ],
      });
    }
  } else {
    const answer: ChatPayloadMessage = {
      id: createMessageId(),
      content:
        (await getChatCompletion([chatMessage])) ??
        "Desculpe, não consegui gerar uma resposta.",
      role: "assistant",
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
          content: chatMessage.content as string,
          role: chatMessage.role,
        },
        {
          chat_id: chat.id,
          content: answer.content as string,
          role: answer.role,
        },
      ],
    });

    return redirect(`/tasks/new?chat=${chat.id}`);
  }
}
