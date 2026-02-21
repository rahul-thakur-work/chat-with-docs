/**
 * Persistent document storage. Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set;
 * otherwise in-memory only (local dev).
 */

import { put, get, list, del } from "@vercel/blob";

const BLOB_PREFIX = "docs/";

export interface StoredDocPayload {
  id: string;
  filename: string;
  chunks: { text: string; index: number; embedding?: number[] }[];
  fullText: string;
  uploadedAt: number;
}

function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function streamToText(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export async function storagePutDoc(doc: StoredDocPayload): Promise<void> {
  if (!isBlobConfigured()) return;
  const pathname = `${BLOB_PREFIX}${doc.id}.json`;
  await put(pathname, JSON.stringify(doc), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

export async function storageGetDoc(id: string): Promise<StoredDocPayload | null> {
  if (!isBlobConfigured()) return null;
  const pathname = `${BLOB_PREFIX}${id}.json`;
  try {
    const result = await get(pathname, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await streamToText(result.stream);
    return JSON.parse(text) as StoredDocPayload;
  } catch {
    return null;
  }
}

export async function storageListDocIds(): Promise<string[]> {
  if (!isBlobConfigured()) return [];
  const { blobs } = await list({ prefix: BLOB_PREFIX, limit: 1000 });
  return blobs
    .map((b) => {
      const match = b.pathname.match(new RegExp(`^${BLOB_PREFIX}(.+\\.json)$`));
      return match ? match[1].replace(/\.json$/, "") : null;
    })
    .filter((id): id is string => id != null);
}

export async function storageDeleteDoc(id: string): Promise<void> {
  if (!isBlobConfigured()) return;
  const pathname = `${BLOB_PREFIX}${id}.json`;
  try {
    await del(pathname);
  } catch {
    // ignore
  }
}
