import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req) {
  try {
    const { messages, userContext } = await req.json();

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "GROQ_API_KEY not configured in .env.local" },
        { status: 500 }
      );
    }

    const systemPrompt = `You are Splitr AI, a friendly and knowledgeable financial assistant built into the Splitr expense-splitting app.

Your role is to:
- Help users understand their spending habits and balances
- Give personalized budgeting advice and savings tips
- Answer questions about how to split expenses fairly
- Suggest ways to reduce shared costs
- Help them settle debts efficiently

${
  userContext
    ? `User's current financial context:
- Total Balance: $${userContext.totalBalance?.toFixed(2) ?? "N/A"}
- Amount others owe them: $${userContext.youAreOwed?.toFixed(2) ?? "N/A"}
- Amount they owe others: $${userContext.youOwe?.toFixed(2) ?? "N/A"}
- Total spent all time: $${userContext.totalSpentAllTime?.toFixed(2) ?? "N/A"}`
    : "No financial data provided yet."
}

Be concise, friendly, and practical. Use emojis occasionally to be engaging. If they share financial numbers, do calculations and give specific advice.`;

    // Build message history in Groq/OpenAI format
    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: chatMessages,
      max_tokens: 1024,
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ success: true, message: responseText });
  } catch (error) {
    console.error("Groq Chat error:", error);
    return NextResponse.json(
      { error: error.message || "AI request failed" },
      { status: 500 }
    );
  }
}
