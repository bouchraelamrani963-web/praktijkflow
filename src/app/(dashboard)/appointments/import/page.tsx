"use client";

import Link from "next/link";
import { useState, type ChangeEvent } from "react";
import { ArrowLeft, Upload, CheckCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

interface ImportResult {
  created: number;
  skipped: number;
  total: number;
  errors: { row: number; message: string }[];
}

const EXAMPLE_CSV = `client_email,practitioner_email,type_name,start_iso,duration_minutes,status,revenue_cents,notes
sophie.devries@email.nl,dr.klein@praktijk-amc.nl,Intake,2026-05-01T09:00:00Z,60,SCHEDULED,9500,First visit
jan.bakker@email.nl,dr.vos@praktijk-amc.nl,Follow-up,2026-05-01T10:30:00Z,45,CONFIRMED,7500,`;

export default function ImportAppointmentsPage() {
  const [csv, setCsv] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!csv.trim()) {
      toast.error("Paste CSV or upload a file");
      return;
    }
    setImporting(true);
    setResult(null);
    try {
      const res = await fetch("/api/appointments/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Importeren mislukt");
      setResult(data);
      toast.success(`${data.created} van ${data.total} geïmporteerd`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Importeren mislukt");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <Link
        href="/appointments"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to appointments
      </Link>
      <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">Import appointments</h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Upload or paste CSV. Required columns: <code>client_email</code>, <code>practitioner_email</code>, <code>start_iso</code>.
        Optional: <code>type_name</code>, <code>duration_minutes</code>, <code>status</code>, <code>revenue_cents</code>, <code>notes</code>.
      </p>

      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">CSV file</label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="mt-1 block w-full text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700 dark:text-zinc-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Or paste CSV content
          </label>
          <textarea
            rows={10}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={EXAMPLE_CSV}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCsv(EXAMPLE_CSV)}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Load example
          </button>
          <button
            onClick={handleImport}
            disabled={importing || !csv.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {importing ? "Importing…" : "Import"}
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <span className="font-medium text-zinc-900 dark:text-white">
              {result.created} created
            </span>
            <span className="text-zinc-500">of {result.total} rows</span>
            {result.skipped > 0 && (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
                {result.skipped} skipped
              </span>
            )}
          </div>
          {result.errors.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm">
              {result.errors.map((e) => (
                <li key={e.row} className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-2 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Row {e.row}: {e.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
