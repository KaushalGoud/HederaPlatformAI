import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { accountId } = await req.json();

  if (!accountId) {
    return NextResponse.json({ error: "Account ID required" }, { status: 400 });
  }

  try {
    // Fetch last 10 transactions for the account from Hedera Testnet Mirror Node
    const mirrorUrl = `https://testnet.mirrornode.hedera.com/api/v1/transactions?account.id=${accountId}&limit=10&order=desc`;
    const res = await fetch(mirrorUrl);
    const data = await res.json();

    if (!data.transactions || data.transactions.length === 0) {
      return NextResponse.json({
        transactions: [],
        message: "No recent transactions found",
      });
    }

    // Format transactions safely
    const formatted = data.transactions.map((tx: any) => {
      const selfTransfer = tx.transfers?.find((t: any) => t.account === accountId);
      const counterpartyTransfer = tx.transfers?.find((t: any) => t.account !== accountId);

      const amount = selfTransfer ? Math.abs(selfTransfer.amount / 100_000_000) : 0;
      const direction = selfTransfer && selfTransfer.amount < 0 ? "Sent" : "Received";
      const counterparty = counterpartyTransfer?.account || "Unknown";

      return `${direction} ${amount} HBAR ${direction === "Sent" ? "to" : "from"} ${counterparty} | Tx ID: ${tx.transaction_id} | Type: ${tx.name} | Status: ${tx.result}`;
    });

    return NextResponse.json({ transactions: formatted });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
