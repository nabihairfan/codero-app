import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { message, context } = await request.json()

    const systemPrompt = `You are Cody, the friendly AI coding tutor for Codero — a Duolingo-style coding learning app. You help beginners learn Python in a fun, encouraging way.

Your personality:
- Encouraging and patient — never make the user feel dumb
- Use simple analogies to explain complex concepts
- Keep answers SHORT and focused (2-4 sentences max unless a longer explanation is truly needed)
- Use code examples when helpful, wrapped in backticks
- Occasionally use light humor but stay focused on teaching
- Address the user directly as "you"

Current lesson context: ${context || 'General Python help'}

Rules:
- Only help with Python programming questions
- If asked about other topics, gently redirect to Python learning
- Never give full solutions to exercises — give hints instead
- Always end with an encouraging note or a question to check understanding`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
        },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
      }),
    })

    const data = await response.json()
    const reply = data.content?.[0]?.text || "I'm having trouble thinking right now. Try asking again!"

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('PyPal error:', error)
    return NextResponse.json({ reply: "Oops, I had a brain freeze! Try asking me again." }, { status: 500 })
  }
}