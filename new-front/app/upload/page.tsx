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
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const [result, setResult] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [jobStatus, setJobStatus] = React.useState<any>(null);
  const [polling, setPolling] = React.useState<boolean>(false);
  const [sentPdf, setSentPdf] = React.useState<boolean>(false);
  const [sentCsv, setSentCsv] = React.useState<boolean>(false);
  const [pdfState, setPdfState] = React.useState<'idle' | 'uploading' | 'confirmed' | 'analyzing' | 'completed' | 'error'>("idle");
  const [csvState, setCsvState] = React.useState<'idle' | 'uploading' | 'uploaded'>("idle");

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
    if (!pdfFile && !csvFile) {
      setError("Please select at least a PDF or a CSV file.");
      return;
    }
    if (csvFile && csvError) return;
    setSubmitting(true);
    setUploadProgress(0);
    setSentPdf(!!pdfFile);
    setSentCsv(!!csvFile);
    setPdfState(pdfFile ? 'uploading' : 'idle');
    setCsvState(csvFile ? 'uploading' : 'idle');
    try {
      const form = new FormData();
      if (pdfFile) form.append("pdf", pdfFile);
      if (csvFile) form.append("csv", csvFile);

      // Use XMLHttpRequest to track upload progress
      const data = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE}/api/upload_pdf_csv`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(pct);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText || "{}");
              resolve(json);
            } catch (err: any) {
              resolve({ status: "ok" });
            }
          } else {
            reject(new Error(`Upload failed (${xhr.status})`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(form);
      });

      setResult(data);
      if (pdfFile) setPdfState('confirmed');
      if (csvFile) setCsvState('uploaded');
      // If backend started an OpenAI PDF job, poll status
      if (data && data.upload_id && data.pdf) {
        setPolling(true);
        setPdfState('analyzing');
        const id = data.upload_id as string;
        let tries = 0;
        const timer = setInterval(async () => {
          tries += 1;
          try {
            const res = await fetch(`${API_BASE}/api/uploads/${id}/status`);
            if (!res.ok) throw new Error("status fetch failed");
            const js = await res.json();
            setJobStatus(js);
            if (js && (js.status === 'completed' || js.status === 'error' || js.status === 'not_found')) {
              clearInterval(timer);
              setPolling(false);
              if (js.status === 'completed') setPdfState('completed');
              else setPdfState('error');
            }
          } catch {}
          if (tries > 120) { // ~10 minutes at 5s interval
            clearInterval(timer);
            setPolling(false);
            setPdfState('error');
          }
        }, 5000);
      }
    } catch (e: any) {
      setError(e?.message || "Upload failed");
      if (pdfFile) setPdfState('error');
    } finally {
      setSubmitting(false);
      setTimeout(() => setUploadProgress(null), 500);
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
          <div className="text-xs text-zinc-500 mt-1">You can upload just one file or both.</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting || (!pdfFile && !csvFile) || (!!csvFile && !!csvError)}
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

        {(sentPdf || sentCsv) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {sentPdf && (
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${pdfState === 'error' ? 'border-red-500/40 bg-red-900/20 text-red-300' : pdfState === 'completed' ? 'border-emerald-500/40 bg-emerald-900/20 text-emerald-300' : 'border-zinc-700 bg-zinc-900/40 text-zinc-300'}`}>
                {(pdfState === 'uploading' || pdfState === 'analyzing') && (
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                )}
                <span className="font-medium">PDF:</span>
                <span>
                  {pdfState === 'uploading' && 'Uploading…'}
                  {pdfState === 'confirmed' && 'Uploaded'}
                  {pdfState === 'analyzing' && 'Analyzing with OpenAI…'}
                  {pdfState === 'completed' && 'Analysis complete'}
                  {pdfState === 'error' && 'Error'}
                </span>
              </div>
            )}
            {sentCsv && (
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${csvState === 'uploaded' ? 'border-emerald-500/40 bg-emerald-900/20 text-emerald-300' : 'border-zinc-700 bg-zinc-900/40 text-zinc-300'}`}>
                {csvState === 'uploading' && (
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                )}
                <span className="font-medium">CSV:</span>
                <span>
                  {csvState === 'uploading' && 'Uploading…'}
                  {csvState === 'uploaded' && 'Uploaded'}
                </span>
              </div>
            )}
          </div>
        )}

        {uploadProgress !== null && (
          <div className="mt-2">
            <div className="h-2 w-full bg-zinc-800 rounded">
              <div
                className="h-2 bg-emerald-500 rounded"
                style={{ width: `${Math.max(0, Math.min(100, uploadProgress))}%` }}
              />
            </div>
            <div className="text-xs text-zinc-400 mt-1">{uploadProgress}%</div>
          </div>
        )}
      </form>

      {result && (
        <div className="mt-6 text-sm text-zinc-300 bg-zinc-900/50 border border-zinc-800 rounded-md p-4">
          <div className="font-mono whitespace-pre-wrap break-all">{JSON.stringify(result, null, 2)}</div>
        </div>
      )}

      {jobStatus && (
        <div className="mt-4 text-sm text-zinc-300 bg-zinc-900/50 border border-zinc-800 rounded-md p-4">
          <div className="mb-2">OpenAI processing status: <span className={`font-medium ${jobStatus.status === 'completed' ? 'text-emerald-400' : jobStatus.status === 'error' ? 'text-red-400' : 'text-zinc-300'}`}>{String(jobStatus.status)}</span></div>
          <div className="font-mono whitespace-pre-wrap break-all">{JSON.stringify(jobStatus, null, 2)}</div>
          {polling && (
            <div className="mt-2 text-xs text-zinc-400">Updating every 5s…</div>
          )}
        </div>
      )}
    </div>
  );
}


