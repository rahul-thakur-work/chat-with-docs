"use client";

import type { UIMessage } from "ai";

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading?: boolean;
  /** When > 0, show "Grounded in your documents" under assistant replies (citations). */
  activeDocCount?: number;
}

export function ChatMessages({ messages, isLoading, activeDocCount = 0 }: ChatMessagesProps) {
  if (messages.length === 0 && !isLoading) {
    return (
      <div
        className="flex flex-1 items-center justify-center text-zinc-500 dark:text-zinc-400"
        role="status"
        aria-live="polite"
      >
        <p>Upload a PDF, then ask questions about it.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-1 flex-col gap-4 overflow-y-auto px-1 py-4" aria-label="Chat messages">
      {messages.map((message) => (
        <li
          key={message.id}
          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div className="max-w-[85%] space-y-1">
            <div
              className={`rounded-2xl px-4 py-2.5 ${
                message.role === "user"
                  ? "bg-emerald-600 text-white dark:bg-emerald-700"
                  : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              }`}
              role="article"
              aria-label={message.role === "user" ? "Your message" : "Assistant message"}
            >
              <span className="sr-only">{message.role === "user" ? "You" : "Assistant"}: </span>
              <div className="whitespace-pre-wrap break-words">
                {message.parts.map((part, i) => {
                  if (part.type === "text") {
                    return <span key={`${message.id}-${i}`}>{part.text}</span>;
                  }
                  return null;
                })}
              </div>
            </div>
            {message.role === "assistant" && activeDocCount > 0 && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400" aria-hidden="true">
                Grounded in your documents
              </p>
            )}
          </div>
        </li>
      ))}
      {isLoading && (
        <li className="flex justify-start" aria-live="polite" aria-busy="true">
          <div
            className="max-w-[85%] rounded-2xl bg-zinc-100 px-4 py-2.5 dark:bg-zinc-800"
            aria-label="Assistant is typing"
          >
            <span className="inline-block h-4 w-2 animate-pulse rounded bg-zinc-500" />
          </div>
        </li>
      )}
    </ul>
  );
}
