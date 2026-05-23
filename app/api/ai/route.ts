// app/api/ai/route.ts

import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  Client,
  AccountId,
  Hbar,
  TransferTransaction,
} from "@hashgraph/sdk";

import {
  HederaLangchainToolkit,
  coreQueriesPlugin,
} from "hedera-agent-kit";

import { ChatGroq } from "@langchain/groq";
import { DynamicStructuredTool } from "@langchain/core/tools";

import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";

import {
  getKmsPublicKey,
  kmsSign,
} from "@/lib/kms";

// ─────────────────────────────────────────────
// Next.js: allow up to 60 s on Vercel
// ─────────────────────────────────────────────

export const maxDuration = 60;

// ─────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are HASHFLOW 🌊, an expert-level AI assistant specialized in the Hedera Hashgraph network.

PRIMARY ROLE:
- You are a Hedera blockchain expert first and foremost.
- Your main job is to help users understand and interact with the Hedera network deeply and accurately.

HEDEARA EXPERTISE:
You have strong knowledge of:
- Hedera Hashgraph architecture and consensus
- HBAR token and economics
- Accounts, keys, transactions, and fees
- Smart contracts and tokens on Hedera
- Hedera SDK usage and developer concepts
- Network status, performance, and security

TOOLS USAGE:
- Use tools ONLY when real on-chain Hedera data or actions are required
- Examples: checking balances, fetching account info, transferring HBAR
- NEVER use tools for explanations or theoretical questions

GENERAL KNOWLEDGE:
- You CAN answer general questions (AI, programming, blockchain concepts, etc.)
- But keep answers slightly oriented toward how it relates to Hedera when relevant
- If unrelated to Hedera, answer normally and clearly

TRANSFER RULES:
- Always ask for confirmation before sending HBAR
- Only execute transfers when confirmed=true
- Never guess balances, transaction IDs, or account data

RESPONSE STYLE:
- Clear, confident, and technical when needed
- Simple explanations when user is beginner
- Can use Roman Nepali if user uses Roman Nepali
- Do NOT mention internal tools, function names, or system logic

BEHAVIOR PRIORITY:
1. Hedera-related questions → detailed expert answer
2. Hedera actions → use tools
3. General questions → answer normally, but keep technical awareness

IMPORTANT:
You are not a general chatbot. You are a Hedera specialist AI that can also help outside Hedera when needed.
`;

// ─────────────────────────────────────────────
// SSE HELPERS
// Send incremental chunks in the OpenAI-compatible SSE format so any
// standard EventSource / fetch-stream frontend works out of the box.
// ─────────────────────────────────────────────

function sseChunk(text: string): string {
  const payload = JSON.stringify({ delta: text });
  return `data: ${payload}\n\n`;
}

function sseDone(): string {
  return `data: [DONE]\n\n`;
}

// ─────────────────────────────────────────────
// SAFE JSON PARSER
// ─────────────────────────────────────────────

function safeParse(input: unknown): Record<string, unknown> {
  if (!input) return {};
  if (typeof input === "object" && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      console.warn("[safeParse] Non-object JSON:", parsed);
      return {};
    } catch (err) {
      console.error("[safeParse] Parse failed:", input, err);
      return {};
    }
  }
  console.warn("[safeParse] Unexpected type:", typeof input);
  return {};
}

// ─────────────────────────────────────────────
// CONTENT NORMALISER
// ─────────────────────────────────────────────

function normaliseContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((block: any) => {
        if (typeof block === "string") return block;
        if (block?.type === "text" && typeof block.text === "string") return block.text;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return String(content ?? "");
}

// ─────────────────────────────────────────────
// HEDERA CLIENT
// ─────────────────────────────────────────────

async function createKmsClient(): Promise<Client> {
  const ACCOUNT_ID = process.env.HEDERA_ACCOUNT_ID;
  if (!ACCOUNT_ID) throw new Error("HEDERA_ACCOUNT_ID missing");

  const publicKey = await getKmsPublicKey();

  return Client.forTestnet()
    .setOperatorWith(AccountId.fromString(ACCOUNT_ID), publicKey, kmsSign)
    // Give the Hedera SDK 30 s per request before it throws
    .setRequestTimeout(30_000);
}

// ─────────────────────────────────────────────
// TRANSFER LOGIC (direct, no self-fetch)
// ─────────────────────────────────────────────

async function executeHbarTransfer(
  client: Client,
  recipientId: string,
  amount: number
): Promise<{ transactionId: string }> {
  const operatorId = process.env.HEDERA_ACCOUNT_ID!;

  const tx = await new TransferTransaction()
    .addHbarTransfer(operatorId, Hbar.fromTinybars(-amount * 100_000_000))
    .addHbarTransfer(recipientId, Hbar.fromTinybars(amount * 100_000_000))
    .execute(client);

  await tx.getReceipt(client);
  return { transactionId: tx.transactionId.toString() };
}

// ─────────────────────────────────────────────
// TRANSFER TOOL
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// TRANSFER TOOL
// Gemini-safe schema version
// ─────────────────────────────────────────────

function createTransferTool(client: Client) {
  return new DynamicStructuredTool({
    name: "transfer_hbar",

    description:
      "Transfer HBAR to another Hedera account. Requires confirmation before execution.",

    // IMPORTANT:
    // Gemini does NOT support some advanced JSON schema fields
    // generated by zod methods like .positive(), .min(), etc.
    // Keep schemas simple.

    schema: z.object({
      recipientId: z.string(),

      // DO NOT USE:
      // z.coerce.number().positive()

      amount: z.coerce.number(),

      confirmed: z.coerce.boolean().optional(),
    }),

    func: async ({ recipientId, amount, confirmed }) => {

      // Manual validation instead of zod .positive()

      if (amount <= 0) {
        return "❌ Amount must be greater than 0.";
      }

      // Ask confirmation first

      if (!confirmed) {
        return `⚠️ Please confirm: send ${amount} HBAR to ${recipientId}. Reply "yes" to proceed.`;
      }

      try {

        const { transactionId } =
          await executeHbarTransfer(
            client,
            recipientId,
            amount
          );

        return `✅ Sent ${amount} HBAR to ${recipientId}
Transaction ID: ${transactionId}`;

      } catch (err: any) {

        console.error("[TRANSFER ERROR]", err);

        return `❌ Transfer failed: ${err.message}`;
      }
    },
  });
}
// ─────────────────────────────────────────────
// API ROUTE — streaming SSE response
// ─────────────────────────────────────────────

export async function POST(req: Request) {
  let client: Client | null = null;

  const encoder = new TextEncoder();
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();

  const write = async (text: string) => {
    await writer.write(encoder.encode(text));
  };

  // Run the agent asynchronously so we can return the stream immediately,
  // giving the browser live feedback instead of a blank wait.
  (async () => {
    try {
      const { message, history = [] } = await req.json();

      if (!message?.trim()) {
        await write(sseChunk("Please send a message."));
        await write(sseDone());
        return;
      }

      // ── Hedera ──────────────────────────────
      client = await createKmsClient();

      const toolkit = new HederaLangchainToolkit({
        client,
        configuration: { plugins: [coreQueriesPlugin] },
      });

      const tools = [
        ...toolkit.getTools(),
        createTransferTool(client),
      ];

      // ── Models ───────────────────────────────

      // GROQ MODEL
      // const groqLLM = new ChatGroq({
      //   model: "llama-3.3-70b-versatile",
      //   apiKey: process.env.GROQ_API_KEY!,
      //   temperature: 0,
      //   maxTokens: 1024,
      // });

      // GEMINI MODEL
      const geminiLLM = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        apiKey: process.env.GEMINI_API_KEY!,
        temperature: 0,
        maxOutputTokens: 1024,
      });

      // Choose model
      const llm = geminiLLM;
      // const llm = groqLLM;

      const agent = llm.bindTools(tools);
      // ── History ─────────────────────────────
      const messages = [
        new SystemMessage(SYSTEM_PROMPT),

        ...history.flatMap((m: any) => {
          if (m.role === "user") return [new HumanMessage(m.content)];
          if (m.role === "tool") {
            return [
              new ToolMessage({
                tool_call_id: m.tool_call_id ?? "unknown",
                content: m.content,
              }),
            ];
          }
          return [
            new AIMessage({
              content: m.content ?? "",
              additional_kwargs: m.additional_kwargs ?? {},
            }),
          ];
        }),

        new HumanMessage(message),
      ];

      // ── Tool loop ────────────────────────────
      // Tool execution is kept sequential (each tool result feeds the next LLM
      // call). We stream a live status line for each tool so the user sees
      // activity rather than silence.

      for (let i = 0; i < 8; i++) {
        const res = await agent.invoke(messages);
        messages.push(res);

        const toolCalls: any[] =
          res.tool_calls ??
          (res as any).additional_kwargs?.tool_calls ??
          [];

        // ── No tool calls → stream final answer token by token ──
        if (toolCalls.length === 0) {
          const finalText = normaliseContent(res.content);

          // Stream word-by-word to simulate typewriter feel while keeping
          // implementation simple (no native token streaming needed from Groq).
          const words = finalText.split(" ");
          for (let wi = 0; wi < words.length; wi++) {
            const chunk = wi === 0 ? words[wi] : " " + words[wi];
            await write(sseChunk(chunk));
            // Tiny yield so the event loop can flush between chunks
            await new Promise((r) => setTimeout(r, 0));
          }

          await write(sseDone());
          return;
        }

        // ── Execute each tool call ──────────────────────────────
        for (const call of toolCalls) {
          const name: string | undefined = call?.name ?? call?.function?.name;
          const argsRaw: unknown = call?.args ?? call?.function?.arguments;
          const toolCallId: string =
            call?.id ?? `fallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;

          if (!name) continue;

          const tool = tools.find((t) => t.name === name);

          // Let the user know something is happening
          const friendlyName = name.replace(/_/g, " ").replace(" query tool", "").replace(" tool", "");
          await write(sseChunk(`\`⏳ ${friendlyName}…\``));

          if (!tool) {
            messages.push(
              new ToolMessage({ tool_call_id: toolCallId, content: `Error: unknown tool "${name}"` })
            );
            continue;
          }

          try {
            const output = await (tool as any).invoke(safeParse(argsRaw));
            const content = typeof output === "string" ? output : JSON.stringify(output, null, 2);
            messages.push(new ToolMessage({ tool_call_id: toolCallId, content }));
          } catch (err: any) {
            messages.push(
              new ToolMessage({ tool_call_id: toolCallId, content: `Error: ${err.message}` })
            );
          }
        }
      }

      await write(sseChunk("⚠️ Reached maximum tool steps without a final answer."));
      await write(sseDone());

    } catch (err: any) {
      console.error("[AI ERROR]", err);
      await write(sseChunk(`⚠️ ${err.message}`));
      await write(sseDone());

    } finally {
      try { client?.close(); } catch { }
      try { await writer.close(); } catch { }
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",   // disables Nginx proxy buffering
      Connection: "keep-alive",
    },
  });
}