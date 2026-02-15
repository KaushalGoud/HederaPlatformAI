import { NextResponse } from 'next/server'
import {
  Client,
  Hbar,
  AccountId,
  PrivateKey,
  TransferTransaction,
} from '@hashgraph/sdk'

export async function POST(request: Request) {
  try {
    const { recipientId, amount } = await request.json()

    if (!recipientId || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'Invalid recipientId or amount.' },
        { status: 400 }
      )
    }

    const ACCOUNT_ID = process.env.HEDERA_ACCOUNT_ID
    const PRIVATE_KEY = process.env.HEDERA_PRIVATE_KEY

    if (!ACCOUNT_ID || !PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Hedera credentials missing.' },
        { status: 500 }
      )
    }

    const client = Client.forTestnet()
    client.setOperator(
      AccountId.fromString(ACCOUNT_ID),
      PrivateKey.fromString(PRIVATE_KEY)
    )

    const txResponse = await new TransferTransaction()
      .addHbarTransfer(ACCOUNT_ID, new Hbar(-Number(amount)))
      .addHbarTransfer(recipientId, new Hbar(Number(amount)))
      .execute(client)

    const receipt = await txResponse.getReceipt(client)

    return NextResponse.json({
      transactionId: txResponse.transactionId.toString(),
      status: receipt.status.toString(),
    })
  } catch (error: any) {
    console.error('HBAR transfer error:', error)

    return NextResponse.json(
      { error: error.message || 'Transfer failed' },
      { status: 500 }
    )
  }
}
