/**
 * Document store for RAG: in-memory cache + optional Vercel Blob persistence.
 * Supports semantic retrieval (top-K by similarity) when chunk embeddings are present.
 */

import {
  storagePutDoc,
  storageGetDoc,
  storageListDocIds,
  type StoredDocPayload,
} from "@/lib/storage";
import {
  hasEmbeddingProvider,
  embedTexts,
  embedQuery,
  similarity,
} from "@/lib/embeddings";

const CHUNK_SIZE = 600;
const CHUNK_OVERLAP = 100;

export interface DocChunk {
  text: string;
  index: number;
  /** Optional embedding for semantic retrieval (set when GOOGLE_GENERATIVE_AI_API_KEY is present). */
  embedding?: number[];
}

export interface StoredDoc {
  id: string;
  filename: string;
  chunks: DocChunk[];
  fullText: string;
  uploadedAt: number;
}

const memoryStore = new Map<string, StoredDoc>();

function splitIntoChunks(text: string): DocChunk[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const chunks: DocChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < normalized.length) {
    let end = Math.min(start + CHUNK_SIZE, normalized.length);
    if (end < normalized.length) {
      const lastSpace = normalized.lastIndexOf(" ", end);
      if (lastSpace > start) end = lastSpace;
    }
    chunks.push({ text: normalized.slice(start, end).trim(), index });
    index++;
    start = end - (end < normalized.length ? CHUNK_OVERLAP : 0);
    if (start <= 0) start = end;
  }

  return chunks;
}

function cacheKey(id: string, userId: string | null): string {
  return userId ? `${userId}:${id}` : id;
}

/** Save doc to memory and persist to Blob when BLOB_READ_WRITE_TOKEN is set. Computes embeddings when provider is available. */
export async function saveDoc(
  id: string,
  filename: string,
  fullText: string,
  userId: string | null = null
): Promise<StoredDoc> {
  const chunks = splitIntoChunks(fullText);
  if (hasEmbeddingProvider() && chunks.length > 0) {
    const texts = chunks.map((c) => c.text);
    const vectors = await embedTexts(texts);
    if (vectors && vectors.length === chunks.length) {
      chunks.forEach((c, i) => {
        c.embedding = vectors[i];
      });
    }
  }
  const doc: StoredDoc = { id, filename, chunks, fullText, uploadedAt: Date.now() };
  memoryStore.set(cacheKey(id, userId), doc);
  const payload: StoredDocPayload = { ...doc };
  await storagePutDoc(payload, userId);
  return doc;
}

/** Get doc from memory or load from Blob and cache. */
export async function getDoc(
  id: string,
  userId: string | null = null
): Promise<StoredDoc | undefined> {
  const key = cacheKey(id, userId);
  const cached = memoryStore.get(key);
  if (cached) return cached;
  const fromBlob = await storageGetDoc(id, userId);
  if (fromBlob) {
    const doc: StoredDoc = { ...fromBlob };
    memoryStore.set(key, doc);
    return doc;
  }
  return undefined;
}

export async function getDocsByIds(
  docIds: string[],
  userId: string | null = null
): Promise<StoredDoc[]> {
  const docs: StoredDoc[] = [];
  for (const id of docIds) {
    const doc = await getDoc(id, userId);
    if (doc) docs.push(doc);
  }
  return docs;
}

const DEFAULT_TOP_K = 12;
const DEFAULT_MAX_CHARS = 6000;

/**
 * Semantic retrieval: embed query, score chunks by similarity, return top-K as context.
 */
async function getContextSemantic(
  docs: StoredDoc[],
  query: string,
  topK: number,
  maxChars: number
): Promise<string> {
  const queryEmbedding = await embedQuery(query);
  if (!queryEmbedding) return getContextKeyword(docs, maxChars);

  type ScoredChunk = { doc: StoredDoc; chunk: DocChunk; score: number };
  const scored: ScoredChunk[] = [];
  for (const doc of docs) {
    for (const chunk of doc.chunks) {
      if (!chunk.embedding || chunk.embedding.length === 0) continue;
      const score = similarity(queryEmbedding, chunk.embedding);
      scored.push({ doc, chunk, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, topK);

  const parts: string[] = [];
  let totalChars = 0;
  for (const { doc, chunk } of selected) {
    if (totalChars >= maxChars) break;
    const block = `[${doc.filename}]\n${chunk.text}`;
    parts.push(block);
    totalChars += block.length;
  }
  let combined = parts.join("\n\n");
  if (combined.length > maxChars) {
    combined = combined.slice(0, maxChars) + "\n\n[... truncated ...]";
  }
  return combined;
}

/** Keyword-style: all chunks from docs concatenated (legacy). */
function getContextKeyword(docs: StoredDoc[], maxChars: number): string {
  const parts: string[] = [];
  for (const doc of docs) {
    const chunkTexts = doc.chunks.map((c) => c.text).join("\n\n");
    parts.push(`--- Document: ${doc.filename} ---\n${chunkTexts}`);
  }
  let combined = parts.join("\n\n");
  if (combined.length > maxChars) {
    combined = combined.slice(0, maxChars) + "\n\n[... truncated for context length ...]";
  }
  return combined;
}

/**
 * Retrieval: when query is provided and docs have embeddings, use semantic top-K; else keyword (all chunks).
 */
export async function getContextForPrompt(
  docIds: string[],
  maxChars: number = DEFAULT_MAX_CHARS,
  query?: string,
  userId: string | null = null
): Promise<string> {
  const docs = await getDocsByIds(docIds, userId);
  if (docs.length === 0) return "";

  const hasEmbeddings = docs.some((d) => d.chunks.some((c) => c.embedding?.length));
  if (query?.trim() && hasEmbeddings && hasEmbeddingProvider()) {
    return getContextSemantic(docs, query.trim(), DEFAULT_TOP_K, maxChars);
  }
  return getContextKeyword(docs, maxChars);
}

/** List all doc IDs (memory + Blob when configured). Scoped by userId when provided. */
export async function listDocIds(userId: string | null = null): Promise<string[]> {
  const fromBlob = await storageListDocIds(userId);
  if (userId) return fromBlob;
  const fromMemory = new Set(memoryStore.keys());
  fromBlob.forEach((id) => fromMemory.add(id));
  return Array.from(fromMemory);
}
