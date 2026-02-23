import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function resolveDbPath(): string {
  const dbDir = process.env.DB_DIR || (fs.existsSync("/app/db") ? "/app/db" : path.join(process.cwd(), "db"));
  return path.join(dbDir, "hts.db");
}

// POST: Upload DB file (base64 encoded body)
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.arrayBuffer();
    const dbPath = resolveDbPath();
    const dbDir = path.dirname(dbPath);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Remove WAL/SHM files to avoid corruption
    for (const ext of ["-wal", "-shm"]) {
      const f = dbPath + ext;
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }

    fs.writeFileSync(dbPath, Buffer.from(body));

    const stats = fs.statSync(dbPath);
    return NextResponse.json({
      success: true,
      size: stats.size,
      path: dbPath,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET: Health check - show DB status
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbPath = resolveDbPath();
  const exists = fs.existsSync(dbPath);
  const size = exists ? fs.statSync(dbPath).size : 0;

  return NextResponse.json({ dbPath, exists, size });
}
