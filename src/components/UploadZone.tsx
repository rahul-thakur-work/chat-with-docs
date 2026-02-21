"use client";

import { useCallback, useState } from "react";

const MAX_SIZE_MB = 10;

interface UploadZoneProps {
  onUploadComplete: (data: { docId: string; filename: string }) => void;
  disabled?: boolean;
}

export function UploadZone({ onUploadComplete, disabled }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAllowedType = (file: File) => {
    const t = file.type.toLowerCase();
    const n = file.name.toLowerCase();
    return (
      t.includes("pdf") ||
      t === "text/plain" ||
      t === "text/markdown" ||
      n.endsWith(".txt") ||
      n.endsWith(".md") ||
      n.endsWith(".markdown")
    );
  };

  const uploadFile = useCallback(
    async (file: File) => {
      if (!isAllowedType(file)) {
        setError("Supported: PDF, .txt, .md");
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`File must be under ${MAX_SIZE_MB} MB.`);
        return;
      }
      setError(null);
      setUploading(true);
      try {
        const formData = new FormData();
        formData.set("file", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        onUploadComplete({ docId: data.docId, filename: data.filename });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onUploadComplete]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (disabled || uploading) return;
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [disabled, uploading, uploadFile]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
      e.target.value = "";
    },
    [uploadFile]
  );

  return (
    <div className="w-full">
      <label
        role="button"
        tabIndex={0}
        aria-label="Upload document (PDF, TXT, MD)"
        aria-disabled={disabled || uploading}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled && !uploading) document.getElementById("file-input")?.click();
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`
          flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8
          transition-colors outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-500
          ${dragActive ? "border-zinc-400 bg-zinc-50 dark:border-zinc-500 dark:bg-zinc-800/50" : "border-[var(--border)]"}
          ${disabled || uploading ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-500"}
        `}
      >
        <input
          id="file-input"
          type="file"
          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
          className="sr-only"
          disabled={disabled || uploading}
          onChange={onInputChange}
          aria-describedby="upload-hint upload-error"
        />
        {uploading ? (
          <span className="text-sm text-[var(--muted)]">Uploading…</span>
        ) : (
          <>
            <span className="mb-1 text-sm font-medium text-[var(--foreground)]">
              Drop a PDF, .txt, or .md here or click to upload
            </span>
            <span id="upload-hint" className="text-xs text-[var(--muted)]">
              Max {MAX_SIZE_MB} MB
            </span>
          </>
        )}
      </label>
      {error && (
        <p id="upload-error" role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
