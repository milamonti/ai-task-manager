import { redirect } from "react-router";
import prisma from "../../prisma/prisma";
import type { Route } from "./+types/api.chat";
import type { ChatMessage } from "~/features/tasks/types";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const message = formData.get("message");

  if (!message) {
    throw new Response("Mensagem é obrigatória.", { status: 400 });
  }

  const chatMessage: ChatMessage = {
    id: Date.now().toFixed(),
    content: message,
    role: "user",
    timestamp: new Date().toISOString(),
  };

  const chat = await prisma.chat.create({
    data: {
      content: JSON.stringify([chatMessage]),
    },
  });

  return redirect(`/task/new?chat=${chat.id}`);
}
