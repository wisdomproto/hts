import { NextResponse } from "next/server";
import { db } from "@db/index";
import { pipelineRuns } from "@db/schema";
import { desc } from "drizzle-orm";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export async function GET() {
  try {
    const runs = await db
      .select()
      .from(pipelineRuns)
      .orderBy(desc(pipelineRuns.startedAt))
      .limit(10);

    return NextResponse.json({ runs });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch pipeline runs", runs: [] }, { status: 200 });
  }
}

export async function POST() {
  try {
    const pythonScript = path.join(process.cwd(), "data", "run_pipeline.py");

    // Run pipeline asynchronously
    const { stdout, stderr } = await execAsync(`python3 "${pythonScript}"`, {
      cwd: path.join(process.cwd(), "data"),
      timeout: 300000, // 5 min timeout
    });

    return NextResponse.json({
      success: true,
      output: stdout,
      errors: stderr || null,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
