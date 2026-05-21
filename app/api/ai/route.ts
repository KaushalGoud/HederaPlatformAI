// app/api/ai/route.ts
// Powered by Hedera Agent Kit (hedera-agent-kit) + Groq (free & fast)
// AWS KMS signing is preserved via a custom transfer tool.

import { NextResponse } from "next/server";
import { Client, AccountId, Hbar } from "@hashgraph/sdk";
import { HederaLangchainToolkit, coreQueriesPlugin } from "hedera-agent-kit";
import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { z } from "zod";
import { getKmsPublicKey, kmsSign } from "@/lib/kms";

// ─── Build a Hedera Testnet client backed by AWS KMS ───────────────────────
async function createKmsClient(): Promise<Client> {
  const ACCOUNT_ID = process.env.HEDERA_ACCOUNT_ID;
  if (!ACCOUNT_ID) throw new Error("HEDERA_ACCOUNT_ID not set in .env.local");

  const publicKey = await getKmsPublicKey();
  const client = Client.forTestnet().setOperatorWith(
    AccountId.fromString(ACCOUNT_ID),
    publicKey,
    kmsSign
  );
  client.setDefaultMaxTransactionFee(new Hbar(2));
  return client;
}

// ─── Custom transfer tool — uses your existing KMS-signed /api/transfer-hbar ─
function createTransferTool() {
  return new DynamicStructuredTool({
    name: "transfer_hbar",
    description:
      "Transfer HBAR to another Hedera account. " +
      "Call ONLY when the user explicitly asks to send / pay / transfer HBAR " +
      "and has provided both a recipient account ID and an amount.",
    schema: z.object({
      recipientId: z
        .string()
        .regex(/^0\.0\.\d+$/, "Must be a valid Hedera account ID: 0.0.XXXXX")
        .describe("Recipient Hedera account ID, e.g. 0.0.12345"),
      amount: z
        .number()
        .positive()
        .describe("Amount of HBAR to send (must be positive)"),
    }),
    func: async ({ recipientId, amount }) => {
      const base =
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      try {
        const res = await fetch(`${base}/api/transfer-hbar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipientId, amount }),
        });
        const data = await res.json();
        if (!res.ok)
          return `❌ Transfer failed: ${data.error || "unknown error"}`;
        return (
          `✅ Sent ${amount} HBAR to ${recipientId} successfully!\n` +
          `🔗 TX ID: ${data.transactionId}\n` +
          `🔍 HashScan: ${data.hashscanUrl}`
        );
      } catch (err: any) {
        return `❌ Transfer error: ${err.message}`;
      }
    },
  });
}

// ─── System prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are HASHFLOW 🌊, a secure and friendly Hedera HBAR wallet assistant.
You are powered by the Hedera Agent Kit and AWS KMS — the private key never leaves AWS hardware.

Your operator account: ${process.env.HEDERA_ACCOUNT_ID ?? "configured account"}

What you can do:
• 💰 Check HBAR balances (yours or any account)
• 📋 Show recent transaction history
• 💸 Transfer HBAR to other Hedera accounts
• ℹ️  Answer questions about Hedera, HBAR, and how HASHFLOW works

Rules:
1. For transfers, ALWAYS confirm recipient and amount with the user before calling transfer_hbar.
2. Never guess account IDs — ask if the user hasn't provided one.
3. Be concise, helpful, and use emojis to keep things fun.
4. After a transfer, always show the TX ID and HashScan link from the tool result.
5. If a tool fails, explain the error clearly and suggest a fix.`;

// ─── API Route ──────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message: string = body.message ?? "";
    const rawHistory: Array<{ role: string; content: string }> =
      body.history ?? [];

    if (!message.trim()) {
      return NextResponse.json({ reply: "Please type a message." });
    }

    // 1. KMS-backed Hedera client → pass to Agent Kit
    const client = await createKmsClient();

    // 2. Hedera Agent Kit toolkit — provides on-chain query tools
    const toolkit = new HederaLangchainToolkit({
      client,
      configuration: {
        plugins: [coreQueriesPlugin],
      },
    });
    const agentKitTools = toolkit.getTools();

    // 3. Custom transfer tool (uses KMS signing under the hood)
    const transferTool = createTransferTool();

    const tools = [...agentKitTools, transferTool];

    // 4. Groq as the LLM (free, fast)
    const llm = new ChatGroq({
      model: "llama-3.1-8b-instant",
      apiKey: process.env.GROQ_API_KEY!,
      temperature: 0,
    });

    // 5. Prompt
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", SYSTEM_PROMPT],
      ["placeholder", "{chat_history}"],
      ["human", "{input}"],
      ["placeholder", "{agent_scratchpad}"],
    ]);

    // 6. Build and run the LangChain agent
    const agent = createToolCallingAgent({ llm, tools, prompt });
    const executor = new AgentExecutor({
      agent,
      tools,
      maxIterations: 6,
      handleParsingErrors: true,
    });

    // Convert frontend history to LangChain messages
    const chatHistory = rawHistory.map((m) =>
      m.role === "user"
        ? new HumanMessage(m.content)
        : new AIMessage(m.content)
    );

    const result = await executor.invoke({
      input: message.trim(),
      chat_history: chatHistory,
    });

    return NextResponse.json({ reply: result.output as string });
  } catch (err: any) {
    console.error("[HASHFLOW AI Error]", err);

    let reply = "⚠️ Something went wrong. Please try again.";
    if (err.message?.includes("GROQ_API_KEY"))
      reply = "⚠️ GROQ_API_KEY is missing from .env.local";
    else if (err.message?.includes("HEDERA_ACCOUNT_ID"))
      reply = "⚠️ HEDERA_ACCOUNT_ID is missing from .env.local";
    else if (err.message?.includes("KMS"))
      reply = "⚠️ AWS KMS error — check your AWS credentials in .env.local";

    return NextResponse.json({ reply });
  }
}