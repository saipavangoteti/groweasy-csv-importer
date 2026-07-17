"use client";

import { useState, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Loader2,
  RotateCcw,
  Zap,
  Download,
} from "lucide-react";
import FileUpload from "@/components/FileUpload";
import DataTable from "@/components/DataTable";
import StepIndicator from "@/components/StepIndicator";
import ThemeToggle from "@/components/ThemeToggle";
import { uploadCSV, processJob } from "@/lib/api";
import type {
  UploadResponse,
  ProcessResponse,
  AppStep,
} from "@/lib/types";

export default function Home() {
  const [step, setStep] = useState<AppStep>("upload");
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
  const [processData, setProcessData] = useState<ProcessResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const data = await uploadCSV(file);
      setUploadData(data);
      setStep("preview");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleProcess = useCallback(async () => {
    if (!uploadData) return;
    setError(null);
    setStep("processing");
    setLoading(true);
    try {
      const data = await processJob(uploadData.jobId);
      setProcessData(data);
      setStep("result");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Processing failed";
      setError(msg);
      setStep("preview");
    } finally {
      setLoading(false);
    }
  }, [uploadData]);

  const handleReset = useCallback(() => {
    setStep("upload");
    setUploadData(null);
    setProcessData(null);
    setError(null);
    setLoading(false);
  }, []);

  const downloadCSV = useCallback(() => {
    if (!processData?.successful) return;
    const headers = [
      "created_at","name","email","country_code","mobile_without_country_code",
      "company","city","state","country","lead_owner","crm_status","crm_note",
      "data_source","possession_time","description",
    ];
    const escapeCSV = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };
    const rows = processData.successful.map((r) =>
      headers.map((h) => escapeCSV(r[h as keyof typeof r] || "")).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `groweasy_crm_import_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [processData]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-card-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                GrowEasy CSV Importer
              </h1>
              <p className="text-xs text-muted">
                AI-powered CRM data extraction
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Steps */}
        <div className="mb-10">
          <StepIndicator currentStep={step} />
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 flex items-center gap-3 animate-fadeIn">
            <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
            <p className="text-sm text-danger">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-danger/60 hover:text-danger"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="max-w-2xl mx-auto animate-fadeIn">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Upload your CSV
              </h2>
              <p className="text-muted">
                Upload any CSV file — our AI will intelligently map the columns
                to GrowEasy CRM fields.
              </p>
            </div>
            <FileUpload onFileSelect={handleFileSelect} disabled={loading} />
            {loading && (
              <div className="mt-6 flex items-center justify-center gap-3 text-muted">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Uploading and parsing...</span>
              </div>
            )}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {["Facebook Leads", "Google Ads", "Excel Export", "Any CSV"].map(
                (label) => (
                  <div
                    key={label}
                    className="text-center p-3 rounded-xl bg-card border border-card-border"
                  >
                    <p className="text-xs text-muted">{label}</p>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && uploadData && (
          <div className="animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">
                  Preview Data
                </h2>
                <p className="text-muted text-sm">
                  <span className="font-medium text-foreground/80">
                    {uploadData.fileName}
                  </span>{" "}
                  — {uploadData.totalRows} rows, {uploadData.columns.length}{" "}
                  columns
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl border border-card-border text-sm font-medium
                    hover:bg-accent transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  New File
                </button>
                <button
                  onClick={handleProcess}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold
                    hover:bg-primary-hover transition-all duration-200 flex items-center gap-2
                    shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30
                    disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Confirm Import
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            <DataTable data={uploadData.preview} maxHeight="450px" />

            <p className="mt-4 text-xs text-muted-light text-center">
              Showing first {uploadData.preview.length} rows. Click &quot;Confirm Import&quot; to
              process all {uploadData.totalRows} rows with AI.
            </p>
          </div>
        )}

        {/* Step: Processing */}
        {step === "processing" && (
          <div className="max-w-lg mx-auto text-center py-20 animate-fadeIn">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">
              AI Processing...
            </h2>
            <p className="text-muted mb-6">
              Our AI is analyzing your CSV and mapping fields to GrowEasy CRM
              format.
            </p>
            <div className="max-w-xs mx-auto">
              <div className="h-2 rounded-full bg-table-header overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-shimmer" />
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-light">
              This may take a moment for large files...
            </p>
          </div>
        )}

        {/* Step: Result */}
        {step === "result" && processData && (
          <div className="animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">
                  Import Complete
                </h2>
                <p className="text-muted text-sm">
                  AI extraction finished — review results below
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl border border-card-border text-sm font-medium
                    hover:bg-accent transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Import Another
                </button>
                <button
                  onClick={downloadCSV}
                  className="px-6 py-2.5 rounded-xl bg-success text-white text-sm font-semibold
                    hover:opacity-90 transition-all duration-200 flex items-center gap-2
                    shadow-lg shadow-success/25"
                >
                  <Download className="w-4 h-4" />
                  Download CRM CSV
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-5 rounded-xl bg-card border border-card-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {processData.summary.total}
                    </p>
                    <p className="text-xs text-muted">Total Records</p>
                  </div>
                </div>
              </div>
              <div className="p-5 rounded-xl bg-card border border-card-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {processData.summary.successful}
                    </p>
                    <p className="text-xs text-muted">Imported</p>
                  </div>
                </div>
              </div>
              <div className="p-5 rounded-xl bg-card border border-card-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {processData.summary.skipped}
                    </p>
                    <p className="text-xs text-muted">Skipped</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Successful Records */}
            {processData.successful.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  Successfully Parsed ({processData.successful.length})
                </h3>
                <DataTable
                  data={processData.successful.map((r) => ({
                    created_at: r.created_at,
                    name: r.name,
                    email: r.email,
                    country_code: r.country_code,
                    mobile: r.mobile_without_country_code,
                    company: r.company,
                    city: r.city,
                    state: r.state,
                    country: r.country,
                    crm_status: r.crm_status,
                    data_source: r.data_source,
                    crm_note: r.crm_note,
                  }))}
                  maxHeight="400px"
                />
              </div>
            )}

            {/* Skipped Records */}
            {processData.skipped.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-warning" />
                  Skipped Records ({processData.skipped.length})
                </h3>
                <div className="rounded-xl border border-card-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-table-header">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-foreground/80 border-b border-table-border">
                          Row #
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground/80 border-b border-table-border">
                          Reason
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {processData.skipped.map((s, i) => (
                        <tr
                          key={i}
                          className="border-b border-table-border last:border-0"
                        >
                          <td className="px-4 py-3 text-foreground/70">
                            {s.rowIndex + 1}
                          </td>
                          <td className="px-4 py-3 text-foreground/70">
                            {s.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-card-border py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-muted-light">
            GrowEasy AI CSV Importer — Built for GrowEasy Assignment
          </p>
        </div>
      </footer>
    </div>
  );
}
