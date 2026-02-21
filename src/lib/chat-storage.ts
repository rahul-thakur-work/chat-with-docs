/**
 * Persist chat sessions per user in Vercel Blob.
 */

import { put, get, del } from "@vercel/blob";

const USER_PREFIX = "users/";
const CHATS_MANIFEST = "_chats_manifest.json";

interface ChatMeta {
  title: string;
  updatedAt: number;
}

interface ChatsManifest {
  entries: Record<string, ChatMeta>;
}

export interface StoredChat {
  id: string;
  title: string;
  messages: unknown[];
  updatedAt: number;
}

function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function chatPrefix(userId: string): string {
  return `${USER_PREFIX}${userId}/chats/`;
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

export async function saveChat(
  userId: string,
  chatId: string,
  title: string,
  messages: unknown[]
): Promise<void> {
  if (!isBlobConfigured()) return;
  const pre = chatPrefix(userId);
  const payload: StoredChat = { id: chatId, title, messages, updatedAt: Date.now() };
  await put(`${pre}${chatId}.json`, JSON.stringify(payload), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  let manifest: ChatsManifest = { entries: {} };
  try {
    const res = await get(`${pre}${CHATS_MANIFEST}`, { access: "private" });
    if (res?.statusCode === 200 && res.stream) {
      manifest = JSON.parse(await streamToText(res.stream)) as ChatsManifest;
    }
  } catch {
    // no manifest yet
  }
  manifest.entries[chatId] = { title, updatedAt: payload.updatedAt };
  await put(`${pre}${CHATS_MANIFEST}`, JSON.stringify(manifest), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function getChat(
  userId: string,
  chatId: string
): Promise<StoredChat | null> {
  if (!isBlobConfigured()) return null;
  try {
    const res = await get(`${chatPrefix(userId)}${chatId}.json`, { access: "private" });
    if (!res || res.statusCode !== 200 || !res.stream) return null;
    const text = await streamToText(res.stream);
    return JSON.parse(text) as StoredChat;
  } catch {
    return null;
  }
}

export async function listChats(
  userId: string
): Promise<Array<{ id: string; title: string; updatedAt: number }>> {
  if (!isBlobConfigured()) return [];
  try {
    const res = await get(`${chatPrefix(userId)}${CHATS_MANIFEST}`, { access: "private" });
    if (res?.statusCode !== 200 || !res.stream) return [];
    const text = await streamToText(res.stream);
    const manifest = JSON.parse(text) as ChatsManifest;
    return Object.entries(manifest.entries ?? {}).map(([id, meta]) => ({
      id,
      title: meta.title,
      updatedAt: meta.updatedAt,
    }));
  } catch {
    return [];
  }
}

export async function deleteChat(userId: string, chatId: string): Promise<void> {
  if (!isBlobConfigured()) return;
  try {
    await del(`${chatPrefix(userId)}${chatId}.json`);
    const pre = chatPrefix(userId);
    let manifest: ChatsManifest = { entries: {} };
    try {
      const res = await get(`${pre}${CHATS_MANIFEST}`, { access: "private" });
      if (res?.statusCode === 200 && res.stream) {
        manifest = JSON.parse(await streamToText(res.stream)) as ChatsManifest;
      }
    } catch {
      // ignore
    }
    delete manifest.entries[chatId];
    await put(`${pre}${CHATS_MANIFEST}`, JSON.stringify(manifest), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } catch {
    // ignore
  }
}
