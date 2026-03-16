import { NextResponse } from "next/server";
import { KMSClient, DescribeKeyCommand, GetKeyRotationStatusCommand } from "@aws-sdk/client-kms";

export async function GET() {
  try {
    const client = new KMSClient({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const [keyData, rotationData] = await Promise.all([
      client.send(new DescribeKeyCommand({ KeyId: process.env.AWS_KMS_KEY_ID! })),
      client.send(new GetKeyRotationStatusCommand({ KeyId: process.env.AWS_KMS_KEY_ID! })),
    ]);

    const meta = keyData.KeyMetadata;

    return NextResponse.json({
      proof: "AWS KMS is active",
      keyId: meta?.KeyId,
      keyArn: meta?.Arn,
      keyState: meta?.KeyState,
      keyUsage: meta?.KeyUsage,
      creationDate: meta?.CreationDate,
      rotationEnabled: rotationData.KeyRotationEnabled ?? false,
      region: process.env.AWS_REGION,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}