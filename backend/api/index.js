const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { parse } = require("csv-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Readable = require("stream").Readable;

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (
      file.mimetype === "text/csv" ||
      file.originalname.endsWith(".csv") ||
      file.originalname.endsWith(".txt")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

const CRM_STATUSES = ["GOOD_LEAD_FOLLOW_UP", "DID_NOT_CONNECT", "BAD_LEAD", "SALE_DONE"];
const DATA_SOURCES = ["leads_on_demand", "meridian_tower", "eden_park", "varah_swamy", "sarjapur_plots"];

function buildSystemPrompt() {
  return `You are an expert CRM data extraction assistant. Map raw CSV records into GrowEasy CRM format.

OUTPUT: Return a JSON array. Each object must have:
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
3. created_at must be "YYYY-MM-DD HH:MM:SS" format.
4. crm_note: include remarks, follow-up notes, extra emails, extra phones, any useful info.
5. Multiple emails: first goes to email field, rest to crm_note.
6. Multiple phones: first goes to mobile_without_country_code, rest to crm_note.
7. If neither email NOR mobile exists, set "_skip": true.
8. Map columns intelligently even if names differ (e.g. "Phone" = mobile, "Company Name" = company, "Status" = crm_status, "Source" = data_source).
9. Default country_code to +91 for Indian numbers.
10. Return ONLY valid JSON array, no markdown.
11. Preserve "_rowIndex" (0-based) from input.`;
}

function buildUserPrompt(records, columnNames) {
  return `CSV columns: ${JSON.stringify(columnNames)}
Records: ${JSON.stringify(records, null, 2)}
Map to GrowEasy CRM format. Return ONLY a JSON array.`;
}

function parseCSVFromBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const records = [];
    const stream = Readable.from(buffer.toString());
    stream
      .pipe(parse({ columns: true, skip_empty_lines: true, trim: true, relax_column_count: true, bom: true }))
      .on("data", (record) => records.push(record))
      .on("error", reject)
      .on("end", () => resolve(records));
  });
}

async function extractWithGemini(records) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not configured");

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", systemInstruction: buildSystemPrompt() });

  const batchSize = 20;
  const allResults = [];
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
    } catch (err) {
      console.error(`Batch ${batchNum}/${totalBatches} failed:`, err.message);
      for (const rec of batch) {
        allResults.push({
          ...rec,
          crm_status: rec.crm_status || "GOOD_LEAD_FOLLOW_UP",
          _skip: !rec.email && !rec.mobile_without_country_code,
          _error: err.message,
        });
      }
    }
  }
  return allResults;
}

function normalizeResults(results) {
  const crmFields = [
    "created_at", "name", "email", "country_code", "mobile_without_country_code",
    "company", "city", "state", "country", "lead_owner", "crm_status",
    "crm_note", "data_source", "possession_time", "description",
  ];

  return results.map((r) => {
    const clean = {};
    const rowIndex = r._rowIndex;
    const skip = r._skip ?? false;
    const error = r._error ?? null;

    for (const field of crmFields) {
      let val = r[field] ?? "";
      if (typeof val !== "string") val = String(val);
      clean[field] = val;
    }

    if (!CRM_STATUSES.includes(clean.crm_status)) clean.crm_status = "GOOD_LEAD_FOLLOW_UP";
    if (!DATA_SOURCES.includes(clean.data_source)) clean.data_source = "";
    if (!clean.email && !clean.mobile_without_country_code) {
      return { ...clean, _skip: true, _rowIndex: rowIndex, _error: error };
    }

    return { ...clean, _skip: skip, _rowIndex: rowIndex, _error: error };
  });
}

// In-memory job store (works for Vercel with short-lived functions)
const jobs = new Map();

// Routes
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const records = await parseCSVFromBuffer(req.file.buffer);
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    jobs.set(jobId, { originalRecords: records, fileName: req.file.originalname, status: "uploaded" });

    // Cleanup old jobs after 30 min
    setTimeout(() => jobs.delete(jobId), 30 * 60 * 1000);

    res.json({
      jobId,
      fileName: req.file.originalname,
      totalRows: records.length,
      columns: records.length > 0 ? Object.keys(records[0]) : [],
      preview: records.slice(0, 10),
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to parse CSV: " + err.message });
  }
});

app.post("/api/process/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = jobs.get(jobId);
    if (!job) return res.status(404).json({ error: "Job not found. Upload the file again." });
    if (job.status === "processing") return res.status(409).json({ error: "Job already processing" });

    job.status = "processing";
    const results = await extractWithGemini(job.originalRecords);
    const normalized = normalizeResults(results);
    const successful = normalized.filter((r) => !r._skip);
    const skipped = normalized.filter((r) => r._skip);

    job.status = "completed";

    res.json({
      jobId,
      status: "completed",
      summary: { total: normalized.length, successful: successful.length, skipped: skipped.length },
      results: normalized,
      successful: successful.map((r) => { const { _skip, _rowIndex, _error, ...rest } = r; return rest; }),
      skipped: skipped.map((r) => ({ rowIndex: r._rowIndex, reason: r._error || "No email or mobile number found" })),
    });
  } catch (err) {
    console.error("Process error:", err);
    const job = jobs.get(req.params.jobId);
    if (job) job.status = "error";
    res.status(500).json({ error: "Processing failed: " + err.message });
  }
});

app.get("/api/health", (_, res) => {
  res.json({ status: "ok", aiProvider: process.env.GEMINI_API_KEY ? "gemini" : "none" });
});

module.exports = app;
