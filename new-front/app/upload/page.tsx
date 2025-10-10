"use client";

import React from "react";

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 rounded-lg border border-border bg-card shadow-sm">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          {subtitle && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      <div className="p-4 text-sm text-foreground">{children}</div>
    </div>
  );
}
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
  const [provider, setProvider] = React.useState<"openai" | "gemini">("gemini");
  const UPLOAD_TIMEOUT_MS = 30000; // 30s
  const STATUS_TIMEOUT_MS = 8000; // 8s per poll
  const [pdfFile, setPdfFile] = React.useState<File | null>(null);
  const [csvFile, setCsvFile] = React.useState<File | null>(null);
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(
    null
  );
  const [result, setResult] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [jobStatus, setJobStatus] = React.useState<any>(null);
  const [polling, setPolling] = React.useState<boolean>(false);
  const [sentPdf, setSentPdf] = React.useState<boolean>(false);
  const [sentCsv, setSentCsv] = React.useState<boolean>(false);
  const [pdfState, setPdfState] = React.useState<
    "idle" | "uploading" | "confirmed" | "analyzing" | "completed" | "error"
  >("idle");
  const [csvState, setCsvState] = React.useState<
    "idle" | "uploading" | "uploaded"
  >("idle");
  const [runSqlLoading, setRunSqlLoading] = React.useState<boolean>(false);
  const [runSqlResult, setRunSqlResult] = React.useState<any>(null);
  const [runSqlError, setRunSqlError] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<boolean>(false);
  const [sqlEditMode, setSqlEditMode] = React.useState<boolean>(false);
  const [sqlEdited, setSqlEdited] = React.useState<string | null>(null);

  // Initialize edited SQL when a completed job arrives
  React.useEffect(() => {
    if (jobStatus && jobStatus.status === "completed" && jobStatus.summary) {
      const sql = extractSql(jobStatus.summary);
      setSqlEdited(sql || null);
      setSqlEditMode(false);
    }
  }, [jobStatus]);

  const extractSql = (s: any): string | null => {
    if (!s) return null;
    const text = String(s);
    const lower = text.toLowerCase();
    const start = lower.indexOf("```sql");
    if (start >= 0) {
      const after = text.slice(start + 6);
      const end = after.indexOf("```\n");
      if (end >= 0) return after.slice(0, end).trim();
      const end2 = after.indexOf("```");
      if (end2 >= 0) return after.slice(0, end2).trim();
      return after.trim();
    }
    return null;
  };

  const highlightSql = (sql: string): string => {
    // Basic HTML escape
    let h = sql
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    // Comments
    h = h.replace(
      /(^|\n)\s*--.*(?=\n|$)/g,
      (m) => `<span class="com">${m}</span>`
    );
    // Strings
    h = h.replace(/'(?:''|[^'])*'/g, (m) => `<span class="str">${m}</span>`);
    // Numbers
    h = h.replace(/\b\d+(?:\.\d+)?\b/g, (m) => `<span class="num">${m}</span>`);
    // Functions (common ones we use)
    h = h.replace(
      /\b(jsonb?_build_object|gen_random_uuid|to_timestamp)\b/gi,
      (m) => `<span class="fn">${m}</span>`
    );
    // Types
    h = h.replace(/\b(event_type)\b/gi, (m) => `<span class="ty">${m}</span>`);
    // Keywords
    const kw = [
      "select",
      "insert",
      "into",
      "values",
      "on",
      "conflict",
      "do",
      "nothing",
      "update",
      "set",
      "where",
      "from",
      "join",
      "left",
      "right",
      "inner",
      "outer",
      "with",
      "as",
      "and",
      "or",
      "null",
      "distinct",
      "returning",
      "order",
      "by",
      "group",
      "limit",
      "offset",
    ];
    const kwRe = new RegExp(`\\b(${kw.join("|")})\\b`, "gi");
    h = h.replace(kwRe, (m) => `<span class="kw">${m.toUpperCase()}</span>`);
    return h;
  };

  const validateCsvHeaders = async (file: File): Promise<string | null> => {
    try {
      const text = await file.text();
      const firstLine =
        text.split(/\r?\n/).find((l) => l.trim().length > 0) || "";
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
    setJobStatus(null);
    setRunSqlResult(null);
    setRunSqlError(null);
    setUploadProgress(null);
    setPdfState("idle");
    setCsvState("idle");
    setSqlEdited(null);
    setSqlEditMode(false);
    if (!f) {
      setCsvError(null);
      return;
    }
    const err = await validateCsvHeaders(f);
    setCsvError(err);
  };

  const onPdfChange = (f: File | null) => {
    setPdfFile(f);
    setResult(null);
    setError(null);
    setJobStatus(null);
    setRunSqlResult(null);
    setRunSqlError(null);
    setUploadProgress(null);
    setPdfState("idle");
    setCsvState("idle");
    setSqlEdited(null);
    setSqlEditMode(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setJobStatus(null);
    setRunSqlResult(null);
    setRunSqlError(null);
    setSqlEdited(null);
    setSqlEditMode(false);
    if (!pdfFile && !csvFile) {
      setError("Please select at least a PDF or a CSV file.");
      return;
    }
    if (csvFile && csvError) return;
    setSubmitting(true);
    setUploadProgress(0);
    setSentPdf(!!pdfFile);
    setSentCsv(!!csvFile);
    setPdfState(pdfFile ? "uploading" : "idle");
    setCsvState(csvFile ? "uploading" : "idle");
    try {
      const form = new FormData();
      if (pdfFile) form.append("pdf", pdfFile);
      if (csvFile) form.append("csv", csvFile);
      form.append("provider", provider);

      // Use XMLHttpRequest to track upload progress
      const data = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE}/api/upload_pdf_csv`);
        xhr.timeout = UPLOAD_TIMEOUT_MS;
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(pct);
          }
        };
        xhr.ontimeout = () => reject(new Error("Upload timed out"));
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
      if (pdfFile) setPdfState("confirmed");
      if (csvFile) setCsvState("uploaded");
      // If backend started an OpenAI PDF job, poll status
      if (data && data.upload_id && data.pdf) {
        setPolling(true);
        setPdfState("analyzing");
        const id = data.upload_id as string;
        let tries = 0;
        const timer = setInterval(async () => {
          tries += 1;
          try {
            const res = await fetch(`${API_BASE}/api/uploads/${id}/status`, {
              signal: (AbortSignal as any).timeout
                ? (AbortSignal as any).timeout(STATUS_TIMEOUT_MS)
                : undefined,
            });
            if (!res.ok) throw new Error("status fetch failed");
            const js = await res.json();
            setJobStatus(js);
            if (
              js &&
              (js.status === "completed" ||
                js.status === "error" ||
                js.status === "not_found")
            ) {
              clearInterval(timer);
              setPolling(false);
              if (js.status === "completed") setPdfState("completed");
              else setPdfState("error");
            }
          } catch {}
          if (tries > 120) {
            // ~10 minutes at 5s interval
            clearInterval(timer);
            setPolling(false);
            setPdfState("error");
          }
        }, 5000);
      }
    } catch (e: any) {
      setError(e?.message || "Upload failed");
      if (pdfFile) setPdfState("error");
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
          <label className="text-sm text-foreground">Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as "openai" | "gemini")}
            disabled={submitting}
            className={`w-full h-9 rounded-md px-2 text-sm ${
              submitting
                ? "bg-muted border-border text-muted-foreground"
                : "bg-background border border-input text-foreground"
            }`}
          >
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>
          <div className="text-xs text-muted-foreground">
            Controls which model processes the PDF.
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm text-foreground">PDF file</label>
          <input
            type="file"
            accept="application/pdf,.pdf"
            disabled={submitting}
            onChange={(e) => onPdfChange(e.target.files?.[0] || null)}
            className={`block w-full text-sm ${
              submitting ? "text-muted-foreground" : "text-foreground"
            } file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold ${
              submitting
                ? "file:bg-muted file:text-muted-foreground"
                : "file:bg-secondary file:text-secondary-foreground hover:file:bg-accent"
            }`}
          />
          {pdfFile && (
            <div className="text-xs text-muted-foreground">
              Selected: {pdfFile.name}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm text-foreground">CSV file</label>
          <input
            type="file"
            accept="text/csv,.csv"
            onChange={(e) => onCsvChange(e.target.files?.[0] || null)}
            disabled={submitting}
            className={`block w-full text-sm ${
              submitting ? "text-muted-foreground" : "text-foreground"
            } file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold ${
              submitting
                ? "file:bg-muted file:text-muted-foreground"
                : "file:bg-secondary file:text-secondary-foreground hover:file:bg-accent"
            }`}
          />
          {csvFile && (
            <Card
              title="CSV details"
              subtitle={csvError ? "Validation error" : "Ready to upload"}
            >
              <div className="text-foreground text-sm break-all mb-1">
                {csvFile.name}
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                {csvFile.size} bytes
              </div>
              {csvError ? (
                <div className="text-xs text-red-400">{csvError}</div>
              ) : (
                <>
                  <div className="text-xs text-emerald-400 mb-2">
                    CSV headers look good.
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Required columns:
                  </div>
                  <ul className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-foreground">
                    {REQUIRED_HEADERS.map((h) => (
                      <li
                        key={h}
                        className="rounded border border-border bg-muted px-2 py-1"
                      >
                        {h}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          )}
          <div className="text-xs text-muted-foreground mt-1">
            Required columns: {REQUIRED_HEADERS.join(", ")}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            You can upload just one file or both.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={
              submitting || (!pdfFile && !csvFile) || (!!csvFile && !!csvError)
            }
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md border ${
              submitting
                ? "bg-muted border-border text-muted-foreground"
                : "bg-card border-border text-foreground hover:bg-accent hover:border-ring"
            }`}
          >
            {submitting && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
            )}
            <span>{submitting ? "Uploading…" : "Upload"}</span>
          </button>
          {error && <span className="text-sm text-red-400">{error}</span>}
          {result && (
            <span className="text-sm text-emerald-400">Upload confirmed</span>
          )}
        </div>

        {(sentPdf || sentCsv) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {sentPdf && (
              <div
                className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${
                  pdfState === "error"
                    ? "border-red-500/40 bg-red-900/20 text-red-300"
                    : pdfState === "completed"
                    ? "border-emerald-500/40 bg-emerald-900/20 text-emerald-300"
                    : "border-border bg-card text-foreground"
                }`}
              >
                {(pdfState === "uploading" || pdfState === "analyzing") && (
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                )}
                <span className="font-medium">PDF:</span>
                <span>
                  {pdfState === "uploading" && "Uploading…"}
                  {pdfState === "confirmed" && "Uploaded"}
                  {pdfState === "analyzing" &&
                    (provider === "gemini"
                      ? "Analyzing with Gemini…"
                      : "Analyzing with OpenAI…")}
                  {pdfState === "completed" && "Analysis complete"}
                  {pdfState === "error" && "Error"}
                </span>
              </div>
            )}
            {sentCsv && (
              <div
                className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${
                  csvState === "uploaded"
                    ? "border-emerald-500/40 bg-emerald-900/20 text-emerald-300"
                    : "border-border bg-card text-foreground"
                }`}
              >
                {csvState === "uploading" && (
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                )}
                <span className="font-medium">CSV:</span>
                <span>
                  {csvState === "uploading" && "Uploading…"}
                  {csvState === "uploaded" && "Uploaded"}
                </span>
              </div>
            )}
          </div>
        )}

        {uploadProgress !== null && (
          <div className="mt-2">
            <div className="h-2 w-full bg-muted rounded">
              <div
                className="h-2 bg-emerald-500 rounded"
                style={{
                  width: `${Math.max(0, Math.min(100, uploadProgress))}%`,
                }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {uploadProgress}%
            </div>
          </div>
        )}
      </form>

      {result && (
        <Card
          title="Upload confirmation"
          subtitle="Initial response from server"
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`inline-flex items-center rounded px-2 py-0.5 text-xs border ${
                result.status === "ok"
                  ? "border-emerald-500/40 bg-emerald-900/20 text-emerald-300"
                  : "border-red-500/40 bg-red-900/20 text-red-300"
              }`}
            >
              {String(result.status || "unknown")}
            </span>
            {uploadProgress !== null && (
              <span className="text-xs text-muted-foreground">
                Upload {uploadProgress}%
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.pdf && (
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-xs uppercase text-muted-foreground mb-1">
                  PDF
                </div>
                <div className="text-foreground break-all">
                  {result.pdf.filename || "—"}
                </div>
                {typeof result.pdf.size === "number" && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {result.pdf.size} bytes
                  </div>
                )}
              </div>
            )}
            {result.csv && (
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-xs uppercase text-muted-foreground mb-1">
                  CSV
                </div>
                <div className="text-foreground break-all">
                  {result.csv.filename || "—"}
                </div>
                {typeof result.csv.size === "number" && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {result.csv.size} bytes
                  </div>
                )}
              </div>
            )}
          </div>
          {result.upload_id && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Upload ID:</span>
              <code className="text-xs bg-muted border border-border rounded px-2 py-1 break-all">
                {String(result.upload_id)}
              </code>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      String(result.upload_id)
                    );
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 1200);
                  } catch {}
                }}
                className="text-xs px-2 py-1 rounded border border-border bg-card hover:bg-accent text-foreground"
              >
                {copiedId ? "Copied" : "Copy"}
              </button>
            </div>
          )}
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              Show raw JSON
            </summary>
            <div className="mt-2 font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(result, null, 2)}
            </div>
          </details>
        </Card>
      )}

      {jobStatus && (
        <Card
          title={`${String(
            jobStatus.provider || (provider === "gemini" ? "gemini" : "openai")
          )} processing`}
          subtitle={`Status: ${String(jobStatus.status)}`}
        >
          {/* Pretty header info for partial/progress */}
          {jobStatus.status !== "completed" && jobStatus.status !== "error" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {jobStatus.pdf && (
                <div className="rounded-md border border-border bg-card p-3">
                  <div className="text-xs uppercase text-muted-foreground mb-1">
                    PDF
                  </div>
                  <div className="text-foreground break-all">
                    {jobStatus.pdf.filename || "—"}
                  </div>
                  {typeof jobStatus.pdf.size === "number" && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {jobStatus.pdf.size} bytes
                    </div>
                  )}
                </div>
              )}
              <div className="rounded-md border border-border bg-card p-3 flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-muted-foreground"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
                <div>
                  <div className="text-foreground">Analyzing…</div>
                  <div className="text-xs text-muted-foreground">
                    This may take up to a minute
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Completed/error pretty blocks */}
          {jobStatus.status === "completed" &&
            jobStatus.summary &&
            (() => {
              const sql = extractSql(jobStatus.summary);
              if (sql) {
                return (
                  <div className="mt-3">
                    <div className="text-xs uppercase text-muted-foreground mb-1">
                      SQL
                    </div>
                    {!sqlEditMode ? (
                      <pre
                        className="font-mono bg-muted rounded p-3 border border-border max-h-96 overflow-auto sql"
                        dangerouslySetInnerHTML={{
                          __html: highlightSql(sqlEdited ?? sql),
                        }}
                      />
                    ) : (
                      <textarea
                        className="w-full font-mono bg-muted rounded p-3 border border-border text-foreground min-h-[200px]"
                        value={sqlEdited ?? sql}
                        onChange={(e) => setSqlEdited(e.target.value)}
                      />
                    )}
                    <style jsx global>{`
                      .sql .kw {
                        color: #7ee787;
                        font-weight: 600;
                      }
                      .sql .fn {
                        color: #7cd4ff;
                      }
                      .sql .str {
                        color: #ffdf8a;
                      }
                      .sql .num {
                        color: #d2a8ff;
                      }
                      .sql .com {
                        color: #9ca3af;
                        font-style: italic;
                      }
                      .sql .ty {
                        color: #ffa657;
                      }
                    `}</style>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={submitting || runSqlLoading}
                        onClick={() => setSqlEditMode((v) => !v)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border ${
                          runSqlLoading || submitting
                            ? "bg-muted border-border text-muted-foreground"
                            : "bg-card border-border text-foreground hover:bg-accent hover:border-ring"
                        }`}
                      >
                        {sqlEditMode ? "View highlighted" : "Edit SQL"}
                      </button>
                      <button
                        type="button"
                        disabled={submitting || runSqlLoading}
                        onClick={async () => {
                          setRunSqlError(null);
                          setRunSqlResult(null);
                          setRunSqlLoading(true);
                          try {
                            const sqlToRun = sqlEditMode
                              ? sqlEdited ?? sql
                              : sql;
                            const res = await fetch(
                              `${API_BASE}/api/sql/execute`,
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ sql: sqlToRun }),
                              }
                            );
                            if (!res.ok)
                              throw new Error(`Execute failed (${res.status})`);
                            const js = await res.json();
                            setRunSqlResult(js);
                          } catch (err: any) {
                            setRunSqlError(
                              err?.message || "Failed to execute SQL"
                            );
                          } finally {
                            setRunSqlLoading(false);
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border ${
                          runSqlLoading || submitting
                            ? "bg-muted border-border text-muted-foreground"
                            : "bg-card border-border text-foreground hover:bg-accent hover:border-ring"
                        }`}
                      >
                        {runSqlLoading && (
                          <svg
                            className="animate-spin h-4 w-4"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                            ></path>
                          </svg>
                        )}
                        <span>Confirm & Store in DB</span>
                      </button>
                      {runSqlError && (
                        <span className="text-xs text-red-400">
                          {runSqlError}
                        </span>
                      )}
                    </div>
                    {runSqlResult && (
                      <div className="mt-2 rounded-md border border-emerald-700/40 bg-emerald-950/20 p-2 text-xs text-emerald-300">
                        {JSON.stringify(runSqlResult)}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <div className="mt-3">
                  <div className="text-xs uppercase text-muted-foreground mb-1">
                    Summary
                  </div>
                  <pre className="font-mono whitespace-pre-wrap break-words text-foreground bg-muted rounded p-3 border border-border max-h-80 overflow-auto">
                    {String(jobStatus.summary)}
                  </pre>
                </div>
              );
            })()}
          {jobStatus.status === "error" && (
            <div className="mt-3 rounded-md border border-red-900/50 bg-red-950/30 p-3 text-red-300">
              There was an error while processing.
            </div>
          )}

          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              Show raw
            </summary>
            <div className="mt-2 font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(jobStatus, null, 2)}
            </div>
          </details>
          {polling && (
            <div className="mt-2 text-xs text-muted-foreground">
              Updating every 5s…
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
