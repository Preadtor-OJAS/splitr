import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req) {
  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "GROQ_API_KEY not configured in .env.local" },
        { status: 500 }
      );
    }

    const prompt = `You are a receipt scanner AI. Analyze this receipt image and extract the following information in JSON format only (no markdown, no explanation, just raw JSON):
{
  "description": "short name of the expense or restaurant/store name",
  "amount": <total amount as a number, no currency symbol>,
  "category": "<one of: foodDrink, coffee, groceries, shopping, travel, transportation, housing, entertainment, tickets, utilities, water, education, health, personal, gifts, technology, bills, baby, music, books, other>",
  "items": [
    { "name": "item name", "price": <price as number> }
  ],
  "date": "<date in YYYY-MM-DD format if visible, otherwise null>"
}

If you cannot read the receipt clearly, still return your best guess. Always return valid JSON only.`;

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}`,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
      max_tokens: 1024,
      temperature: 0.1,
    });

    const responseText = completion.choices[0]?.message?.content?.trim() ?? "";

    // Strip potential markdown fences
    const cleaned = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Could not parse AI response", raw: responseText },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error("Receipt scan error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to scan receipt" },
      { status: 500 }
    );
  }
}
