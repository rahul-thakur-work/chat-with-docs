"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { UploadZone } from "@/components/UploadZone";
import { ChatMessages } from "@/components/ChatMessages";
import { ChatInput } from "@/components/ChatInput";

interface ActiveDoc {
  docId: string;
  filename: string;
}

export default function Home() {
  const [activeDocs, setActiveDocs] = useState<ActiveDoc[]>([]);
  const [input, setInput] = useState("");
  const docIdsRef = useRef<string[]>([]);
  docIdsRef.current = activeDocs.map((d) => d.docId);

  const transport = useRef(
    new DefaultChatTransport({
      api: "/api/chat",
      // Build body so the API gets messages + docIds. Don't spread body first so
      // we never overwrite messages (SDK may pass body with other keys).
      prepareSendMessagesRequest: ({ messages, id, trigger, messageId }) => ({
        body: {
          id,
          messages,
          trigger,
          messageId,
          docIds: docIdsRef.current,
        },
      }),
    })
  ).current;

  const { messages, sendMessage, status } = useChat({ transport });

  const handleUploadComplete = ({ docId, filename }: { docId: string; filename: string }) => {
    setActiveDocs((prev) => {
      if (prev.some((d) => d.docId === docId)) return prev;
      return [...prev, { docId, filename }];
    });
  };

  const handleSubmit = () => {
    const text = input.trim();
    if (!text) return;
    sendMessage({ text });
    setInput("");
  };

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <div className="flex h-dvh flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Chat with your docs
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Upload a PDF, then ask questions. Answers are based on your documents.
        </p>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4">
        <section
          className="shrink-0 py-4"
          aria-label="Upload documents"
        >
          <UploadZone onUploadComplete={handleUploadComplete} disabled={isLoading} />
          {activeDocs.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Uploaded documents">
              {activeDocs.map((d) => (
                <li
                  key={d.docId}
                  className="rounded-lg bg-emerald-100 px-2.5 py-1 text-sm text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                >
                  {d.filename}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className="flex min-h-0 flex-1 flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
          aria-label="Chat"
        >
          <ChatMessages messages={messages} isLoading={isLoading} activeDocCount={activeDocs.length} />
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            disabled={isLoading}
          />
        </section>
      </div>
    </div>
  );
}
