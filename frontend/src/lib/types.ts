export interface UploadResponse {
  jobId: string;
  fileName: string;
  totalRows: number;
  columns: string[];
  preview: Record<string, string>[];
}

export interface CRMRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: string;
  crm_note: string;
  data_source: string;
  possession_time: string;
  description: string;
}

export interface SkippedRecord {
  rowIndex: number;
  reason: string;
}

export interface ProcessResponse {
  jobId: string;
  status: string;
  summary: {
    total: number;
    successful: number;
    skipped: number;
  };
  results: CRMRecord[];
  successful: CRMRecord[];
  skipped: SkippedRecord[];
}

export type AppStep = "upload" | "preview" | "processing" | "result";
