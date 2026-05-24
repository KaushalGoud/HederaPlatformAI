// app/api/balance/route.ts
import { NextResponse } from "next/server";
import { Client, AccountId, AccountBalanceQuery } from "@hashgraph/sdk";
import { getKmsPublicKey, kmsSign } from "@/lib/kms";

export async function POST(request: Request) {
  try {
    const { accountId } = await request.json();
    if (!accountId) {
      return NextResponse.json({ error: "Account ID required" }, { status: 400 });
    }

    if (!process.env.HEDERA_ACCOUNT_ID) {
      return NextResponse.json({ error: "Hedera account ID missing" }, { status: 500 });
    }

    // ✅ KMS signing — no private key needed
    const publicKey = await getKmsPublicKey();
    const client = Client.forTestnet().setOperatorWith(
      AccountId.fromString(process.env.HEDERA_ACCOUNT_ID),
      publicKey,
      kmsSign
    );

    const balance = await new AccountBalanceQuery()
      .setAccountId(AccountId.fromString(accountId))
      .execute(client);

    return NextResponse.json({
      balance: balance.hbars.toBigNumber().toFixed(8),
    });
  } catch (error: any) {
    console.error("Balance API error:", error);
    return NextResponse.json({ error: error.message || "Balance check failed" }, { status: 500 });
  }
}