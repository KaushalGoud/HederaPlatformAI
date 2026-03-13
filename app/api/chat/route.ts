// app/api/chat/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import type {
  ChatCompletionTool,
  ChatCompletionMessageToolCall,
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions";
import { z } from "zod";

// ── Client ──
const openai = new OpenAI({
  baseURL: "http://127.0.0.1:1234/v1",
  apiKey: "lm-studio",
});

// ── Tools ──
const tools = [
  {
    type: "function" as const,
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
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_balance",
      description: "Get the current HBAR balance of this wallet/account.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_recent_transactions",
      description: "Show the most recent transaction history of this account.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
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
        additionalProperties: false,
      },
    },
  },
] satisfies ChatCompletionTool[];

// ── Helpers ──
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const ACCOUNT_ID = process.env.HEDERA_ACCOUNT_ID || "0.0.7286740";

async function callInternalApi<T>(
  endpoint: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API failed: ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Tool runner ──
async function runTool(
  toolCall: ChatCompletionMessageToolCall,
): Promise<string> {
  if (toolCall.type !== "function") {
    return "Unsupported tool type";
  }

  const { name, arguments: argsStr } = toolCall.function;
  let args: Record<string, unknown>;

  try {
    args = JSON.parse(argsStr || "{}");
  } catch {
    return "Error: Invalid arguments JSON";
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
      const data = await callInternalApi<{ balance?: string | number }>(
        "/api/balance",
        {
          accountId: ACCOUNT_ID,
        },
      );
      return `💰 Current balance: ${data.balance ?? "unknown"} ℏ`;
    }

    if (name === "get_recent_transactions") {
      interface Tx {
        transaction_id?: string;
        type?: string;
        amount?: string | number;
        status?: string;
      }
      const data = await callInternalApi<{ transactions?: Tx[] }>(
        "/api/transactions",
        { accountId: ACCOUNT_ID },
      );
      if (!data.transactions?.length) return "No recent transactions found.";
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
        .object({
          accountId: z.string().regex(/^0\.0\.\d+$/),
        })
        .parse(args);
      const data = await callInternalApi<{ safe?: boolean }>(
        "/api/safety",
        parsed,
      );
      return data.safe !== false
        ? `✅ ${parsed.accountId} looks safe.`
        : `⚠️ ${parsed.accountId} appears suspicious or risky.`;
    }

    return `Unknown tool: ${name}`;
  } catch (err: any) {
    return `Error: ${err.message || "Invalid input"}`;
  }
}

// ── Prompt ──
const SYSTEM_PROMPT = `You are a friendly Hedera HBAR wallet assistant. Use emojis when helpful. Be concise and clear.

Available actions (use them ONLY when clearly needed):
- send_hbar(amount: number, recipientId: string)  → user wants to send/transfer/pay HBAR
- get_balance()                                   → user asks for balance
- get_recent_transactions()                       → user wants transaction history
- check_address_safety(accountId: string)         → user wants to verify if an account is safe/risky

Rules:
1. If amount or account ID is missing → ask the user, never guess
2. When you need to use a tool: output ONLY valid JSON in this exact format and nothing else:
   {"tool_calls": [{"id": "call_abc123", "type": "function", "function": {"name": "tool_name", "arguments": "{\"key\":\"value\"}"}}]}
3. After you get tool results, give a natural final answer
4. For questions about Hedera, HBAR, wallets, blockchain etc. → just explain normally, no tools
5. Think step by step but do not show your thinking in the final output unless asked`;

// ── Handler ──
export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message?.trim())
      return NextResponse.json({ reply: "Please send a message." });

    let messages: ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: message.trim() },
    ];

    let stepsLeft = 12;

    while (stepsLeft-- > 0) {
      const resp = await openai.chat.completions.create({
        model: "google/gemma-3-4b",
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.1,
        max_tokens: 1024,
      });

      const msg = resp.choices[0].message;

      if (!msg.tool_calls?.length) {
        let text = msg.content?.trim() || "Sorry, I couldn't answer that.";
        text = text
          .replace(/balance/i, "💰 Balance")
          .replace(/successfully sent/i, "✅ Sent")
          .replace(/suspicious|risky/i, "⚠️ $&");
        return NextResponse.json({ reply: text });
      }

      messages.push(msg);

      const toolResponses = await Promise.all(
        msg.tool_calls.map(async (tc) => {
          const result = await runTool(tc);
          return {
            role: "tool",
            tool_call_id: tc.id,
            content: result,
          } satisfies ChatCompletionToolMessageParam;
        }),
      );

      messages.push(...toolResponses);
    }

    return NextResponse.json({
      reply: "Too many steps — please ask a simpler question.",
    });
  } catch (err: any) {
    console.error(err);
    let msg = "Something went wrong. Try again?";
    if (err.message?.includes("connect"))
      msg = "Cannot reach LM Studio — is the server running?";
    if (err.message?.includes("model"))
      msg = "Model name mismatch — check LM Studio UI.";
    return NextResponse.json({ reply: msg });
  }
}
