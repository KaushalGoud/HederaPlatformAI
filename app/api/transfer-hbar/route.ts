import { NextResponse } from "next/server";
import {
  Client,
  Hbar,
  AccountId,
  PrivateKey,
  TransferTransaction,
} from "@hashgraph/sdk";

import { decryptPrivateKey } from "@/lib/kms";

export async function POST(request: Request) {
  try {
    const { recipientId, amount } = await request.json();

    if (!recipientId || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "Invalid recipient or amount" },
        { status: 400 }
      );
    }

    const ACCOUNT_ID = process.env.HEDERA_ACCOUNT_ID;
    if (!ACCOUNT_ID) {
      throw new Error("Account ID missing");
    }

    // 🔐 Decrypt private key securely
    const privateKeyString = await decryptPrivateKey();

    const client = Client.forTestnet().setOperator(
      AccountId.fromString(ACCOUNT_ID),
      PrivateKey.fromString(privateKeyString)
    );

    const txResponse = await new TransferTransaction()
      .addHbarTransfer(ACCOUNT_ID, new Hbar(-Number(amount)))
      .addHbarTransfer(recipientId, new Hbar(Number(amount)))
      .execute(client);

    const receipt = await txResponse.getReceipt(client);

    return NextResponse.json({
      transactionId: txResponse.transactionId.toString(),
      status: receipt.status.toString(),
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Transfer failed" },
      { status: 500 }
    );
  }
}
