import { NextResponse } from "next/server";
import {
  Client,
  Hbar,
  AccountId,
  TransferTransaction,
  Status,
  TransactionId,
  Timestamp,
} from "@hashgraph/sdk";
import { getKmsPublicKey, kmsSign } from "@/lib/kms";

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
        { status: 400 }
      );
    }

    const ACCOUNT_ID = process.env.HEDERA_ACCOUNT_ID;
    if (!ACCOUNT_ID) throw new Error("HEDERA_ACCOUNT_ID missing");

    // Get public key from KMS (private key never leaves AWS)
    const publicKey = await getKmsPublicKey();

    // Use setOperatorWith — passes kmsSign as the signer callback
    // KMS signs every transaction automatically, private key never leaves AWS
    const client = Client.forTestnet().setOperatorWith(
      AccountId.fromString(ACCOUNT_ID),
      publicKey,
      kmsSign
    );

    client.setDefaultMaxTransactionFee(new Hbar(2));
    client.setDefaultMaxQueryPayment(new Hbar(1));

    const validStartDate = new Date(Date.now() - 30_000);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📤 Executing transfer via AWS KMS signing...");
    console.log(`💸 From        : ${ACCOUNT_ID}`);
    console.log(`💸 To          : ${recipientId}`);
    console.log(`💸 Amount      : ${amount} HBAR`);
    console.log(`🕐 Valid Start : ${validStartDate.toISOString()}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Execute — setOperatorWith handles KMS signing automatically
    const txResponse = await new TransferTransaction()
      .addHbarTransfer(ACCOUNT_ID, new Hbar(-Number(amount)))
      .addHbarTransfer(recipientId, new Hbar(Number(amount)))
      .setTransactionValidDuration(180)
      .setTransactionId(
        TransactionId.withValidStart(
          AccountId.fromString(ACCOUNT_ID),
          Timestamp.fromDate(validStartDate)
        )
      )
      .execute(client);

    console.log(`📋 TX submitted : ${txResponse.transactionId.toString()}`);
    console.log("⏳ Waiting for receipt...");

    let receipt;
    try {
      receipt = await txResponse.getReceipt(client);
    } catch (receiptError: any) {
      console.error("❌ Receipt error:", receiptError);
      console.error("❌ Receipt status:", receiptError?.status?.toString());
      return NextResponse.json(
        {
          error: `Transaction rejected: ${receiptError?.status?.toString() || receiptError?.message}`,
        },
        { status: 400 }
      );
    }

    const txId = txResponse.transactionId.toString();
    const statusStr = receipt.status.toString();

    if (receipt.status !== Status.Success) {
      console.error(`❌ Transaction failed with status: ${statusStr}`);
      return NextResponse.json(
        { error: `Transaction failed: ${statusStr}` },
        { status: 400 }
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

    if (message.includes("INSUFFICIENT_ACCOUNT_BALANCE"))
      message = "Insufficient balance to complete transfer";
    else if (message.includes("INVALID_ACCOUNT_ID"))
      message = "Invalid recipient account ID";
    else if (message.includes("INVALID_TRANSACTION_START"))
      message = "Clock sync issue — run: w32tm /resync /force in terminal as Admin";
    else if (message.includes("ACCOUNT_FROZEN"))
      message = "Account is frozen";
    else if (message.includes("INVALID_SIGNATURE"))
      message = "Invalid signature — make sure you ran the link-kms-key script to update your Hedera account key";
    else if (message.includes("PAYER_ACCOUNT_NOT_FOUND"))
      message = "Payer account not found — check HEDERA_ACCOUNT_ID";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}