import { NextResponse } from "next/server";
import { decryptPrivateKey } from "@/lib/kms";

export async function GET() {
  try {
    const key = await decryptPrivateKey();

    return NextResponse.json({
      success: true,
      message: "Decryption successful",
      keyPreview: key.slice(0, 10) + "...", // never expose full key
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
