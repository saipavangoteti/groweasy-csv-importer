import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import { jobs } from "@/lib/jobs-store";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const text = await file.text();
    const records: Record<string, string>[] = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      bom: true,
    });

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    jobs.set(jobId, { originalRecords: records, fileName: file.name, status: "uploaded" });

    setTimeout(() => jobs.delete(jobId), 30 * 60 * 1000);

    return NextResponse.json({
      jobId,
      fileName: file.name,
      totalRows: records.length,
      columns: records.length > 0 ? Object.keys(records[0]) : [],
      preview: records.slice(0, 10),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("Upload error:", message);
    return NextResponse.json({ error: "Failed to parse CSV: " + message }, { status: 500 });
  }
}
