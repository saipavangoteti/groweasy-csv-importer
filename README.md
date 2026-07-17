# GrowEasy AI CSV Importer

AI-powered CSV importer that intelligently extracts CRM lead information from any valid CSV format and maps it to GrowEasy CRM fields using Google Gemini.

**Position Applied For:** Software Developer Intern

## Live Demo

- **Application:** [https://groweasy-csv-importer-eosin.vercel.app](https://groweasy-csv-importer-eosin.vercel.app)
- **GitHub:** [https://github.com/saipavangoteti/groweasy-csv-importer](https://github.com/saipavangoteti/groweasy-csv-importer)

## Features

- **AI-Powered Field Mapping** — Intelligently maps any CSV column names to CRM fields using Google Gemini
- **Drag & Drop Upload** — Beautiful drag-and-drop file upload with file picker
- **CSV Preview** — Responsive table preview before AI processing
- **CRM Result Display** — Shows successfully parsed and skipped records with summary stats
- **CSV Export** — Download processed CRM records as a properly formatted CSV
- **Dark Mode** — Toggle between light and dark themes
- **Responsive Design** — Works on desktop, tablet, and mobile
- **Batch Processing** — AI processes records in batches of 20 for efficiency
- **Smart Extraction** — Handles multiple emails/phones, normalizes phone numbers, assigns CRM statuses

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Backend | Next.js API Routes (serverless) |
| AI | Google Gemini 2.5 Flash |
| Deployment | Vercel |

## Project Structure

```
groweasy-assignment/
├── frontend/                     # Next.js full-stack app
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Main CSV importer page (4 steps)
│   │   │   ├── layout.tsx        # Root layout with dark mode
│   │   │   ├── globals.css       # Theme + animations
│   │   │   └── api/
│   │   │       ├── upload/route.ts       # CSV upload endpoint
│   │   │       ├── process/[jobId]/route.ts  # AI processing endpoint
│   │   │       └── health/route.ts       # Health check
│   │   ├── components/
│   │   │   ├── FileUpload.tsx     # Drag & drop upload
│   │   │   ├── DataTable.tsx      # Responsive data table
│   │   │   ├── StepIndicator.tsx  # Step progress UI
│   │   │   └── ThemeToggle.tsx    # Dark mode toggle
│   │   └── lib/
│   │       ├── ai.ts             # AI extraction logic + system prompt
│   │       ├── api.ts            # API client
│   │       ├── jobs-store.ts     # In-memory job store
│   │       └── types.ts          # TypeScript types
│   └── package.json
├── backend/                      # Standalone Express server (local dev)
│   └── server.js
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- A Google Gemini API key (free tier available at [aistudio.google.com](https://aistudio.google.com))

### 1. Clone the repository

```bash
git clone https://github.com/saipavangoteti/groweasy-csv-importer.git
cd groweasy-csv-importer/frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Gemini API key:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run locally

```bash
npm run dev
```

Frontend + API runs on `http://localhost:3000`.

### 5. Open the app

Visit [http://localhost:3000](http://localhost:3000) and upload a CSV file.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload CSV file, returns parsed preview + jobId |
| POST | `/api/process/:jobId` | Run AI extraction on uploaded data |
| GET | `/api/health` | Health check, returns configured AI provider |

## How It Works

1. **Upload** — User uploads any CSV file via drag-and-drop or file picker
2. **Preview** — Frontend parses and displays the CSV data in a responsive table
3. **Confirm** — User clicks "Confirm Import" to trigger AI processing
4. **AI Extraction** — Backend sends CSV records to Gemini in batches of 20. The AI:
   - Maps arbitrary column names to CRM fields
   - Normalizes phone numbers with country codes
   - Extracts multiple emails/phones into `crm_note`
   - Assigns valid CRM status and data source values
   - Skips records with no email or phone
5. **Results** — Frontend displays successful/skipped records with summary
6. **Export** — User can download the processed data as a GrowEasy CRM CSV

## CRM Fields

| Field | Description |
|-------|-------------|
| `created_at` | Lead creation date (YYYY-MM-DD HH:MM:SS) |
| `name` | Lead name |
| `email` | Primary email |
| `country_code` | Country code (e.g., +91) |
| `mobile_without_country_code` | Mobile number |
| `company` | Company name |
| `city` | City |
| `state` | State |
| `country` | Country |
| `lead_owner` | Lead owner |
| `crm_status` | GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE |
| `crm_note` | Notes, extra emails/phones, remarks |
| `data_source` | Source identifier (leads_on_demand, eden_park, sarjapur_plots, etc.) |
| `possession_time` | Property possession time |
| `description` | Additional description |

## Deployment (Vercel)

```bash
cd frontend
vercel --prod
```

Set `GEMINI_API_KEY` in Vercel project settings under Environment Variables.

## License

MIT
