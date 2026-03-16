import {
  Client,
  AccountId,
  AccountUpdateTransaction,
  PrivateKey,
  TransactionId,
  Timestamp,
} from "@hashgraph/sdk";
import { getKmsPublicKey, kmsSign } from "../lib/kms";
import * as path from "path";
import * as fs from "fs";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const eqIndex = trimmed.indexOf("=");
  if (eqIndex === -1) return;
  const key = trimmed.substring(0, eqIndex).trim();
  const value = trimmed.substring(eqIndex + 1).trim();
  process.env[key] = value;
});

async function linkKmsKey() {
  const ACCOUNT_ID = process.env.HEDERA_ACCOUNT_ID!;
  const ORIGINAL_KEY = process.env.HEDERA_PRIVATE_KEY!;

  if (!ACCOUNT_ID) throw new Error("HEDERA_ACCOUNT_ID missing in .env.local");
  if (!ORIGINAL_KEY) throw new Error("HEDERA_PRIVATE_KEY missing in .env.local");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔗 Linking KMS public key to Hedera account...");
  console.log(`📋 Account: ${ACCOUNT_ID}`);

  const oldKey = PrivateKey.fromStringECDSA(ORIGINAL_KEY);
  const client = Client.forTestnet().setOperator(
    AccountId.fromString(ACCOUNT_ID),
    oldKey
  );

  console.log("🔑 Fetching KMS public key from AWS...");
  const kmsPublicKey = await getKmsPublicKey();
  console.log(`✅ KMS Public Key: ${kmsPublicKey.toString()}`);

  const validStartDate = new Date(Date.now() - 30_000);

  console.log("📝 Building AccountUpdateTransaction...");
  const tx = await new AccountUpdateTransaction()
    .setAccountId(AccountId.fromString(ACCOUNT_ID))
    .setKey(kmsPublicKey)
    .setTransactionId(
      TransactionId.withValidStart(
        AccountId.fromString(ACCOUNT_ID),
        Timestamp.fromDate(validStartDate)
      )
    )
    .freezeWith(client);

  // Sign with OLD key (proves you own the account)
  console.log("✍️  Signing with old key...");
  await tx.sign(oldKey);

  // Sign with NEW key (proves you own the new KMS key)
  console.log("✍️  Signing with new KMS key...");
  await tx.signWith(kmsPublicKey, async (message: Uint8Array) => {
    return await kmsSign(message);
  });

  console.log("📤 Executing transaction...");
  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ Status: ${receipt.status.toString()}`);
  console.log("🔐 Account now uses AWS KMS for all signing");
  console.log("🗑️  Remove HEDERA_PRIVATE_KEY from .env.local");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

linkKmsKey().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});