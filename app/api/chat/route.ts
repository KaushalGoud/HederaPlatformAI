import { NextResponse } from 'next/server'

const HF_API_URL = 'https://router.huggingface.co/v1/chat/completions'
const HF_MODEL = process.env.HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2'

const SYSTEM_PROMPT = `You are an AI assistant for a Hedera HBAR transaction application.
If the user wants to send HBAR, respond ONLY with valid JSON:
{
  "action": "transfer_hbar",
  "recipientId": "0.0.xxxxx",
  "amount": 1
}
Do not include explanations, markdown, or extra text.`

export async function POST(request: Request) {
  try {
    const { message } = await request.json()
    if (!message)
      return NextResponse.json({ error: 'Message required' }, { status: 400 })

    const HF_API_KEY = process.env.HF_API_KEY
    if (!HF_API_KEY)
      return NextResponse.json(
        { error: 'HF API key missing' },
        { status: 500 }
      )

    // 🔹 Call Hugging Face
    const hfResponse = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: HF_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
      }),
    })

    const hfData = await hfResponse.json()
    let aiText =
      hfData.choices?.[0]?.message?.content || 'No response from model.'

    // 🔹 Remove markdown if model returns ```json
    aiText = aiText.replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(aiText)
    } catch {
      return NextResponse.json({ reply: aiText })
    }

    // 🔥 If transfer requested → EXECUTE IT
    if (parsed.action === 'transfer_hbar') {
      const { recipientId, amount } = parsed

      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`

      const transferResponse = await fetch(`${baseUrl}/api/transfer-hbar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId, amount }),
      })

      const result = await transferResponse.json()

      if (!transferResponse.ok) {
        return NextResponse.json({
          reply: `❌ Transfer failed: ${result.error}`,
        })
      }

      return NextResponse.json({
        reply: `✅ HBAR sent successfully!\nTransaction ID: ${result.transactionId}`,
      })
    }

    return NextResponse.json({ reply: aiText })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
