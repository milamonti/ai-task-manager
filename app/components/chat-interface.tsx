import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Avatar } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Check, Copy, Send } from "lucide-react";
import { useFetcher, useLoaderData } from "react-router";
import type { loader } from "~/routes/task-new";
import type { ChatMessage } from "~/generated/prisma/client";
import { isLikelyMarkdown } from "~/lib/utils";

export function ChatInterface() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher();
  const isLoading = fetcher.state !== "idle";
  const { chatId, messages } = useLoaderData<typeof loader>();
  const [messageInput, setMessageInput] = useState("");
  const [optimisticMessage, setOptimisticMessage] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const optimisticMessages: (ChatMessage & { isOptimistic?: boolean })[] =
    optimisticMessage.trim().length > 0
      ? [
          ...messages,
          {
            id: "optimistic-message",
            role: "user" as const,
            content: optimisticMessage,
            created_at: new Date(),
            updated_at: new Date(),
            chat_id: chatId ?? "",
            isOptimistic: true,
          },
        ]
      : messages;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [optimisticMessages]);

  useEffect(() => {
    if (!isLoading && optimisticMessage) {
      setOptimisticMessage("");
    }
  }, [isLoading, optimisticMessage]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [isLoading]);

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedMessage = messageInput.trim();
    if (!trimmedMessage) return;

    setOptimisticMessage(trimmedMessage);
    fetcher.submit(
      {
        chatId: chatId ?? "",
        message: trimmedMessage,
      },
      {
        action: "/api/chat",
        method: "POST",
      },
    );
    setMessageInput("");
    inputRef.current?.focus();
  };

  const handleCopyMessage = async (
    messageId: string,
    content: string | null,
  ) => {
    const textToCopy = typeof content === "string" ? content : String(content);
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 1500);
    } catch {
      setCopiedMessageId(null);
    }
  };

  const renderMessageContent = (content: string | null) => {
    const textContent = typeof content === "string" ? content : String(content);

    if (!isLikelyMarkdown(textContent)) {
      return <p className="text-sm whitespace-pre-wrap">{textContent}</p>;
    }

    return (
      <div className="text-sm space-y-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-black/10 [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:bg-black/10 [&_pre]:overflow-x-auto [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_a]:underline">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{textContent}</ReactMarkdown>
      </div>
    );
  };

  return (
    <Card className="flex flex-col h-150 w-full border shadow-sm pb-0 pt-0">
      <ScrollArea className="flex-1 p-4 h-96">
        <div className="space-y-4">
          {optimisticMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex gap-3 max-w-[80%] ${
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <Avatar className="h-8 w-8">
                  <div
                    className={`flex h-full w-full items-center justify-center rounded-full ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {message.role === "user" ? "U" : "A"}
                  </div>
                </Avatar>
                <div
                  className={`rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  } ${
                    "isOptimistic" in message && message.isOptimistic
                      ? "opacity-50"
                      : ""
                  }`}
                >
                  {renderMessageContent(message.content as string | null)}
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xs opacity-70">
                      {new Date(message.updated_at).toLocaleString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {message.role !== "user" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-70 hover:opacity-100"
                        onClick={() =>
                          handleCopyMessage(
                            String(message.id),
                            message.content as string | null,
                          )
                        }
                        aria-label="Copiar resposta"
                        title="Copiar resposta"
                      >
                        {copiedMessageId === String(message.id) ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground">
                    A
                  </div>
                </Avatar>
                <div className="rounded-lg p-3 bg-muted">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 rounded-full bg-current animate-bounce" />
                    <div className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:0.2s]" />
                    <div className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t mt-auto">
        <fetcher.Form className="flex gap-2" onSubmit={handleSubmit}>
          <Input
            ref={inputRef}
            name="message"
            placeholder="Descreva a tarefa..."
            className="flex-1"
            value={messageInput}
            onChange={(event) => setMessageInput(event.target.value)}
          />
          <Button type="submit" disabled={isLoading} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </fetcher.Form>
      </div>
    </Card>
  );
}
