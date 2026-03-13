// app/api/ai/route.ts   ← Note: Your frontend calls /api/ai, not /api/chat, so renaming to match
// (or change frontend to /api/chat if you prefer)

import { NextResponse } from "next/server";
import { z } from "zod";

// ── Tool definitions (OpenAI format, but we send manually with fetch) ──
const tools = [
  {
    type: "function",
    function: {
      name: "send_hbar",
      description:
        "Send HBAR to another Hedera account. Use only when user explicitly asks to send, transfer, pay or give HBAR.",
      parameters: {
        type: "object",
        properties: {
          amount: {
            type: "number",
            description: "Amount of HBAR (positive number, decimals allowed)",
          },
          recipientId: {
            type: "string",
            description: "Hedera account ID in format 0.0.xxxxx",
          },
        },
        required: ["amount", "recipientId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_balance",
      description: "Get the current HBAR balance of this wallet/account.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recent_transactions",
      description: "Show the most recent transaction history of this account.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "check_address_safety",
      description:
        "Check if a Hedera account ID looks safe or has known risk flags.",
      parameters: {
        type: "object",
        properties: {
          accountId: {
            type: "string",
            description: "Hedera account ID in format 0.0.xxxxx",
          },
        },
        required: ["accountId"],
      },
    },
  },
];

// ── Internal API caller with typed generics ──
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

async function callInternalApi<T>(
  endpoint: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Internal API error: ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Execute one tool ──
async function executeTool(toolCall: {
  id: string;
  type: string;
  function: { name: string; arguments: string };
}): Promise<string> {
  const { name, arguments: argsStr } = toolCall.function;
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsStr || "{}");
  } catch {
    return "Error: Invalid arguments format";
  }

  try {
    if (name === "send_hbar") {
      const parsed = z
        .object({
          amount: z.number().positive(),
          recipientId: z.string().regex(/^0\.0\.\d+$/),
        })
        .parse(args);
      const data = await callInternalApi<{ transactionId?: string }>(
        "/api/transfer-hbar",
        parsed,
      );
      return `✅ Sent ${parsed.amount} HBAR to ${parsed.recipientId}. Tx ID: ${data.transactionId || "unknown"}`;
    }

    if (name === "get_balance") {
      const data = await callInternalApi<{ balance?: number | string }>(
        "/api/balance",
        {
          accountId: process.env.HEDERA_ACCOUNT_ID || "0.0.7286740", // fallback to your provided ID
        },
      );
      return `💰 Current balance: ${data.balance ?? "unknown"} ℏ`;
    }

    if (name === "get_recent_transactions") {
      interface Tx {
        transaction_id?: string;
        type?: string;
        amount?: number | string;
        status?: string;
      }
      const data = await callInternalApi<{ transactions?: Tx[] }>(
        "/api/transactions",
        {
          accountId: process.env.HEDERA_ACCOUNT_ID || "0.0.7286740",
        },
      );
      if (!data.transactions?.length) return "No recent transactions.";
      return data.transactions
        .slice(0, 8)
        .map(
          (tx) =>
            `• ${tx.transaction_id || "?"} | ${tx.type || "?"} | ${tx.amount || "—"} ℏ | ${tx.status || "?"}`,
        )
        .join("\n");
    }

    if (name === "check_address_safety") {
      const parsed = z
        .object({ accountId: z.string().regex(/^0\.0\.\d+$/) })
        .parse(args);
      const data = await callInternalApi<{ safe?: boolean }>(
        "/api/safety",
        parsed,
      );
      return data.safe !== false
        ? `✅ ${parsed.accountId} appears safe.`
        : `⚠️ ${parsed.accountId} looks suspicious or risky.`;
    }

    return "Unknown tool.";
  } catch (err: any) {
    return `Tool error: ${err.message || "invalid input"}`;
  }
}

// ── System prompt tuned for Gemma-3 ──
const SYSTEM_PROMPT = `
You are a friendly Hedera HBAR wallet assistant named Grok. Use emojis when helpful. Be concise and clear.

Available tools (use ONLY when clearly needed):
- send_hbar(amount: number, recipientId: string)  → for sending/transferring/paying HBAR
- get_balance()                                   → for checking/showing balance
- get_recent_transactions()                       → for transaction history
- check_address_safety(accountId: string)         → for verifying if an account is safe/risky

Rules:
1. If amount or account ID missing → ask user, never guess
2. To use tool: output ONLY valid JSON like {"tool_calls": [{"id": "call_1", "type": "function", "function": {"name": "tool_name", "arguments": "{\"key\":\"value\"}"}}]} – nothing else
3. After tool results, give natural final answer
4. Explain Hedera, HBAR, blockchain naturally without tools
5. Think step-by-step internally, but keep response clean
`;

// ── API handler using pure fetch (no openai library) ──
export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ reply: "Please type a message, Kaushal." });
    }

    let messages: Array<{ role: string; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: message.trim() },
    ];

    let stepsLeft = 12; // prevent infinite loop

    while (stepsLeft-- > 0) {
      // Replace the fetch block with this
      const res = await fetch("http://127.0.0.1:1234/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemma-3-4b",
          messages,
          tools,
          tool_choice: "auto",
          temperature: 0.1,
          max_tokens: 1024,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "No response body");
        throw new Error(
          `LM Studio failed with status ${res.status} – ${text}\n` +
            `Make sure: 1) Server is running in Developer tab, 2) Model is loaded`,
        );
      }
      const data = await res.json();
      const msg = data.choices[0].message;

      // No tools → final reply
      if (!msg.tool_calls?.length) {
        let reply = msg.content?.trim() || "Sorry, I couldn't process that.";
        reply = reply
          .replace(/balance/i, "💰 Balance")
          .replace(/successfully sent/i, "✅ Sent")
          .replace(/suspicious|risky/i, "⚠️ $&");
        return NextResponse.json({ reply });
      }

      // Add assistant msg
      messages.push(msg);

      // Run tools
      const toolResults = await Promise.all(
        msg.tool_calls.map(async (tc: any) => {
          const result = await executeTool(tc);
          return {
            role: "tool",
            tool_call_id: tc.id,
            name: tc.function.name,
            content: result,
          };
        }),
      );

      messages.push(...toolResults);
    }

    return NextResponse.json({
      reply: "Too many steps — try a simpler question.",
    });
  } catch (err: any) {
    console.error("[AI Error]", err);
    let reply = "⚠️ Something went wrong. Please try again.";
    if (err.message?.includes("connect"))
      reply = "⚠️ Can't reach LM Studio — is the server running?";
    if (err.message?.includes("model"))
      reply = "⚠️ Model name wrong — check LM Studio UI.";
    return NextResponse.json({ reply });
  }
}
