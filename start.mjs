// Railway startup script: ensure DB exists before Next.js starts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = process.env.DB_DIR || path.join(__dirname, "db");
const dbPath = path.join(dbDir, "hts.db");

console.log("[start] cwd:", process.cwd());
console.log("[start] __dirname:", __dirname);
console.log("[start] DB_DIR:", dbDir);
console.log("[start] dbPath:", dbPath);

// Ensure directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log("[start] Created DB directory:", dbDir);
}

// Check if DB file exists, if not create an empty one so better-sqlite3 can open it
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, "");
  console.log("[start] Created empty DB file:", dbPath);
}

// Verify the file is accessible
try {
  fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
  console.log("[start] DB file is readable/writable");
} catch (e) {
  console.error("[start] DB file permission error:", e.message);
}

// List db directory
console.log("[start] DB dir contents:", fs.readdirSync(dbDir));

// Now start Next.js
console.log("[start] Starting Next.js server...");
import("./server.js");
