import { NextResponse } from "next/server";

const HF_API_URL = "https://router.huggingface.co/v1/chat/completions";
const HF_MODEL =
  process.env.HF_MODEL || "mistralai/Mistral-7B-Instruct-v0.2";

const SYSTEM_PROMPT = `You are an AI assistant for a Hedera HBAR wallet.
If the user wants to send HBAR, respond ONLY with JSON:
{
  "action": "transfer_hbar",
  "recipientId": "0.0.xxxxx",
  "amount": 1
}`;

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    const hfResponse = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: HF_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
      }),
    });

    const hfData = await hfResponse.json();

    let aiText =
      hfData.choices?.[0]?.message?.content || "No response";

    aiText = aiText.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(aiText);
    } catch {
      return NextResponse.json({ reply: aiText });
    }

    // 🔥 If AI requests transfer
    if (parsed.action === "transfer_hbar") {
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        `${request.headers.get("x-forwarded-proto") || "http"}://${request.headers.get("host")}`;

      const transferResponse = await fetch(
        `${baseUrl}/api/transfer-hbar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientId: parsed.recipientId,
            amount: parsed.amount,
          }),
        }
      );

      const result = await transferResponse.json();

      if (!transferResponse.ok) {
        return NextResponse.json({
          reply: `❌ Transfer failed: ${result.error}`,
        });
      }

      return NextResponse.json({
        reply: `✅ Sent successfully!\nTX ID: ${result.transactionId}`,
      });
    }

    return NextResponse.json({ reply: aiText });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
