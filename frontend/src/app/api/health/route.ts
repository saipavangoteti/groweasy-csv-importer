import { NextResponse } from "next/server";

export async function GET() {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  return NextResponse.json({
    status: "ok",
    aiProvider: hasGemini ? "gemini" : "none",
  });
}
