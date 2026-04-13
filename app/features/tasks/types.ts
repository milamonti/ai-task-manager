import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export type ChatMessage = ChatCompletionMessageParam & {
  id: string;
  timestamp: Date | string;
};
