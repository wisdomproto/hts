import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/index";
import { economicData, computedIndicators } from "@db/schema";
import { desc, eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const country = searchParams.get("country");
    const category = searchParams.get("category");

    // Build query
    let query = db.select().from(economicData).orderBy(desc(economicData.date)).limit(500);

    // Get computed indicators
    const indicators = await db
      .select()
      .from(computedIndicators)
      .orderBy(desc(computedIndicators.date))
      .limit(50);

    // Get raw data with optional filters
    const conditions = [];
    if (country) conditions.push(eq(economicData.country, country));
    if (category) conditions.push(eq(economicData.category, category));

    let rawData;
    if (conditions.length > 0) {
      rawData = await db
        .select()
        .from(economicData)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(economicData.date))
        .limit(500);
    } else {
      rawData = await db
        .select()
        .from(economicData)
        .orderBy(desc(economicData.date))
        .limit(500);
    }

    return NextResponse.json({
      data: rawData,
      indicators,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch economic data", data: [], indicators: [] },
      { status: 200 }
    );
  }
}
