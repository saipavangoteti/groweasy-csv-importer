import axios from "axios";
import type { UploadResponse, ProcessResponse } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
});

export async function uploadCSV(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<UploadResponse>("/api/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function processJob(jobId: string): Promise<ProcessResponse> {
  const { data } = await api.post<ProcessResponse>(`/api/process/${jobId}`);
  return data;
}

export async function checkHealth(): Promise<{
  status: string;
  aiProvider: string;
}> {
  const { data } = await api.get("/api/health");
  return data;
}
