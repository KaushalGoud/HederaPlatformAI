import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { accountId } = await request.json();

    if (!accountId.startsWith("0.0.")) {
      return NextResponse.json({
        safe: false,
        message: "Invalid Hedera account format",
      });
    }

    return NextResponse.json({
      safe: true,
      message: "Address appears valid",
    });
  } catch {
    return NextResponse.json(
      { error: "Safety check failed" },
      { status: 500 }
    );
  }
}
