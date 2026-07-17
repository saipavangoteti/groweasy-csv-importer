require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { parse } = require("csv-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");
const Readable = require("stream").Readable;

const app = express();
const PORT = process.env.PORT || 4000;

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

// --- AI Providers ---
function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

function getOpenAIClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

// --- CRM Status & Data Source constants ---
const CRM_STATUSES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
];

const DATA_SOURCES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
];

function buildSystemPrompt() {
  return `You are an expert CRM data extraction assistant. Your job is to map raw CSV records into GrowEasy CRM format.

OUTPUT FORMAT: Return a JSON array of objects. Each object must have these fields:
{
  "created_at": "string (ISO-like format, e.g. 2026-05-13 14:20:48)",
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
2. data_source MUST be exactly one of: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots. If no confident match, leave it blank "".
3. created_at must be in format "YYYY-MM-DD HH:MM:SS" (convert any date format).
4. For crm_note, include: remarks, follow-up notes, comments, extra phone numbers, extra emails, any useful info that doesn't fit other fields.
5. If multiple emails exist: use the first as email, append rest to crm_note.
6. If multiple mobile numbers exist: use the first as mobile_without_country_code, append rest to crm_note.
7. If record has NEITHER email NOR mobile number, set a flag "_skip": true.
8. Try to intelligently map columns even if names are different. For example "Phone" = mobile, "Company Name" = company, "Status" = crm_status, "Source" = data_source, etc.
9. Country code: if phone starts with +91 or similar, extract it. Default to +91 for Indian numbers.
10. Return ONLY valid JSON array, no markdown, no explanation.
11. For each record, preserve the original row index as "_rowIndex" (0-based from data rows).`;
}

function buildUserPrompt(records, columnNames) {
  return `Here are the CSV column names: ${JSON.stringify(columnNames)}

Here are the CSV records (each object has the column names as keys):
${JSON.stringify(records, null, 2)}

Map these records into GrowEasy CRM format following the system instructions. Return ONLY a JSON array.`;
}

// --- AI Extraction with Gemini ---
async function extractWithGemini(records, batchSize, onProgress) {
  const genAI = getGeminiClient();
  if (!genAI) throw new Error("Gemini API key not configured");

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: buildSystemPrompt(),
  });

  const allResults = [];
  const totalBatches = Math.ceil(records.length / batchSize);

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const columnNames =
      batch.length > 0 ? Object.keys(batch[0]).filter((k) => !k.startsWith("_")) : [];

    try {
      const result = await model.generateContent(
        buildUserPrompt(batch, columnNames)
      );
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

    if (onProgress) onProgress(batchNum, totalBatches);
  }

  return allResults;
}

// --- AI Extraction with OpenAI ---
async function extractWithOpenAI(records, batchSize, onProgress) {
  const openai = getOpenAIClient();
  if (!openai) throw new Error("OpenAI API key not configured");

  const allResults = [];
  const totalBatches = Math.ceil(records.length / batchSize);

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const columnNames =
      batch.length > 0 ? Object.keys(batch[0]).filter((k) => !k.startsWith("_")) : [];

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: buildSystemPrompt() },
          {
            role: "user",
            content: buildUserPrompt(batch, columnNames),
          },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      const parsed = JSON.parse(content);
      const arr = Array.isArray(parsed) ? parsed : parsed.records || Object.values(parsed).find(Array.isArray) || [parsed];
      allResults.push(...arr);
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

    if (onProgress) onProgress(batchNum, totalBatches);
  }

  return allResults;
}

// --- Parse CSV from buffer ---
function parseCSVFromBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const records = [];
    const stream = Readable.from(buffer.toString());
    stream
      .pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
          bom: true,
        })
      )
      .on("data", (record) => records.push(record))
      .on("error", reject)
      .on("end", () => resolve(records));
  });
}

// --- Normalize AI results ---
function normalizeResults(results) {
  const crmFields = [
    "created_at",
    "name",
    "email",
    "country_code",
    "mobile_without_country_code",
    "company",
    "city",
    "state",
    "country",
    "lead_owner",
    "crm_status",
    "crm_note",
    "data_source",
    "possession_time",
    "description",
  ];

  return results.map((r) => {
    const clean = {};
    const rowIndex = r._rowIndex ?? r["_rowIndex"];
    const skip = r._skip ?? false;
    const error = r._error ?? null;

    for (const field of crmFields) {
      let val = r[field] ?? "";
      if (typeof val !== "string") val = String(val);
      clean[field] = val;
    }

    if (!CRM_STATUSES.includes(clean.crm_status)) {
      clean.crm_status = "GOOD_LEAD_FOLLOW_UP";
    }
    if (!DATA_SOURCES.includes(clean.data_source)) {
      clean.data_source = "";
    }

    if (!clean.email && !clean.mobile_without_country_code) {
      return { ...clean, _skip: true, _rowIndex: rowIndex, _error: error };
    }

    return { ...clean, _skip: skip, _rowIndex: rowIndex, _error: error };
  });
}

// --- In-memory job store ---
const jobs = new Map();

// --- API Routes ---

// Upload CSV
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const records = await parseCSVFromBuffer(req.file.buffer);
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    jobs.set(jobId, {
      originalRecords: records,
      fileName: req.file.originalname,
      status: "uploaded",
      createdAt: new Date().toISOString(),
    });

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

// Process / Confirm Import
app.post("/api/process/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = jobs.get(jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.status === "processing")
      return res.status(409).json({ error: "Job already processing" });

    job.status = "processing";
    const batchSize = 20;
    let results;

    const gemini = getGeminiClient();
    const openai = getOpenAIClient();

    if (gemini) {
      results = await extractWithGemini(job.originalRecords, batchSize);
    } else if (openai) {
      results = await extractWithOpenAI(job.originalRecords, batchSize);
    } else {
      return res
        .status(500)
        .json({ error: "No AI API key configured. Set GEMINI_API_KEY or OPENAI_API_KEY in .env" });
    }

    const normalized = normalizeResults(results);
    const successful = normalized.filter((r) => !r._skip);
    const skipped = normalized.filter((r) => r._skip);

    job.status = "completed";
    job.results = normalized;
    job.summary = {
      total: normalized.length,
      successful: successful.length,
      skipped: skipped.length,
    };

    res.json({
      jobId,
      status: "completed",
      summary: job.summary,
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
  } catch (err) {
    console.error("Process error:", err);
    const job = jobs.get(req.params.jobId);
    if (job) job.status = "error";
    res.status(500).json({ error: "Processing failed: " + err.message });
  }
});

// Health check
app.get("/api/health", (_, res) => {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  res.json({
    status: "ok",
    aiProvider: hasGemini ? "gemini" : hasOpenAI ? "openai" : "none",
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(
    `AI Provider: ${process.env.GEMINI_API_KEY ? "Gemini" : process.env.OPENAI_API_KEY ? "OpenAI" : "NOT CONFIGURED"}`
  );
});
