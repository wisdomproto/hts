import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

// Railway: DB_DIR env → persistent volume mount point
const dbDir = process.env.DB_DIR || path.join(process.cwd(), "db");
const dbPath = path.join(dbDir, "hts.db");

// Ensure DB directory exists (for Railway volume mounts)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export type DbType = typeof db;
