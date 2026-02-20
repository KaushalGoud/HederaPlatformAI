"use client";

import { useState, FormEvent } from "react";

type MessageRole = "user" | "ai";

interface Message {
  role: MessageRole;
  content: string;
}

export default function ChatInterface() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Add user message
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
    <div className="flex flex-col space-y-4 max-h-[600px] overflow-y-auto p-4 bg-gray-900 rounded-lg text-white">
      <div className="flex flex-col space-y-2">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg max-w-[80%] ${
              msg.role === "user"
                ? "self-end bg-blue-600 text-white"
                : "self-start bg-gray-700 text-white"
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="flex space-x-2 mt-auto">
        <input
          type="text"
          placeholder="Ask your AI wallet..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          className="flex-1 p-2 rounded-lg bg-gray-800 text-white border border-gray-600"
          disabled={loading}
        />
        <button
          type="submit"
          className={`px-4 py-2 rounded-lg ${
            loading ? "bg-gray-500" : "bg-blue-600 hover:bg-blue-700"
          } text-white`}
          disabled={loading}
        >
          {loading ? "Thinking..." : "Send"}
        </button>
      </form>
    </div>
  );
}
