import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/index";
import {
  userRegimeOverrides,
  algorithmReferences,
  algorithmChangelog,
} from "@db/schema";
import { desc, eq } from "drizzle-orm";
import { REGIMES, REGIME_ALLOCATION_TEMPLATES } from "@/lib/regimes";

export async function GET() {
  try {
    const overrides = await db.select().from(userRegimeOverrides);
    const references = await db
      .select()
      .from(algorithmReferences)
      .orderBy(desc(algorithmReferences.createdAt));
    const changelog = await db
      .select()
      .from(algorithmChangelog)
      .orderBy(desc(algorithmChangelog.createdAt));

    return NextResponse.json({ overrides, references, changelog });
  } catch (error) {
    console.error("Algorithm GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch algorithm data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "analyze") {
      const { input } = body;
      if (!input || typeof input !== "string" || input.trim().length === 0) {
        return NextResponse.json(
          { error: "Input is required" },
          { status: 400 }
        );
      }

      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return NextResponse.json(
          { error: "Gemini API key not configured" },
          { status: 500 }
        );
      }

      const regimeContext = Object.entries(REGIME_ALLOCATION_TEMPLATES)
        .map(([id, alloc]) => {
          const regime = REGIMES[id as keyof typeof REGIMES];
          return `- ${regime.nameKo} (${regime.name}, id="${id}"): 성장=${regime.growth}, 물가=${regime.inflation}, 유동성=${regime.liquidity}
  배분: 주식=${alloc.stocks}%, 채권=${alloc.bonds}%, 부동산=${alloc.realestate}%, 현물=${alloc.commodities}%, 암호화폐=${alloc.crypto}%, 현금=${alloc.cash}%`;
        })
        .join("\n");

      const currentOverrides = await db.select().from(userRegimeOverrides);
      let overrideContext = "";
      if (currentOverrides.length > 0) {
        overrideContext = `\n\n현재 사용자 오버라이드:\n${currentOverrides
          .map((o) => `- ${o.regimeName}: ${o.assetClass} = ${o.weightPct}%`)
          .join("\n")}`;
      }

      const prompt = `You are a quantitative portfolio allocation expert. The user is modifying a regime-based asset allocation system with 8 regimes based on 3 axes: Growth (high/low), Inflation (high/low), Liquidity (expanding/contracting).

Current regime allocation templates:
${regimeContext}
${overrideContext}

User request: "${input.trim()}"

Analyze the request and suggest specific allocation changes. Each change must specify the regime name (use the English ID like "goldilocks", "stagflation", etc.), the asset class ("stocks", "bonds", "realestate", "commodities", "crypto", "cash"), and the new percentage.

IMPORTANT: For each regime you modify, the total allocation across all 6 asset classes MUST sum to 100%. If you change one asset class, adjust others accordingly.

Valid regime IDs: goldilocks, disinflation_tightening, inflation_boom, overheating, stagflation_lite, stagflation, reflation, deflation_crisis
Valid asset classes: stocks, bonds, realestate, commodities, crypto, cash

Respond in this exact JSON format only, no other text:
{
  "analysis": "2-3 sentence analysis in Korean explaining the rationale for the suggested changes",
  "changes": [
    { "regime": "regime_id", "assetClass": "asset_class", "newPct": number }
  ]
}`;

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
            }),
          }
        );

        if (!res.ok) {
          return NextResponse.json(
            { error: "Gemini API call failed" },
            { status: 502 }
          );
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return NextResponse.json({
            analysis: parsed.analysis || "",
            changes: parsed.changes || [],
          });
        }

        return NextResponse.json(
          { error: "Failed to parse Gemini response" },
          { status: 500 }
        );
      } catch (e) {
        console.error("Gemini API error:", e);
        return NextResponse.json(
          { error: "Gemini API request failed" },
          { status: 502 }
        );
      }
    }

    if (action === "apply") {
      const { changes, userInput, aiAnalysis } = body;
      if (!Array.isArray(changes) || changes.length === 0) {
        return NextResponse.json(
          { error: "Changes array is required" },
          { status: 400 }
        );
      }

      for (const change of changes) {
        const { regime, assetClass, newPct } = change;
        const existing = await db
          .select()
          .from(userRegimeOverrides)
          .where(eq(userRegimeOverrides.regimeName, regime))
          .then((rows) => rows.find((r) => r.assetClass === assetClass));

        if (existing) {
          await db
            .update(userRegimeOverrides)
            .set({ weightPct: newPct })
            .where(eq(userRegimeOverrides.id, existing.id));
        } else {
          await db.insert(userRegimeOverrides).values({
            regimeName: regime,
            assetClass: assetClass,
            weightPct: newPct,
          });
        }
      }

      const now = new Date().toISOString();
      await db.insert(algorithmChangelog).values({
        userInput: userInput || "",
        aiAnalysis: aiAnalysis || null,
        appliedChanges: JSON.stringify(changes),
        createdAt: now,
      });

      return NextResponse.json({ success: true });
    }

    if (action === "addRef") {
      const { title, author, year, description, url } = body;
      if (!title || typeof title !== "string") {
        return NextResponse.json(
          { error: "Title is required" },
          { status: 400 }
        );
      }

      const now = new Date().toISOString();
      const inserted = await db
        .insert(algorithmReferences)
        .values({
          title: title.trim(),
          author: author?.trim() || null,
          year: year || null,
          description: description?.trim() || null,
          url: url?.trim() || null,
          createdAt: now,
        })
        .returning();

      return NextResponse.json(inserted[0], { status: 201 });
    }

    if (action === "deleteRef") {
      const { id } = body;
      if (!id) {
        return NextResponse.json(
          { error: "ID is required" },
          { status: 400 }
        );
      }
      await db
        .delete(algorithmReferences)
        .where(eq(algorithmReferences.id, Number(id)));
      return NextResponse.json({ success: true });
    }

    if (action === "saveOverrides") {
      const { overrides } = body;
      if (!Array.isArray(overrides)) {
        return NextResponse.json(
          { error: "Overrides array is required" },
          { status: 400 }
        );
      }

      await db.delete(userRegimeOverrides);

      if (overrides.length > 0) {
        await db.insert(userRegimeOverrides).values(
          overrides.map(
            (o: {
              regimeName: string;
              assetClass: string;
              weightPct: number;
            }) => ({
              regimeName: o.regimeName,
              assetClass: o.assetClass,
              weightPct: o.weightPct,
            })
          )
        );
      }

      return NextResponse.json({ success: true });
    }

    if (action === "resetOverrides") {
      const { regimeName } = body;
      if (!regimeName || typeof regimeName !== "string") {
        return NextResponse.json(
          { error: "Regime name is required" },
          { status: 400 }
        );
      }
      await db
        .delete(userRegimeOverrides)
        .where(eq(userRegimeOverrides.regimeName, regimeName));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Algorithm POST error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }
    await db
      .delete(algorithmChangelog)
      .where(eq(algorithmChangelog.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Algorithm DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete changelog entry" },
      { status: 500 }
    );
  }
}
