"use client";

import React from "react";

const REQUIRED_HEADERS = [
  "Player Id",
  "Player Display Name",
  "Time",
  "Elapsed Time (s)",
  "Lat",
  "Lon",
  "Speed (m/s)",
  "Instantaneous Acceleration Impulse",
  "Heart Rate Interval",
];

export default function UploadPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const [pdfFile, setPdfFile] = React.useState<File | null>(null);
  const [csvFile, setCsvFile] = React.useState<File | null>(null);
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [result, setResult] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  const validateCsvHeaders = async (file: File): Promise<string | null> => {
    try {
      const text = await file.text();
      const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) || "";
      // naive CSV split that handles quoted commas minimally
      const headers = firstLine
        .split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/)
        .map((h) => h.replace(/^\"|\"$/g, "").trim());
      const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
      if (missing.length) {
        return `Missing CSV columns: ${missing.join(", ")}`;
      }
      return null;
    } catch (e: any) {
      return e?.message || "Failed to read CSV";
    }
  };

  const onCsvChange = async (f: File | null) => {
    setCsvFile(f);
    setResult(null);
    setError(null);
    if (!f) {
      setCsvError(null);
      return;
    }
    const err = await validateCsvHeaders(f);
    setCsvError(err);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!pdfFile || !csvFile) {
      setError("Please select both PDF and CSV files.");
      return;
    }
    if (csvError) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("pdf", pdfFile);
      form.append("csv", csvFile);
      const res = await fetch(`${API_BASE}/api/upload_pdf_csv`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-6">
      <h1 className="text-xl font-semibold mb-4">Upload PDF + CSV</h1>
      <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
        <div className="space-y-1">
          <label className="text-sm text-zinc-300">PDF file</label>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-zinc-200 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700"
          />
          {pdfFile && <div className="text-xs text-zinc-400">Selected: {pdfFile.name}</div>}
        </div>

        <div className="space-y-1">
          <label className="text-sm text-zinc-300">CSV file</label>
          <input
            type="file"
            accept="text/csv,.csv"
            onChange={(e) => onCsvChange(e.target.files?.[0] || null)}
            className="block w-full text-sm text-zinc-200 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700"
          />
          {csvFile && <div className="text-xs text-zinc-400">Selected: {csvFile.name}</div>}
          {csvError && <div className="text-xs text-red-400">{csvError}</div>}
          {!csvError && csvFile && (
            <div className="text-xs text-emerald-400">CSV headers look good.</div>
          )}
          <div className="text-xs text-zinc-500 mt-1">
            Required columns: {REQUIRED_HEADERS.join(", ")}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting || !pdfFile || !csvFile || !!csvError}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md border ${submitting ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-zinc-900/50 border-zinc-800 text-zinc-200 hover:bg-zinc-900 hover:border-zinc-700'}`}
          >
            {submitting && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            )}
            <span>{submitting ? 'Uploading…' : 'Upload'}</span>
          </button>
          {error && <span className="text-sm text-red-400">{error}</span>}
          {result && <span className="text-sm text-emerald-400">Upload confirmed</span>}
        </div>
      </form>

      {result && (
        <div className="mt-6 text-sm text-zinc-300 bg-zinc-900/50 border border-zinc-800 rounded-md p-4">
          <div className="font-mono whitespace-pre-wrap break-all">{JSON.stringify(result, null, 2)}</div>
        </div>
      )}
    </div>
  );
}


