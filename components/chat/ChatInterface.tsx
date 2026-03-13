"use client";

import { useState, FormEvent, useRef, useEffect } from "react";

type MessageRole = "user" | "ai";

interface Message {
  role: MessageRole;
  content: string;
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30 flex-shrink-0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
        </svg>
      </div>
      <div className="bg-white/[0.05] border border-white/[0.07] rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1.5 items-center">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

export default function ChatInterface() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage: Message = { role: "user", content: message };
    setMessages(prev => [...prev, userMessage]);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message }),
      });

      const data = await res.json();
      const aiMessage: Message = { role: "ai", content: data.reply || "No response" };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      const aiMessage: Message = { role: "ai", content: "❌ Error contacting AI" };
      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[640px] w-full max-w-[560px] bg-[#0a0a0f] rounded-3xl overflow-hidden shadow-2xl shadow-black/60 border border-white/[0.06]">

      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06] bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-transparent flex-shrink-0">
        <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/40 flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
          </svg>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0a0a0f] shadow-sm shadow-emerald-400/50" />
        </div>
        <div>
          <h2 className="text-white font-semibold text-sm tracking-tight">AI Assistant</h2>
          <p className="text-white/40 text-xs mt-0.5">Always online</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 text-xs font-medium">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-4 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.08)_transparent]">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${
              msg.role === "user"
                ? "bg-gradient-to-br from-sky-400 to-violet-500 shadow-lg shadow-sky-500/25"
                : "bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/25"
            }`}>
              {msg.role === "user" ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                </svg>
              )}
            </div>

            <div className={`px-4 py-3 rounded-2xl max-w-[72%] text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-gradient-to-br from-violet-600 to-violet-500 text-white rounded-br-sm shadow-lg shadow-violet-500/25 ring-1 ring-inset ring-white/10"
                : "bg-white/[0.05] text-white/85 rounded-bl-sm border border-white/[0.07]"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t border-white/[0.06] bg-white/[0.02] flex-shrink-0">
        <form
          onSubmit={sendMessage}
          className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-2 focus-within:border-violet-500/50 focus-within:bg-white/[0.07] transition-all duration-200"
        >
          <input
            type="text"
            placeholder="Ask your AI wallet..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            disabled={loading}
            className="flex-1 bg-transparent text-white text-sm placeholder-white/25 outline-none disabled:opacity-50 py-1"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/30 disabled:opacity-40 disabled:shadow-none hover:scale-105 active:scale-95 transition-all flex-shrink-0"
          >
            {loading ? (
              <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}