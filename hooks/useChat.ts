// hooks/useChat.ts
// Drop-in replacement for whatever fetch call you had before.
// Reads the SSE stream from /api/ai and calls onChunk for each delta,
// so the UI updates in real-time exactly like ChatGPT / Claude.

import { useState, useCallback } from "react";

export interface Message {
  role: "user" | "assistant";
  content: string;
  // Persisted so history reconstruction in route.ts works correctly
  additional_kwargs?: Record<string, unknown>;
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  send: (text: string) => Promise<void>;
  clear: () => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    const assistantMsg: Message = { role: "assistant", content: "" };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages, // send full history for context
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE lines are separated by \n\n
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? ""; // keep the incomplete tail

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;

          const raw = line.slice(5).trim();
          if (raw === "[DONE]") break;

          try {
            const { delta } = JSON.parse(raw) as { delta: string };
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant") {
                // Replace loading indicator lines (⏳) when real text arrives
                const isStatus = delta.startsWith("`⏳");
                next[next.length - 1] = {
                  ...last,
                  content: isStatus
                    ? delta           // replace entirely with status
                    : last.content.startsWith("`⏳")
                    ? delta           // first real chunk clears the status line
                    : last.content + delta,
                };
              }
              return next;
            });
          } catch {
            // malformed chunk — skip
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: `⚠️ ${err.message}`,
        };
        return next;
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const clear = useCallback(() => setMessages([]), []);

  return { messages, isLoading, send, clear };
}