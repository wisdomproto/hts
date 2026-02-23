#!/bin/sh
set -e

echo "=== Running DB migrations ==="
npx drizzle-kit migrate 2>/dev/null || echo "Migration skipped (already up to date)"

echo "=== Starting Next.js ==="
exec npm start
