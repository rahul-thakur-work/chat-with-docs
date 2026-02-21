/**
 * Embedding helpers for semantic RAG. Uses Google when GOOGLE_GENERATIVE_AI_API_KEY is set.
 */

import { embed, embedMany, cosineSimilarity } from "ai";
import { google } from "@ai-sdk/google";

const EMBEDDING_MODEL_ID = "text-embedding-004";

function getEmbeddingModel() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) return null;
  return google.embedding(EMBEDDING_MODEL_ID);
}

export function hasEmbeddingProvider(): boolean {
  return getEmbeddingModel() != null;
}

/** Embed multiple texts (e.g. chunk texts). Returns array of number[] or null if provider unavailable. */
export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  const model = getEmbeddingModel();
  if (!model || texts.length === 0) return null;
  try {
    const { embeddings } = await embedMany({ model, values: texts });
    return embeddings.map((e) => [...e]); // copy to plain number[]
  } catch {
    return null;
  }
}

/** Embed a single query string. */
export async function embedQuery(text: string): Promise<number[] | null> {
  const model = getEmbeddingModel();
  if (!model || !text.trim()) return null;
  try {
    const { embedding } = await embed({ model, value: text.trim() });
    return [...embedding];
  } catch {
    return null;
  }
}

/** Cosine similarity between two vectors. */
export function similarity(a: number[], b: number[]): number {
  return cosineSimilarity(a, b);
}
