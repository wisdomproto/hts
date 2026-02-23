import { NextResponse } from "next/server";
import { getAllRegimes, getRealTimeLiquidityState, getLiquiditySignals } from "@/lib/db";

export async function GET() {
  try {
    // getAllRegimes() already applies real-time liquidity correction
    const correctedRegimes = await getAllRegimes();

    // Get liquidity signals for the response
    const allSignals = await getLiquiditySignals();
    const latestDate = allSignals.length > 0 ? allSignals[0].date : null;
    const latestSignals = latestDate
      ? allSignals.filter((s) => s.date === latestDate)
      : [];

    const easingCount = latestSignals.filter(
      (s) => s.direction === "easing"
    ).length;
    const totalSignals = latestSignals.length;
    const realTimeLiquidity = await getRealTimeLiquidityState();

    return NextResponse.json({
      regimes: correctedRegimes,
      liquiditySignals: latestSignals,
      liquiditySummary: {
        easingCount,
        totalSignals,
        state: realTimeLiquidity,
        signalDate: latestDate,
        overridden:
          correctedRegimes["US"]?.liquidityState !== realTimeLiquidity
            ? false  // Already corrected by getAllRegimes
            : false,
      },
      currentRegime: correctedRegimes["US"] ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch regime data",
        regimes: {},
        liquiditySignals: [],
        currentRegime: null,
      },
      { status: 200 }
    );
  }
}
