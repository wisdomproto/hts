import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/index";
import { historicalPrices } from "@db/schema";
import { eq, gte, lte, and, asc } from "drizzle-orm";

const PERIOD_DAYS: Record<string, number> = {
  "1Y": 365,
  "3Y": 365 * 3,
  "5Y": 365 * 5,
  "10Y": 365 * 10,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get("ticker");
    const period = searchParams.get("period") || "1Y";

    if (!ticker || typeof ticker !== "string") {
      return NextResponse.json(
        { error: "Ticker parameter is required" },
        { status: 400 }
      );
    }

    const days = PERIOD_DAYS[period] ?? 365;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const rows = await db
      .select({
        date: historicalPrices.date,
        close: historicalPrices.adjClose,
      })
      .from(historicalPrices)
      .where(
        and(
          eq(historicalPrices.ticker, ticker.toUpperCase()),
          gte(historicalPrices.date, startDate)
        )
      )
      .orderBy(asc(historicalPrices.date));

    // Downsample for performance: max ~300 points for chart
    const maxPoints = 300;
    let prices = rows;
    if (rows.length > maxPoints) {
      const step = rows.length / maxPoints;
      prices = [];
      for (let i = 0; i < maxPoints; i++) {
        prices.push(rows[Math.floor(i * step)]);
      }
      // Always include the last point
      if (prices[prices.length - 1] !== rows[rows.length - 1]) {
        prices.push(rows[rows.length - 1]);
      }
    }

    return NextResponse.json({ prices });
  } catch (error) {
    console.error("Chart API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch chart data" },
      { status: 500 }
    );
  }
}
