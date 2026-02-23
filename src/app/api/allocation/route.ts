import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/index";
import { allocations, allocationItems } from "@db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const amount = Number(searchParams.get("amount") ?? 100000000);
    const riskLevel = Number(searchParams.get("risk") ?? 3);

    // Get latest allocation
    const latest = await db
      .select()
      .from(allocations)
      .orderBy(desc(allocations.createdAt))
      .limit(1);

    if (latest.length === 0) {
      return NextResponse.json({
        allocation: null,
        items: [],
        message: "No allocation found. Run the data pipeline first.",
      });
    }

    const items = await db
      .select()
      .from(allocationItems)
      .where(eq(allocationItems.allocationId, latest[0].id));

    // Recalculate amounts based on requested total
    const recalculated = items.map((item) => ({
      ...item,
      amount: Math.round(amount * (item.weightPct / 100)),
    }));

    return NextResponse.json({
      allocation: latest[0],
      items: recalculated,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch allocation", allocation: null, items: [] },
      { status: 200 }
    );
  }
}
