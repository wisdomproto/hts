import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/index";
import { userAssets } from "@db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_ASSETS } from "@/lib/constants";

export async function GET() {
  try {
    let assets = await db.select().from(userAssets).orderBy(userAssets.sortOrder);

    if (assets.length === 0) {
      // Seed with DEFAULT_ASSETS
      for (const a of DEFAULT_ASSETS) {
        await db.insert(userAssets).values({
          ticker: a.ticker,
          name: a.name,
          assetClass: a.assetClass,
          country: a.country,
          maturity: (a as { maturity?: string }).maturity ?? null,
          isActive: true,
          sortOrder: 0,
        });
      }
      assets = await db.select().from(userAssets).orderBy(userAssets.sortOrder);
    }

    return NextResponse.json({ assets });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch assets", assets: [] }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticker, name, assetClass, country, maturity } = body;

    const result = await db.insert(userAssets).values({
      ticker,
      name,
      assetClass,
      country,
      maturity: maturity ?? null,
      isActive: true,
      sortOrder: 0,
    });

    return NextResponse.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add asset" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await db
      .update(userAssets)
      .set({ isActive })
      .where(eq(userAssets.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = Number(searchParams.get("id"));

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await db.delete(userAssets).where(eq(userAssets.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
  }
}
