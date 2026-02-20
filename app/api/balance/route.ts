import { NextResponse } from "next/server";
import { Client, AccountId, AccountBalanceQuery } from "@hashgraph/sdk";
import { decryptPrivateKey } from "@/lib/kms"; // your kms.ts file

export async function POST(request: Request) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID required" },
        { status: 400 },
      );
    }

    // 🔹 Create Hedera client for Testnet
    const client = Client.forTestnet();

    // 🔹 Decrypt your private key from AWS KMS
    if (!process.env.HEDERA_ACCOUNT_ID) {
      return NextResponse.json(
        { error: "Hedera account ID missing" },
        { status: 500 },
      );
    }

    const privateKey = await decryptPrivateKey(); // returns your plaintext key
    client.setOperator(
      AccountId.fromString(process.env.HEDERA_ACCOUNT_ID),
      privateKey,
    );

    // 🔹 Query balance
    const balance = await new AccountBalanceQuery()
      .setAccountId(AccountId.fromString(accountId))
      .execute(client);

    return NextResponse.json({
      balance: balance.hbars.toBigNumber(), // 💰 safe display
    });
  } catch (error: any) {
    console.error("Balance API error:", error);
    return NextResponse.json(
      { error: error.message || "Balance check failed" },
      { status: 500 },
    );
  }
}
