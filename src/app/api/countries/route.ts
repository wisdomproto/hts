import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/index";
import { userCountries } from "@db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const countries = await db.select().from(userCountries);
    return NextResponse.json({ countries });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch countries", countries: [] }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, nameKo, flag } = body;

    const result = await db.insert(userCountries).values({
      code,
      name,
      nameKo,
      flag,
      isActive: true,
    });

    return NextResponse.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add country" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isActive, weightOverride } = body;

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (typeof isActive === "boolean") updates.isActive = isActive;
    if (weightOverride !== undefined) updates.weightOverride = weightOverride;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    await db.update(userCountries).set(updates).where(eq(userCountries.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update country" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = Number(searchParams.get("id"));

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await db.delete(userCountries).where(eq(userCountries.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete country" }, { status: 500 });
  }
}
