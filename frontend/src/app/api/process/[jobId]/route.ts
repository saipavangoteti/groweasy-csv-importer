import { NextRequest, NextResponse } from "next/server";
import { jobs } from "@/lib/jobs-store";
import { extractWithGemini, normalizeResults } from "@/lib/ai";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const job = jobs.get(jobId);

    if (!job) {
      return NextResponse.json(
        { error: "Job not found. Please upload the file again." },
        { status: 404 }
      );
    }

    if (job.status === "processing") {
      return NextResponse.json({ error: "Job already processing" }, { status: 409 });
    }

    job.status = "processing";

    const results = await extractWithGemini(job.originalRecords);
    const normalized = normalizeResults(results);
    const successful = normalized.filter((r) => !r._skip);
    const skipped = normalized.filter((r) => r._skip);

    job.status = "completed";

    return NextResponse.json({
      jobId,
      status: "completed",
      summary: {
        total: normalized.length,
        successful: successful.length,
        skipped: skipped.length,
      },
      results: normalized,
      successful: successful.map((r) => {
        const { _skip, _rowIndex, _error, ...rest } = r;
        return rest;
      }),
      skipped: skipped.map((r) => ({
        rowIndex: r._rowIndex,
        reason: r._error || "No email or mobile number found",
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Processing failed";
    console.error("Process error:", message);
    return NextResponse.json({ error: "Processing failed: " + message }, { status: 500 });
  }
}
