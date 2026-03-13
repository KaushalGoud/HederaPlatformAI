import { NextResponse } from "next/server";
import {
  Client,
  Hbar,
  AccountId,
  PrivateKey,
  TransferTransaction,
  Status,
  TransactionId,
  Timestamp,
} from "@hashgraph/sdk";
import { decryptPrivateKey } from "@/lib/kms";

function formatHashscanUrl(txId: string): string {
  const [accountPart, timestampPart] = txId.split("@");
  const [seconds, nanos] = timestampPart.split(".");
  const formatted = `${accountPart}-${seconds}-${nanos}`;
  const hashscanUrl = `https://hashscan.io/testnet/transaction/${formatted}`;

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📋 Raw TX ID    : ${txId}`);
  console.log(`📋 Formatted ID : ${formatted}`);
  console.log(`🔍 Hashscan URL : ${hashscanUrl}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return hashscanUrl;
}

export async function POST(request: Request) {
  try {
    const { recipientId, amount } = await request.json();

    if (!recipientId || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "Invalid recipient or amount" },
        { status: 400 },
      );
    }

    const ACCOUNT_ID = process.env.HEDERA_ACCOUNT_ID;
    if (!ACCOUNT_ID) throw new Error("Account ID missing");

    const privateKeyString = await decryptPrivateKey();
    const privateKey = PrivateKey.fromString(privateKeyString);

    const client = Client.forTestnet().setOperator(
      AccountId.fromString(ACCOUNT_ID),
      privateKey,
    );

    client.setDefaultMaxTransactionFee(new Hbar(2));
    client.setDefaultMaxQueryPayment(new Hbar(1));

    // ✅ KEY FIX: manually set valid start 30 seconds in the past
    const validStartDate = new Date(Date.now() - 30_000);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📤 Executing transfer transaction...");
    console.log(`💸 From        : ${ACCOUNT_ID}`);
    console.log(`💸 To          : ${recipientId}`);
    console.log(`💸 Amount      : ${amount} HBAR`);
    console.log(`🕐 Valid Start : ${validStartDate.toISOString()}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const txResponse = await new TransferTransaction()
      .addHbarTransfer(ACCOUNT_ID, new Hbar(-Number(amount)))
      .addHbarTransfer(recipientId, new Hbar(Number(amount)))
      .setTransactionValidDuration(180)
      .setTransactionId(
        // ✅ Force transaction start time 30s in the past to avoid clock skew
        TransactionId.withValidStart(
          AccountId.fromString(ACCOUNT_ID),
          Timestamp.fromDate(validStartDate),
        ),
      )
      .execute(client);

    console.log(`📋 TX submitted : ${txResponse.transactionId.toString()}`);
    console.log("⏳ Waiting for receipt...");

    const receipt = await txResponse.getReceipt(client);
    const txId = txResponse.transactionId.toString();
    const statusStr = receipt.status.toString();

    if (receipt.status !== Status.Success) {
      console.error(`❌ Transaction failed with status: ${statusStr}`);
      return NextResponse.json(
        { error: `Transaction failed: ${statusStr}` },
        { status: 400 },
      );
    }

    const hashscanUrl = formatHashscanUrl(txId);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Transaction SUCCESS");
    console.log(`📋 TX ID   : ${txId}`);
    console.log(`📊 Status  : ${statusStr}`);
    console.log(`🔍 Hashscan: ${hashscanUrl}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return NextResponse.json({
      transactionId: txId,
      status: statusStr,
      hashscanUrl,
    });
  } catch (error: any) {
    console.error("❌ Transfer error:", error);

    let message = error.message || "Transfer failed";

    if (message.includes("INSUFFICIENT_ACCOUNT_BALANCE")) {
      message = "Insufficient balance to complete transfer";
    } else if (message.includes("INVALID_ACCOUNT_ID")) {
      message = "Invalid recipient account ID";
    } else if (message.includes("INVALID_TRANSACTION_START")) {
      message =
        "Clock sync issue — run: w32tm /resync /force in terminal as Admin";
    } else if (message.includes("ACCOUNT_FROZEN")) {
      message = "Account is frozen";
    } else if (message.includes("INVALID_SIGNATURE")) {
      message = "Invalid signature — check your private key";
    } else if (message.includes("PAYER_ACCOUNT_NOT_FOUND")) {
      message = "Payer account not found — check HEDERA_ACCOUNT_ID";
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
