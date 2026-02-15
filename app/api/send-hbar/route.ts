
import { NextRequest, NextResponse } from 'next/server';
import {
  AccountId,
  Client,
  PublicKey,
  Transaction,
  TransactionId,
  TransferTransaction,
} from "@hashgraph/sdk";
import { KMSClient, GetPublicKeyCommand, SignCommand } from "@aws-sdk/client-kms";
import { z } from "zod";
import { sha384 } from "crypto-hash"; // Assuming this is available or needs to be installed

// Define KmsSigner class within the route file for self-containment
class KmsSigner {
    private readonly kmsClient: KMSClient;
    private readonly keyId: string;
    private readonly accountId: AccountId;
    private readonly publicKey: PublicKey; // Use PublicKey from @hashgraph/sdk

    constructor(
        kmsClient: KMSClient,
        keyId: string,
        accountId: AccountId,
        publicKey: PublicKey
    ) {
        this.kmsClient = kmsClient;
        this.keyId = keyId;
        this.accountId = accountId;
        this.publicKey = publicKey;
    }

    getAccountId(): AccountId {
        return this.accountId;
    }

    getAccountKey(): PublicKey {
        return this.publicKey;
    }

    async sign(message: Uint8Array): Promise<Uint8Array> {
        const signCommand = new SignCommand({
            KeyId: this.keyId,
            Message: Buffer.from(message), // KMS expects Buffer or Uint8Array
            SigningAlgorithm: "ECDSA_SECP256K1",
            MessageType: "DIGEST",
        });

        const { Signature } = await this.kmsClient.send(signCommand);

        if (!Signature) {
            throw new Error("Failed to sign transaction with KMS");
        }

        return Signature as Uint8Array;
    }
}

// Zod schema for input validation
const sendHbarSchema = z.object({
  recipient: z.string().regex(/^(0\.0\.)\d+$/), // Basic Hedera account ID format validation
  amount: z.number().positive(),
});

// Initialize KMS client and Hedera client globally (or per request if preferred for specific reasons)
const kmsClient = new KMSClient({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

let hederaClient: Client;
let operatorAccountId: AccountId;
let operatorPublicKey: PublicKey;

async function initializeHederaClient() {
    if (hederaClient) return; // Already initialized

    if (!process.env.HEDERA_ACCOUNT_ID || !process.env.AWS_KMS_KEY_ID) {
        throw new Error("Missing HEDERA_ACCOUNT_ID or AWS_KMS_KEY_ID environment variables.");
    }

    operatorAccountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);

    const getPublicKeyCommand = new GetPublicKeyCommand({
        KeyId: process.env.AWS_KMS_KEY_ID,
    });
    const publicKeyResponse = await kmsClient.send(getPublicKeyCommand);

    if (!publicKeyResponse.PublicKey) {
        throw new Error("Failed to get public key from KMS.");
    }

    operatorPublicKey = PublicKey.fromBytes(publicKeyResponse.PublicKey as Uint8Array);

    const kmsSigner = new KmsSigner(
        kmsClient,
        process.env.AWS_KMS_KEY_ID,
        operatorAccountId,
        operatorPublicKey
    );

    hederaClient = Client.forTestnet(); // Or forMainnet()
    hederaClient.setOperatorWith(
        operatorAccountId,
        operatorPublicKey,
        kmsSigner.sign.bind(kmsSigner)
    );
}

// Ensure client is initialized before handling requests
const initializationPromise = initializeHederaClient();

export async function POST(request: NextRequest) {
  await initializationPromise; // Wait for the client to be initialized

  try {
    const { recipient, amount } = sendHbarSchema.parse(await request.json());

    const transaction = await new TransferTransaction()
      .setTransactionId(TransactionId.generate(operatorAccountId))
      .addHbarTransfer(operatorAccountId, -amount)
      .addHbarTransfer(recipient, amount)
      .freezeWith(hederaClient);

    const response = await transaction.execute(hederaClient);
    const receipt = await response.getReceipt(hederaClient);

    return NextResponse.json({
      success: true,
      transactionId: transaction.transactionId?.toString(),
      receiptStatus: receipt.status.toString(),
    });
  } catch (error) {
    console.error("Hedera HBAR transfer error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Optional: GET handler for API status/info
export async function GET() {
  return NextResponse.json({
    message: "Hedera HBAR Transfer API",
    status: "Ready",
    operatorAccountId: operatorAccountId?.toString(),
  });
}
