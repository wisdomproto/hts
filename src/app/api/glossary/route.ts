import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/index";
import { glossaryTerms } from "@db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const terms = await db.select().from(glossaryTerms).orderBy(desc(glossaryTerms.createdAt));
    return NextResponse.json(terms);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch glossary terms" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { term } = body;

    if (!term || typeof term !== "string" || term.trim().length === 0) {
      return NextResponse.json({ error: "Term is required" }, { status: 400 });
    }

    // Call Gemini API to generate definition
    const geminiKey = process.env.GEMINI_API_KEY;
    let definition = "";
    let termEn = "";
    let category = "일반";
    let example = "";

    if (geminiKey) {
      try {
        const prompt = `You are an economics/finance expert. Generate a definition for the term "${term.trim()}" in the context of macroeconomics and investing.

Respond in this exact JSON format only, no other text:
{
  "term_en": "English name of the term (if applicable)",
  "category": "one of: 성장, 물가, 유동성, 레짐, 투자, 일반",
  "definition": "2-3 sentence definition in Korean, explaining what it is and why it matters for investors",
  "example": "A concrete example showing a typical value or usage, in Korean"
}`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          // Extract JSON from response
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            termEn = parsed.term_en || "";
            category = parsed.category || "일반";
            definition = parsed.definition || "";
            example = parsed.example || "";
          }
        }
      } catch (e) {
        console.error("Gemini API error:", e);
      }
    }

    // Fallback if Gemini didn't work
    if (!definition) {
      definition = `${term.trim()}에 대한 설명입니다. Gemini API 키를 설정하면 자동으로 설명이 생성됩니다.`;
    }

    const now = new Date().toISOString();
    const inserted = await db.insert(glossaryTerms).values({
      term: term.trim(),
      termEn,
      category,
      definition,
      example,
      createdAt: now,
    }).returning();

    return NextResponse.json(inserted[0], { status: 201 });
  } catch (error) {
    console.error("Glossary POST error:", error);
    return NextResponse.json({ error: "Failed to create glossary term" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }
    await db.delete(glossaryTerms).where(eq(glossaryTerms.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete term" }, { status: 500 });
  }
}
