import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { message } = await request.json();
  if (!message) return NextResponse.json({ reply: "Please type a message." });

  // Normalize user input
  const text = message.toLowerCase().replace(/\s+/g, " ").trim();
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    `${request.headers.get("x-forwarded-proto") || "http"}://${request.headers.get("host")}`;

  try {
    // 🔹 SEND HBAR
    const sendMatch = text.match(/send (\d+(\.\d+)?)\s*hbar to (0\.0\.\d+)/i);
    if (sendMatch) {
      const amount = parseFloat(sendMatch[1]);
      const recipientId = sendMatch[3];

      const res = await fetch(`${baseUrl}/api/transfer-hbar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, amount }),
      });

      const data = await res.json();
      if (!res.ok) return NextResponse.json({ reply: `❌ ${data.error}` });

      return NextResponse.json({ reply: `✅ Sent ${amount} HBAR!\nTx ID: ${data.transactionId}` });
    }

    // 🔹 CHECK BALANCE
    if (/balance|my balance/i.test(text)) {
      const res = await fetch(`${baseUrl}/api/balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: process.env.HEDERA_ACCOUNT_ID }),
      });

      const data = await res.json();
      return NextResponse.json({ reply: `💰 Balance: ${data.balance} ℏ` });
    }

    // 🔹 TRANSACTION HISTORY
    if (/transaction|transactions|my transactions/i.test(text)) {
      const res = await fetch(`${baseUrl}/api/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: process.env.HEDERA_ACCOUNT_ID }),
      });

      const data = await res.json();
      if (!data.transactions || data.transactions.length === 0) {
        return NextResponse.json({ reply: "No recent transactions found." });
      }

      // Format transactions nicely
      const txList = data.transactions
        .map((tx: any) => `Tx ID: ${tx.transaction_id}\nType: ${tx.type}\nAmount: ${tx.amount}\nStatus: ${tx.status}`)
        .join("\n\n");

      return NextResponse.json({ reply: txList });
    }

    // 🔹 SAFETY CHECK
    const addressMatch = text.match(/0\.0\.\d+/);
    if (/safe|check address/i.test(text) && addressMatch) {
      const res = await fetch(`${baseUrl}/api/safety`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: addressMatch[0] }),
      });

      const data = await res.json();
      return NextResponse.json({
        reply: data.safe ? "✅ Address looks safe" : "⚠️ Address suspicious",
      });
    }

    // 🔹 FALLBACK
    return NextResponse.json({
      reply: "🤖 I can send HBAR, check balance, view transactions, or check address safety.",
    });
  } catch (error) {
    console.error("AI route error:", error);
    return NextResponse.json({ reply: "⚠️ Something went wrong. Try again later." });
  }
}
