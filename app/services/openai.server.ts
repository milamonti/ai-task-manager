import Openai from "openai";
import type { ChatMessage } from "~/features/tasks/types";

const client = new Openai({
  apiKey: process.env["OPENAI_KEY"],
});

export async function getChatCompletion(
  messages: ChatMessage[],
): Promise<string | null> {
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages,
  });

  return completion.choices[0].message.content;
}
