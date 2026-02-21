"use client";

import { useRef, useEffect } from "react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Ask about your document…",
}: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) onSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex shrink-0 gap-3 border-t border-[var(--border)] bg-[var(--card)] p-4">
      <label htmlFor="chat-input" className="sr-only">
        Message
      </label>
      <textarea
        ref={inputRef}
        id="chat-input"
        rows={1}
        style={{ overflow: "hidden" }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="min-h-[44px] max-h-40 flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-[var(--foreground)]  placeholder-[var(--muted)] outline-none transition-colors focus:border-zinc-400 focus:ring-2 focus:ring-zinc-400/20 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/20"
        aria-describedby="input-hint"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="shrink-0 self-end rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        aria-label="Send message"
      >
        Send
      </button>
      <span id="input-hint" className="sr-only">
        Press Enter to send, Shift+Enter for new line
      </span>
    </form>
  );
}
