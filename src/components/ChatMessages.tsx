"use client";

import type { UIMessage } from "ai";

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading?: boolean;
  /** When > 0, show "Grounded in your documents" under assistant replies (citations). */
  activeDocCount?: number;
  /** First token latency in ms for the last assistant message; show "First token in X ms". */
  firstTokenMs?: number | null;
}

export function ChatMessages({ messages, isLoading, activeDocCount = 0, firstTokenMs }: ChatMessagesProps) {
  if (messages.length === 0 && !isLoading) {
    return (
      <div
        className="flex flex-1 items-center justify-center text-[var(--muted)]"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm">Upload a document, then ask questions about it.</p>
      </div>
    );
  }

  const lastMessage = messages[messages.length - 1];
  const showFirstTokenForLast = lastMessage?.role === "assistant";

  return (
    <ul className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-5" aria-label="Chat messages">
      {messages.map((message) => (
        <li
          key={message.id}
          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div className="max-w-[85%] space-y-1.5">
            <div
              className={`rounded-2xl px-4 py-3 ${
                message.role === "user"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              }`}
              role="article"
              aria-label={message.role === "user" ? "Your message" : "Assistant message"}
            >
              <span className="sr-only">{message.role === "user" ? "You" : "Assistant"}: </span>
              <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                {message.parts.map((part, i) => {
                  if (part.type === "text") {
                    return <span key={`${message.id}-${i}`}>{part.text}</span>;
                  }
                  return null;
                })}
              </div>
            </div>
            {message.role === "assistant" && (activeDocCount > 0 || (showFirstTokenForLast && firstTokenMs != null)) && (
              <p className="text-xs text-[var(--muted)]" aria-hidden="true">
                {activeDocCount > 0 && "Grounded in your documents"}
                {activeDocCount > 0 && showFirstTokenForLast && firstTokenMs != null && " · "}
                {showFirstTokenForLast && firstTokenMs != null && `First token in ${firstTokenMs} ms`}
              </p>
            )}
          </div>
        </li>
      ))}
      {isLoading && (
        <li className="flex justify-start" aria-live="polite" aria-busy="true">
          <div
            className="max-w-[85%] rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800"
            aria-label="Assistant is typing"
          >
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-zinc-400 dark:bg-zinc-500" />
          </div>
        </li>
      )}
    </ul>
  );
}
