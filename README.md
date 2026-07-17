# GrowEasy AI CSV Importer

AI-powered CSV importer that intelligently extracts CRM lead information from any valid CSV format and maps it to GrowEasy CRM fields.

**Position Applied For:** Software Developer Intern

## Live Demo

- **Frontend:** [https://your-vercel-url.vercel.app](https://your-vercel-url.vercel.app)
- **Backend:** [https://your-railway-url.railway.app](https://your-railway-url.railway.app)
- **GitHub:** [https://github.com/your-username/groweasy-csv-importer](https://github.com/your-username/groweasy-csv-importer)

## Features

- **AI-Powered Field Mapping** — Intelligently maps any CSV column names to CRM fields using Google Gemini / OpenAI
- **Drag & Drop Upload** — Beautiful drag-and-drop file upload with file preview
- **CSV Preview** — Responsive table preview before processing
- **CRM Result Display** — Shows successfully parsed and skipped records with summary stats
- **CSV Export** — Download processed CRM records as a properly formatted CSV
- **Dark Mode** — Toggle between light and dark themes
- **Responsive Design** — Works on desktop, tablet, and mobile
- **Multi-Provider AI** — Supports both Google Gemini and OpenAI

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Backend | Node.js, Express 4, Multer, csv-parse |
| AI | Google Gemini 2.0 Flash (primary) / OpenAI GPT-4o-mini (fallback) |

## Project Structure

```
groweasy-assignment/
├── frontend/                 # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx      # Main CSV importer page
│   │   │   ├── layout.tsx    # Root layout
│   │   │   └── globals.css   # Theme + animations
│   │   ├── components/
│   │   │   ├── FileUpload.tsx     # Drag & drop upload
│   │   │   ├── DataTable.tsx      # Responsive data table
│   │   │   ├── StepIndicator.tsx  # Step progress UI
│   │   │   └── ThemeToggle.tsx    # Dark mode toggle
│   │   └── lib/
│   │       ├── api.ts        # API client
│   │       └── types.ts      # TypeScript types
│   └── next.config.ts
├── backend/                  # Express API server
│   ├── server.js             # Main server (routes, AI extraction, CSV parsing)
│   ├── .env.example          # Environment template
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- A Google Gemini API key (free tier available at [aistudio.google.com](https://aistudio.google.com))
  - OR an OpenAI API key

### 1. Clone the repository

```bash
git clone https://github.com/your-username/groweasy-csv-importer.git
cd groweasy-csv-importer
```

### 2. Set up the Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and add your API key:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

```bash
npm install
npm start
```

Backend runs on `http://localhost:4000`.

### 3. Set up the Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

### 4. Open the app

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
4. **AI Extraction** — Backend sends CSV records to Gemini/OpenAI in batches of 20. The AI:
   - Maps arbitrary column names to CRM fields
   - Normalizes phone numbers with country codes
   - Extracts multiple emails/phones into `crm_note`
   - Assigns CRM status and data source values
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
| `data_source` | Source identifier |
| `possession_time` | Property possession time |
| `description` | Additional description |

## Deployment

### Frontend (Vercel)

```bash
cd frontend
# Push to GitHub, then connect repo on vercel.com
# Set NEXT_PUBLIC_API_URL to your backend URL
```

### Backend (Railway / Render)

```bash
cd backend
# Push to GitHub, then deploy on railway.app or render.com
# Set GEMINI_API_KEY in environment variables
```

## License

MIT
