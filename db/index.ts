import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

// Resolve DB directory: explicit env > /app/db (Docker) > cwd/db (local dev)
function resolveDbDir(): string {
  if (process.env.DB_DIR) return process.env.DB_DIR;
  // In Docker/Railway, /app/db should exist
  if (fs.existsSync("/app/db")) return "/app/db";
  return path.join(process.cwd(), "db");
}

const dbDir = resolveDbDir();
const dbPath = path.join(dbDir, "hts.db");

// Lazy singleton: DB connection is created on first access, not at module load.
// This prevents SQLITE_BUSY during Next.js build (47 workers evaluating this module).
let _sqlite: InstanceType<typeof Database> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getSqlite(): InstanceType<typeof Database> {
  if (_sqlite) return _sqlite;

  // Ensure DB directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log("[DB] Created directory:", dbDir);
  }

  console.log("[DB] Opening database:", dbPath);

  _sqlite = new Database(dbPath);
  _sqlite.pragma("busy_timeout = 5000");
  _sqlite.pragma("journal_mode = WAL");
  _sqlite.pragma("foreign_keys = ON");

  return _sqlite;
}

function getDb(): ReturnType<typeof drizzle> {
  if (_db) return _db;
  _db = drizzle(getSqlite(), { schema });
  return _db;
}

// Proxy that lazily initializes on first property access
export const db: ReturnType<typeof drizzle> = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop, receiver) {
    const realDb = getDb();
    const value = Reflect.get(realDb, prop, receiver);
    if (typeof value === "function") {
      return value.bind(realDb);
    }
    return value;
  },
});

export type DbType = typeof db;
