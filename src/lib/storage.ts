/**
 * Persistent document storage. Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set.
 * When userId is provided, keys are scoped to users/{userId}/docs/ and a manifest is used for listing.
 */

import { put, get, list, del } from "@vercel/blob";

const LEGACY_PREFIX = "docs/";
const USER_PREFIX = "users/";

export interface StoredDocPayload {
  id: string;
  filename: string;
  chunks: { text: string; index: number; embedding?: number[] }[];
  fullText: string;
  uploadedAt: number;
}

export interface DocMeta {
  filename: string;
  uploadedAt: number;
}

interface Manifest {
  entries: Record<string, DocMeta>;
}

function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function prefix(userId: string | null): string {
  return userId ? `${USER_PREFIX}${userId}/docs/` : LEGACY_PREFIX;
}

async function streamToText(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  let totalLength = 0;
  for (const chunk of chunks) totalLength += chunk.length;
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(merged);
}

export async function storagePutDoc(
  doc: StoredDocPayload,
  userId: string | null = null
): Promise<void> {
  if (!isBlobConfigured()) return;
  const pre = prefix(userId);
  const pathname = `${pre}${doc.id}.json`;
  await put(pathname, JSON.stringify(doc), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
  });
  if (userId) {
    const manifestPath = `${pre}_manifest.json`;
    let manifest: Manifest = { entries: {} };
    try {
      const result = await get(manifestPath, { access: "private" });
      if (result?.statusCode === 200 && result.stream) {
        const text = await streamToText(result.stream);
        manifest = JSON.parse(text) as Manifest;
      }
    } catch {
      // no manifest yet
    }
    manifest.entries[doc.id] = { filename: doc.filename, uploadedAt: doc.uploadedAt };
    await put(manifestPath, JSON.stringify(manifest), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  }
}

export async function storageGetDoc(
  id: string,
  userId: string | null = null
): Promise<StoredDocPayload | null> {
  if (!isBlobConfigured()) return null;
  const pathname = `${prefix(userId)}${id}.json`;
  try {
    const result = await get(pathname, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await streamToText(result.stream);
    return JSON.parse(text) as StoredDocPayload;
  } catch {
    return null;
  }
}

export async function storageListDocIds(userId: string | null = null): Promise<string[]> {
  if (!isBlobConfigured()) return [];
  if (userId) {
    const manifestPath = `${prefix(userId)}_manifest.json`;
    try {
      const result = await get(manifestPath, { access: "private" });
      if (result?.statusCode === 200 && result.stream) {
        const text = await streamToText(result.stream);
        const manifest = JSON.parse(text) as Manifest;
        return Object.keys(manifest.entries ?? {});
      }
    } catch {
      // no manifest
    }
    return [];
  }
  const { blobs } = await list({ prefix: LEGACY_PREFIX, limit: 1000 });
  return blobs
    .map((b) => {
      const match = b.pathname.match(new RegExp(`^${LEGACY_PREFIX}(.+\\.json)$`));
      return match ? match[1].replace(/\.json$/, "") : null;
    })
    .filter((id): id is string => id != null);
}

/** List docs with metadata for the user (for "My documents"). */
export async function storageListDocs(
  userId: string | null
): Promise<Array<{ id: string; filename: string; uploadedAt: number }>> {
  if (!userId || !isBlobConfigured()) return [];
  const manifestPath = `${prefix(userId)}_manifest.json`;
  try {
    const result = await get(manifestPath, { access: "private" });
    if (result?.statusCode !== 200 || !result.stream) return [];
    const text = await streamToText(result.stream);
    const manifest = JSON.parse(text) as Manifest;
    return Object.entries(manifest.entries ?? {}).map(([id, meta]) => ({
      id,
      filename: meta.filename,
      uploadedAt: meta.uploadedAt,
    }));
  } catch {
    return [];
  }
}

export async function storageDeleteDoc(
  id: string,
  userId: string | null = null
): Promise<void> {
  if (!isBlobConfigured()) return;
  const pre = prefix(userId);
  const pathname = `${pre}${id}.json`;
  try {
    await del(pathname);
    if (userId) {
      const manifestPath = `${pre}_manifest.json`;
      let manifest: Manifest = { entries: {} };
      try {
        const result = await get(manifestPath, { access: "private" });
        if (result?.statusCode === 200 && result.stream) {
          const text = await streamToText(result.stream);
          manifest = JSON.parse(text) as Manifest;
        }
      } catch {
        // ignore
      }
      delete manifest.entries[id];
      await put(manifestPath, JSON.stringify(manifest), {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
    }
  } catch {
    // ignore
  }
}
