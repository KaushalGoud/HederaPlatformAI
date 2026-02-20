import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { transactionId } = await request.json();

    const res = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/transactions/${transactionId}`
    );

    const data = await res.json();

    return NextResponse.json({
      summary: {
        status: data.transactions?.[0]?.result,
        transfers: data.transactions?.[0]?.transfers,
        consensusTime: data.transactions?.[0]?.consensus_timestamp,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to explain transaction" },
      { status: 500 }
    );
  }
}
