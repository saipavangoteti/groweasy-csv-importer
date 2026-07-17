import { GoogleGenerativeAI } from "@google/generative-ai";

export const CRM_STATUSES = ["GOOD_LEAD_FOLLOW_UP", "DID_NOT_CONNECT", "BAD_LEAD", "SALE_DONE"];
export const DATA_SOURCES = ["leads_on_demand", "meridian_tower", "eden_park", "varah_swamy", "sarjapur_plots"];

export function buildSystemPrompt() {
  return `You are an expert CRM data extraction assistant. Map raw CSV records into GrowEasy CRM format.

OUTPUT: Return a JSON array. Each object must have these exact fields:
{
  "created_at": "YYYY-MM-DD HH:MM:SS",
  "name": "string",
  "email": "string",
  "country_code": "string (e.g. +91)",
  "mobile_without_country_code": "string",
  "company": "string",
  "city": "string",
  "state": "string",
  "country": "string",
  "lead_owner": "string",
  "crm_status": "string",
  "crm_note": "string",
  "data_source": "string",
  "possession_time": "string",
  "description": "string"
}

RULES:
1. crm_status MUST be exactly one of: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE. If unclear, use GOOD_LEAD_FOLLOW_UP.
2. data_source MUST be exactly one of: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots. If no confident match, leave blank "".
3. created_at must be "YYYY-MM-DD HH:MM:SS" format. If no date available, use current date/time.
4. crm_note: include remarks, follow-up notes, extra emails, extra phones, any useful info that doesn't fit other fields.
5. Multiple emails: first goes to email field, rest appended to crm_note.
6. Multiple phones: first goes to mobile_without_country_code, rest appended to crm_note.
7. If neither email NOR mobile exists, set "_skip": true.
8. Map columns intelligently even if names differ (e.g. "Phone" = mobile, "Company Name" = company, "Status" = crm_status, "Source" = data_source, "First Name"+"Last Name" = name, "Lead Name" = name, "Email Address" = email, "Contact" = mobile or email).
9. Default country_code to +91 for Indian numbers.
10. Return ONLY valid JSON array, no markdown, no explanation.
11. Preserve "_rowIndex" (0-based) from input.`;
}

export function buildUserPrompt(records: Record<string, string>[], columnNames: string[]) {
  return `CSV columns: ${JSON.stringify(columnNames)}
Records: ${JSON.stringify(records, null, 2)}
Map to GrowEasy CRM format. Return ONLY a JSON array.`;
}

export async function extractWithGemini(records: Record<string, string>[]) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not configured. Add it in Vercel environment variables.");

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash", systemInstruction: buildSystemPrompt() });

  const batchSize = 20;
  const allResults: Record<string, unknown>[] = [];
  const totalBatches = Math.ceil(records.length / batchSize);

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const columnNames = batch.length > 0 ? Object.keys(batch[0]).filter((k) => !k.startsWith("_")) : [];

    try {
      const result = await model.generateContent(buildUserPrompt(batch, columnNames));
      const response = result.response.text();
      const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      allResults.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`Batch ${batchNum}/${totalBatches} failed:`, message);
      for (const rec of batch) {
        allResults.push({
          ...rec,
          crm_status: "GOOD_LEAD_FOLLOW_UP",
          _skip: !rec.email && !rec.mobile_without_country_code,
          _error: message,
        });
      }
    }
  }
  return allResults;
}

export function normalizeResults(results: Record<string, unknown>[]) {
  const crmFields = [
    "created_at", "name", "email", "country_code", "mobile_without_country_code",
    "company", "city", "state", "country", "lead_owner", "crm_status",
    "crm_note", "data_source", "possession_time", "description",
  ];

  return results.map((r) => {
    const clean: Record<string, string> = {};
    const rowIndex = r._rowIndex;
    const skip = r._skip ?? false;
    const error = r._error ?? null;

    for (const field of crmFields) {
      const raw = r[field];
      clean[field] = typeof raw === "string" ? raw : String(raw ?? "");
    }

    if (!CRM_STATUSES.includes(clean.crm_status)) clean.crm_status = "GOOD_LEAD_FOLLOW_UP";
    if (!DATA_SOURCES.includes(clean.data_source)) clean.data_source = "";
    if (!clean.email && !clean.mobile_without_country_code) {
      return { ...clean, _skip: true, _rowIndex: rowIndex, _error: error };
    }

    return { ...clean, _skip: skip, _rowIndex: rowIndex, _error: error };
  });
}
