import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/index";
import { userSettings } from "@db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const settings = await db.select().from(userSettings);
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }
    return NextResponse.json({ settings: settingsMap });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings", settings: {} }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;

    // Upsert: delete then insert
    await db.delete(userSettings).where(eq(userSettings.key, key));
    await db.insert(userSettings).values({ key, value: JSON.stringify(value) });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save setting" }, { status: 500 });
  }
}
