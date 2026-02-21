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
    <form onSubmit={handleSubmit} className="flex shrink-0 gap-2 border-t border-zinc-200 bg-white py-3 dark:border-zinc-700 dark:bg-zinc-900">
      <label htmlFor="chat-input" className="sr-only">
        Message
      </label>
      <textarea
        ref={inputRef}
        id="chat-input"
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="min-h-[44px] max-h-40 flex-1 resize-none rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-zinc-900 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
        aria-describedby="input-hint"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="shrink-0 self-end rounded-xl bg-emerald-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:bg-emerald-700 dark:hover:bg-emerald-600"
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
