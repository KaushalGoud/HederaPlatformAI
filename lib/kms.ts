import { KMSClient, DecryptCommand } from "@aws-sdk/client-kms";

const kmsClient = new KMSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function decryptPrivateKey(): Promise<string> {
  const encryptedKey = process.env.ENCRYPTED_PRIVATE_KEY;

  if (!encryptedKey) throw new Error("Encrypted private key not configured");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔐 [KMS] Sending decrypt request to AWS...");
  console.log("📍 Region  :", process.env.AWS_REGION);
  console.log("🗝️  Key ID  :", process.env.AWS_KMS_KEY_ID);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const start = Date.now();
  const command = new DecryptCommand({
    CiphertextBlob: Buffer.from(encryptedKey, "base64"),
    KeyId: process.env.AWS_KMS_KEY_ID,
  });

  const response = await kmsClient.send(command);
  if (!response.Plaintext) throw new Error("KMS decryption failed");

  const duration = Date.now() - start;

  console.log("✅ [KMS] Decryption SUCCESS");
  console.log("🔒 Algorithm :", response.EncryptionAlgorithm);
  console.log(`⏱️  Took      : ${duration}ms`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return Buffer.from(response.Plaintext).toString("utf-8");
}