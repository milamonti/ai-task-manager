import Openai from "openai";

const client = new Openai({
  apiKey: process.env["OPENAI_KEY"],
});

export async function getChatCompletion(
  messages: {
    role: "user" | "assistant" | "system";
    content: string;
  }[],
): Promise<string | null> {
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages,
  });

  return completion.choices[0].message.content;
}
