export type ChatMessage = {
  id: string;
  content: string | FormDataEntryValue;
  role: "user" | "assistant";
  timestamp: Date | string;
};
