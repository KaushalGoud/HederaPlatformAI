"use client";

import { useState, FormEvent, useRef, useEffect } from "react";

type MessageRole = "user" | "ai";

interface Message {
  role: MessageRole;
  content: string;
}

function TypingIndicator() {
  return (
    <div className="typing-bubble">
      <span className="dot" style={{ animationDelay: "0ms" }} />
      <span className="dot" style={{ animationDelay: "160ms" }} />
      <span className="dot" style={{ animationDelay: "320ms" }} />
    </div>
  );
}

export default function ChatInterface() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const userMessage: Message = { role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setLoading(true);
    setMessages((prev) => [...prev, { role: "ai", content: "" }]);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content, history: messages }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

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
              if (last?.role !== "ai") return prev;
              const isStatus = delta.startsWith("`⏳");
              next[next.length - 1] = {
                ...last,
                content: isStatus
                  ? delta
                  : last.content.startsWith("`⏳")
                  ? delta
                  : last.content + delta,
              };
              return next;
            });
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "ai", content: "❌ Connection error. Please try again." };
        return next;
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const lastMsg = messages[messages.length - 1];
  const showTyping = loading && lastMsg?.role === "ai" && lastMsg.content === "";
  const isStreaming = loading && lastMsg?.role === "ai" && lastMsg.content !== "";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Clash+Grotesk:wght@500;600;700&family=Satoshi:wght@400;500;600;700;900&family=JetBrains+Mono:wght@400;500&display=swap');

        .hf-root {
          font-family: 'Satoshi', system-ui, sans-serif;
          background: #080b12;
          border: 1px solid rgba(99,210,255,0.08);
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 680px;
          width: 100%;
          max-width: 580px;
          position: relative;
          box-shadow:
            0 0 0 1px rgba(99,210,255,0.04),
            0 40px 80px -20px rgba(0,0,0,0.8),
            inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .hf-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg, transparent, transparent 2px,
            rgba(255,255,255,0.007) 2px, rgba(255,255,255,0.007) 4px
          );
          pointer-events: none;
          z-index: 0;
          border-radius: 20px;
        }

        .hf-root::after {
          content: '';
          position: absolute;
          top: 0; left: 10%; right: 10%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(99,210,255,0.5), rgba(168,85,247,0.4), transparent);
          pointer-events: none;
          z-index: 10;
        }

        .hf-header {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 22px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: linear-gradient(180deg, rgba(99,210,255,0.035) 0%, transparent 100%);
          flex-shrink: 0;
        }

        .hf-logo {
          width: 44px; height: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg, #0ea5e9, #6366f1, #a855f7);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          position: relative;
          box-shadow: 0 0 20px rgba(99,210,255,0.2), 0 4px 12px rgba(0,0,0,0.4);
        }

        .hf-logo::after {
          content: '';
          position: absolute; inset: 0;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
        }

        .hf-logo-ring {
          position: absolute;
          inset: -4px;
          border-radius: 18px;
          border: 1px solid rgba(99,210,255,0.18);
          animation: ring-pulse 3s ease-in-out infinite;
        }

        @keyframes ring-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.03); }
        }

        .hf-title { 
          font-family: 'Clash Grotesk', sans-serif;
          font-size: 15px; 
          font-weight: 700; 
          color: #f0f4ff; 
          letter-spacing: -0.03em; 
        }

        .hf-subtitle { 
          font-size: 11px; 
          color: rgba(255,255,255,0.28); 
          margin-top: 2px; 
          font-weight: 500; 
          letter-spacing: 0.02em; 
        }

        .hf-status {
          margin-left: auto;
          display: flex; align-items: center; gap: 7px;
          background: rgba(16,185,129,0.07);
          border: 1px solid rgba(16,185,129,0.14);
          border-radius: 100px;
          padding: 5px 12px;
        }

        .hf-status-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 6px #10b981;
          animation: blink 2s ease-in-out infinite;
        }

        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.35} }

        .hf-status-text { font-size: 11px; color: #10b981; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }

        .hf-messages {
          flex: 1;
          overflow-y: auto;
          padding: 22px 18px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          position: relative;
          z-index: 1;
          scrollbar-width: thin;
          scrollbar-color: rgba(99,210,255,0.1) transparent;
        }

        .hf-msg-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          animation: msg-in 0.22s cubic-bezier(0.34,1.56,0.64,1) both;
        }

        @keyframes msg-in {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)  scale(1); }
        }

        .hf-msg-row.user { flex-direction: row-reverse; }

        .hf-avatar {
          width: 28px; height: 28px;
          border-radius: 9px;
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px;
        }

        .hf-avatar.ai {
          background: linear-gradient(135deg, #0ea5e9, #6366f1);
          box-shadow: 0 0 10px rgba(99,210,255,0.15);
        }

        .hf-avatar.user {
          background: linear-gradient(135deg, #6366f1, #a855f7);
          box-shadow: 0 0 10px rgba(168,85,247,0.15);
        }

        .hf-bubble {
          max-width: 73%;
          padding: 11px 15px;
          font-size: 13.5px;
          line-height: 1.65;
          white-space: pre-wrap;
          word-break: break-word;
          position: relative;
        }

        .hf-bubble.ai {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px 14px 14px 3px;
          color: rgba(235,242,255,0.85);
        }

        .hf-bubble.user {
          background: linear-gradient(135deg, rgba(99,102,241,0.65), rgba(139,92,246,0.55));
          border: 1px solid rgba(139,92,246,0.25);
          border-radius: 14px 14px 3px 14px;
          color: #f0f4ff;
          box-shadow: 0 4px 18px rgba(99,102,241,0.18), inset 0 1px 0 rgba(255,255,255,0.1);
        }

        .stream-cursor {
          display: inline-block;
          width: 2px; height: 13px;
          background: #63d2ff;
          margin-left: 2px;
          vertical-align: middle;
          border-radius: 1px;
          animation: cursor-blink 0.75s ease-in-out infinite;
          box-shadow: 0 0 6px rgba(99,210,255,0.7);
        }

        @keyframes cursor-blink { 0%,100%{opacity:1} 50%{opacity:0} }

        .typing-bubble {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px 14px 14px 3px;
          padding: 13px 17px;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .dot {
          width: 6px; height: 6px; border-radius: 50%;
          animation: dot-bounce 1.2s ease-in-out infinite;
        }
        .dot:nth-child(1) { background: #63d2ff; box-shadow: 0 0 5px #63d2ff; }
        .dot:nth-child(2) { background: #a78bfa; box-shadow: 0 0 5px #a78bfa; }
        .dot:nth-child(3) { background: #f472b6; box-shadow: 0 0 5px #f472b6; }

        @keyframes dot-bounce {
          0%,80%,100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }

        .hf-empty {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          height: 100%;
          gap: 14px;
          text-align: center;
        }

        .hf-empty-icon {
          font-size: 46px;
          filter: drop-shadow(0 0 24px rgba(99,210,255,0.25));
          animation: float 4s ease-in-out infinite;
        }

        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }

        .hf-empty-title {
          font-size: 14px; font-weight: 600;
          color: rgba(255,255,255,0.4);
        }

        .hf-hints { display: flex; flex-direction: column; gap: 7px; }

        .hf-hint {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11.5px;
          color: rgba(255,255,255,0.25);
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 100px;
          padding: 6px 16px;
          cursor: pointer;
          transition: all 0.18s;
          text-align: left;
        }

        .hf-hint:hover {
          background: rgba(99,210,255,0.06);
          border-color: rgba(99,210,255,0.18);
          color: rgba(99,210,255,0.75);
          transform: translateX(3px);
        }

        .hf-hint::before { content: '> '; opacity: 0.4; }

        .hf-input-wrap {
          position: relative; z-index: 2;
          padding: 12px 14px 16px;
          border-top: 1px solid rgba(255,255,255,0.05);
          background: linear-gradient(0deg, rgba(8,11,18,0.98) 0%, transparent 100%);
          flex-shrink: 0;
        }

        .hf-form {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 4px 4px 4px 14px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .hf-form:focus-within {
          border-color: rgba(99,210,255,0.22);
          box-shadow: 0 0 0 3px rgba(99,210,255,0.04);
        }

        .hf-input {
          flex: 1; background: transparent; border: none; outline: none;
          font-family: 'Satoshi', sans-serif;
          font-size: 13.5px;
          color: rgba(240,244,255,0.88);
          padding: 9px 0;
        }

        .hf-input::placeholder { color: rgba(255,255,255,0.18); }
        .hf-input:disabled { opacity: 0.45; }

        .hf-send {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #0ea5e9, #6366f1);
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: all 0.15s;
          box-shadow: 0 2px 10px rgba(99,102,241,0.25);
        }

        .hf-send:hover:not(:disabled) { transform: scale(1.07); box-shadow: 0 4px 16px rgba(99,102,241,0.4); }
        .hf-send:active:not(:disabled) { transform: scale(0.93); }
        .hf-send:disabled { opacity: 0.3; cursor: not-allowed; box-shadow: none; }

        .hf-footer {
          text-align: center;
          font-size: 10px;
          color: rgba(255,255,255,0.1);
          margin-top: 8px;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }
        .hf-footer span { color: rgba(99,210,255,0.25); }
      `}</style>

      <div className="hf-root">
        {/* Header */}
        <div className="hf-header">
          <div className="hf-logo">
            <div className="hf-logo-ring" />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 3L4 7.5V16.5L12 21L20 16.5V7.5L12 3Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M12 3V21M4 7.5L20 16.5M20 7.5L4 16.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div className="hf-title">HASHFLOW 🌊</div>
            <div className="hf-subtitle">Powered by Hedera Agent Kit</div>
          </div>
          <div className="hf-status">
            <span className="hf-status-dot" />
            <span className="hf-status-text">Online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="hf-messages">
          {messages.length === 0 && (
            <div className="hf-empty">
              <div className="hf-empty-icon">🌊</div>
              <div className="hf-empty-title">What can I help you with?</div>
              <div className="hf-hints">
                {[
                  "check my HBAR balance",
                  "send 1 HBAR to 0.0.12345",
                  "show token info 0.0.1234",
                ].map((hint) => (
                  <button key={hint} className="hf-hint" onClick={() => setMessage(hint)}>
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`hf-msg-row ${msg.role === "user" ? "user" : ""}`}>
              <div className={`hf-avatar ${msg.role === "user" ? "user" : "ai"}`}>
                {msg.role === "user" ? "◈" : "⬡"}
              </div>
              <div className={`hf-bubble ${msg.role}`}>
                {msg.content}
                {isStreaming && idx === messages.length - 1 && msg.role === "ai" && (
                  <span className="stream-cursor" />
                )}
              </div>
            </div>
          ))}

          {showTyping && (
            <div className="hf-msg-row">
              <div className="hf-avatar ai">⬡</div>
              <TypingIndicator />
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="hf-input-wrap">
          <form className="hf-form" onSubmit={sendMessage}>
            <input
              ref={inputRef}
              className="hf-input"
              type="text"
              placeholder="Ask HASHFLOW anything..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="hf-send" disabled={loading || !message.trim()}>
              {loading ? (
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13" /><path d="M22 2L15 22 11 13 2 9l20-7z" />
                </svg>
              )}
            </button>
          </form>
          <div className="hf-footer">secured by <span>Hedera Hashgraph</span></div>
        </div>
      </div>
    </>
  );
}