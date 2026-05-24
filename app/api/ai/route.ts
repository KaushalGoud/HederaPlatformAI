// app/api/ai/route.ts

import { z } from "zod";
import { Client, AccountId, Hbar, TransferTransaction } from "@hashgraph/sdk";
import { HederaLangchainToolkit, coreQueriesPlugin } from "hedera-agent-kit";
import { ChatOpenAI } from "@langchain/openai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { getKmsPublicKey, kmsSign } from "@/lib/kms";

export const maxDuration = 60;

// ─── System Prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `
You are HASHFLOW 🌊, an expert-level AI assistant specialized in the Hedera Hashgraph network.

PRIMARY ROLE:
- You are a Hedera blockchain expert first and foremost.
- Your main job is to help users understand and interact with the Hedera network deeply and accurately.

HEDERA EXPERTISE:
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

TRANSFER RULES:
- Always ask for confirmation before sending HBAR
- Only execute transfers when confirmed=true
- Never guess balances, transaction IDs, or account data

RESPONSE STYLE:
- Clear, confident, and technical when needed
- Simple explanations when user is beginner
- Can use Roman Nepali if user uses Roman Nepali
- Do NOT mention internal tools, function names, or system logic
`;

// ─── SSE Helpers ────────────────────────────────────────────────────────────
const sseChunk = (text: string) => `data: ${JSON.stringify({ delta: text })}\n\n`;
const sseDone = () => `data: [DONE]\n\n`;

// ─── Safe JSON Parser ────────────────────────────────────────────────────────
function safeParse(input: unknown): Record<string, unknown> {
  if (!input) return {};
  if (typeof input === "object" && !Array.isArray(input)) return input as Record<string, unknown>;
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) return parsed;
    } catch { }
  }
  return {};
}

// ─── Content Normaliser ──────────────────────────────────────────────────────
function normaliseContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((b: any) => (typeof b === "string" ? b : b?.type === "text" ? b.text : ""))
      .filter(Boolean)
      .join("\n");
  }
  return String(content ?? "");
}

// ─── Hedera KMS Client ───────────────────────────────────────────────────────
async function createKmsClient(): Promise<Client> {
  const ACCOUNT_ID = process.env.HEDERA_ACCOUNT_ID;
  if (!ACCOUNT_ID) throw new Error("HEDERA_ACCOUNT_ID missing");
  const publicKey = await getKmsPublicKey();
  return Client.forTestnet()
    .setOperatorWith(AccountId.fromString(ACCOUNT_ID), publicKey, kmsSign)
    .setRequestTimeout(30_000);
}

// ─── Transfer Logic ──────────────────────────────────────────────────────────
async function executeHbarTransfer(client: Client, recipientId: string, amount: number) {
  const operatorId = process.env.HEDERA_ACCOUNT_ID!;
  const tx = await new TransferTransaction()
    .addHbarTransfer(operatorId, Hbar.fromTinybars(-amount * 100_000_000))
    .addHbarTransfer(recipientId, Hbar.fromTinybars(amount * 100_000_000))
    .execute(client);
  await tx.getReceipt(client);
  return { transactionId: tx.transactionId.toString() };
}

// ─── Transfer Tool ───────────────────────────────────────────────────────────
function createTransferTool(client: Client) {
  return new DynamicStructuredTool({
    name: "transfer_hbar",
    description: "Transfer HBAR to another Hedera account. Requires confirmation before execution.",
    schema: z.object({
      recipientId: z.string(),
      amount: z.coerce.number(),
      confirmed: z.coerce.boolean().optional(),
    }),
    func: async ({ recipientId, amount, confirmed }) => {
      if (amount <= 0) return "❌ Amount must be greater than 0.";
      if (!confirmed) return `⚠️ Please confirm: send ${amount} HBAR to ${recipientId}. Reply "yes" to proceed.`;
      try {
        const { transactionId } = await executeHbarTransfer(client, recipientId, amount);
        return `✅ Sent ${amount} HBAR to ${recipientId}\nTransaction ID: ${transactionId}`;
      } catch (err: any) {
        return `❌ Transfer failed: ${err.message}`;
      }
    },
  });
}

// ─── API Route ───────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  let client: Client | null = null;

  const encoder = new TextEncoder();
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();
  const write = async (text: string) => writer.write(encoder.encode(text));

  (async () => {
    try {
      const { message, history = [] } = await req.json();

      if (!message?.trim()) {
        await write(sseChunk("Please send a message."));
        await write(sseDone());
        return;
      }

      // Hedera client + tools
      client = await createKmsClient();
      const toolkit = new HederaLangchainToolkit({
        client,
        configuration: { plugins: [coreQueriesPlugin] },
      });
      const tools = [...toolkit.getTools(), createTransferTool(client)];

      // GitHub Models — GPT-4o-mini (free, fast, great tool-calling)
      const llm = new ChatOpenAI({
        model: "openai/gpt-4o-mini",
        apiKey: process.env.GITHUB_TOKEN!,
        configuration: {
          baseURL: "https://models.github.ai/inference",
        },
        temperature: 0,
        maxTokens: 1024,
      });

      const agent = llm.bindTools(tools);

      // Build message history
      const messages = [
        new SystemMessage(SYSTEM_PROMPT),
        ...history.flatMap((m: any) => {
          if (m.role === "user") return [new HumanMessage(m.content)];
          if (m.role === "tool") return [new ToolMessage({ tool_call_id: m.tool_call_id ?? "unknown", content: m.content })];
          return [new AIMessage({ content: m.content ?? "", additional_kwargs: m.additional_kwargs ?? {} })];
        }),
        new HumanMessage(message),
      ];

      // Agentic loop
      for (let i = 0; i < 8; i++) {
        const res = await agent.invoke(messages);
        messages.push(res);

        const toolCalls: any[] = res.tool_calls ?? (res as any).additional_kwargs?.tool_calls ?? [];

        // No tool calls → stream final answer
        if (toolCalls.length === 0) {
          const finalText = normaliseContent(res.content);
          const words = finalText.split(" ");
          for (let wi = 0; wi < words.length; wi++) {
            await write(sseChunk(wi === 0 ? words[wi] : " " + words[wi]));
            await new Promise((r) => setTimeout(r, 0));
          }
          await write(sseDone());
          return;
        }

        // Execute tool calls
        for (const call of toolCalls) {
          const name: string | undefined = call?.name ?? call?.function?.name;
          const argsRaw: unknown = call?.args ?? call?.function?.arguments;
          const toolCallId = call?.id ?? `fallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;

          if (!name) continue;

          const tool = tools.find((t) => t.name === name);
          const friendlyName = name.replace(/_/g, " ").replace(" query tool", "").replace(" tool", "");
          await write(sseChunk(`\`⏳ ${friendlyName}…\``));

          if (!tool) {
            messages.push(new ToolMessage({ tool_call_id: toolCallId, content: `Error: unknown tool "${name}"` }));
            continue;
          }

          try {
            const output = await (tool as any).invoke(safeParse(argsRaw));
            messages.push(new ToolMessage({ tool_call_id: toolCallId, content: typeof output === "string" ? output : JSON.stringify(output, null, 2) }));
          } catch (err: any) {
            messages.push(new ToolMessage({ tool_call_id: toolCallId, content: `Error: ${err.message}` }));
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
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}