"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { UploadZone } from "@/components/UploadZone";
import { ChatMessages } from "@/components/ChatMessages";
import { ChatInput } from "@/components/ChatInput";
import { ThemeToggle } from "@/components/ThemeToggle";

interface ActiveDoc {
  docId: string;
  filename: string;
}

interface MyDoc {
  id: string;
  filename: string;
  uploadedAt: number;
}

interface PreviousChat {
  id: string;
  title: string;
  updatedAt: number;
}

function ChatSection({
  docIdsRef,
  activeDocs,
  currentChatId,
  setCurrentChatId,
  selectedChatIdToLoad,
  clearSelectedChatIdToLoad,
  refetchChats,
  activeDocCount,
  setChatLoading,
}: {
  docIdsRef: React.MutableRefObject<string[]>;
  activeDocs: ActiveDoc[];
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  selectedChatIdToLoad: string | null;
  clearSelectedChatIdToLoad: () => void;
  refetchChats: () => void;
  activeDocCount: number;
  setChatLoading: (loading: boolean) => void;
}) {
  const requestSentAtRef = useRef<number>(0);
  const lastAssistantMessageIdRef = useRef<string | null>(null);
  const [firstTokenMs, setFirstTokenMs] = useState<number | null>(null);

  const transport = useRef(
    new DefaultChatTransport({
      api: "/api/chat",
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

  const { id, messages, sendMessage, setMessages, status } = useChat({ transport });
  const chatIdForSave = currentChatId ?? id;

  // Load a previous chat when selected
  useEffect(() => {
    if (!selectedChatIdToLoad) return;
    let cancelled = false;
    fetch(`/api/chats/${selectedChatIdToLoad}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.chat) return;
        setMessages(data.chat.messages as UIMessage[]);
        setCurrentChatId(data.chat.id);
        setFirstTokenMs(null);
        lastAssistantMessageIdRef.current = null;
        clearSelectedChatIdToLoad();
      })
      .catch(() => clearSelectedChatIdToLoad());
    return () => {
      cancelled = true;
    };
  }, [selectedChatIdToLoad, setMessages, setCurrentChatId, clearSelectedChatIdToLoad]);

  // First-token timing: when last message is assistant with content, set firstTokenMs once
  const lastMessage = messages[messages.length - 1];
  useEffect(() => {
    if (
      lastMessage?.role === "assistant" &&
      lastMessage.id !== lastAssistantMessageIdRef.current
    ) {
      const hasContent = lastMessage.parts?.some((p) => p.type === "text" && (p as { text?: string }).text);
      if (hasContent && requestSentAtRef.current > 0) {
        lastAssistantMessageIdRef.current = lastMessage.id;
        setFirstTokenMs(Math.max(0, Math.round(Date.now() - requestSentAtRef.current)));
      }
    }
  }, [lastMessage?.id, lastMessage?.role, lastMessage?.parts]);

  useEffect(() => {
    setChatLoading(status === "streaming" || status === "submitted");
  }, [status, setChatLoading]);

  // Save chat when messages change and not streaming
  useEffect(() => {
    if (status === "streaming" || messages.length === 0) return;
    const firstUser = messages.find((m) => m.role === "user");
    const firstTextPart = firstUser?.parts?.find((p) => "text" in p && typeof (p as { text?: string }).text === "string");
    const title = (firstTextPart && (firstTextPart as { text?: string }).text?.slice(0, 80)) || "Chat";
    fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: chatIdForSave, title, messages }),
    })
      .then((r) => { if (r.ok) refetchChats(); })
      .catch(() => {});
  }, [messages, status, chatIdForSave, refetchChats]);

  const [input, setInput] = useState("");
  const handleSubmit = () => {
    const text = input.trim();
    if (!text) return;
    requestSentAtRef.current = Date.now();
    lastAssistantMessageIdRef.current = null;
    setFirstTokenMs(null);
    sendMessage({ text });
    setInput("");
  };

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <>
      <ChatMessages
        messages={messages}
        isLoading={isLoading}
        activeDocCount={activeDocCount}
        firstTokenMs={firstTokenMs}
      />
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={isLoading}
      />
    </>
  );
}

export default function Home() {
  const [activeDocs, setActiveDocs] = useState<ActiveDoc[]>([]);
  const [myDocuments, setMyDocuments] = useState<MyDoc[]>([]);
  const [previousChats, setPreviousChats] = useState<PreviousChat[]>([]);
  const [chatKey, setChatKey] = useState(0);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [selectedChatIdToLoad, setSelectedChatIdToLoad] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const docIdsRef = useRef<string[]>([]);
  docIdsRef.current = activeDocs.map((d) => d.docId);

  const refetchChats = useCallback(() => {
    fetch("/api/chats")
      .then((r) => (r.ok ? r.json() : { chats: [] }))
      .then((data) => setPreviousChats(data.chats ?? []))
      .catch(() => setPreviousChats([]));
  }, []);

  useEffect(() => {
    fetch("/api/documents")
      .then((r) => (r.ok ? r.json() : { documents: [] }))
      .then((data) => setMyDocuments(data.documents ?? []))
      .catch(() => setMyDocuments([]));
  }, [activeDocs.length]);

  useEffect(() => {
    refetchChats();
  }, [refetchChats]);

  const handleUploadComplete = ({ docId, filename }: { docId: string; filename: string }) => {
    setActiveDocs((prev) => {
      if (prev.some((d) => d.docId === docId)) return prev;
      return [...prev, { docId, filename }];
    });
    setMyDocuments((prev) => {
      if (prev.some((d) => d.id === docId)) return prev;
      return [...prev, { id: docId, filename, uploadedAt: Date.now() }];
    });
  };

  const addDocToChat = (doc: MyDoc) => {
    setActiveDocs((prev) => {
      if (prev.some((d) => d.docId === doc.id)) return prev;
      return [...prev, { docId: doc.id, filename: doc.filename }];
    });
  };

  const startNewChat = () => {
    setChatKey((k) => k + 1);
    setCurrentChatId(null);
  };

  return (
    <div className="flex h-dvh flex-col bg-[var(--background)]">
      <header className="shrink-0 border-b border-[var(--border)] bg-[var(--card)] px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
              ChatDoX AI
            </h1>
          
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <SignedOut>
              <SignInButton mode="modal">
                <button className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
                  Sign up
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-4">
      <h1 id="hero-title" className="text-2xl leading-35px w-full text-center mb-4 font-semibold tracking-tight text-[var(--foreground)]">
              Upload a document, then ask questions. Answers are based on your files.
            </h1>
        {/* <SignedOut>
          <div className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted)]">
            Sign in to upload documents and chat. Your documents are stored per account.
          </div>
        </SignedOut> */}

        <section
          className="shrink-0 pb-4"
          aria-label="Upload and my documents"
        >
          <SignedIn>
            <UploadZone onUploadComplete={handleUploadComplete} disabled={chatLoading} />
            {myDocuments.length > 0 && (
              <div className="mt-4">
                <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                  My documents
                </h2>
                <ul className="flex flex-wrap gap-2" aria-label="My documents">
                  {myDocuments.map((d) => (
                    <li key={d.id} className="flex items-center gap-1.5">
                      <span className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-sm text-[var(--foreground)]">
                        {d.filename}
                      </span>
                      <button
                        type="button"
                        onClick={() => addDocToChat(d)}
                        className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                      >
                        Add to chat
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {activeDocs.length > 0 && (
              <p className="mt-2 text-xs text-[var(--muted)]">
                In this chat: {activeDocs.map((d) => d.filename).join(", ")}
              </p>
            )}
          </SignedIn>
        </section>

        <SignedIn>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {previousChats.length > 0 && (
              <>
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">Previous</span>
                {previousChats.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedChatIdToLoad(c.id)}
                    className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-sm text-[var(--foreground)] transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {c.title || "Chat"}
                  </button>
                ))}
              </>
            )}
            <button
              type="button"
              onClick={startNewChat}
              className="rounded-md bg-zinc-900 px-2.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              New chat
            </button>
          </div>
          <section
            className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm"
            aria-label="Chat"
          >
            <ChatSection
              key={chatKey}
              docIdsRef={docIdsRef}
              activeDocs={activeDocs}
              currentChatId={currentChatId}
              setCurrentChatId={setCurrentChatId}
              selectedChatIdToLoad={selectedChatIdToLoad}
              clearSelectedChatIdToLoad={() => setSelectedChatIdToLoad(null)}
              refetchChats={refetchChats}
              activeDocCount={activeDocs.length}
              setChatLoading={setChatLoading}
            />
          </section>
        </SignedIn>
        <SignedOut>
          <div className="flex flex-1 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <p className="text-sm text-[var(--muted)]">Sign in to start chatting with your docs.</p>
          </div>
        </SignedOut>
      </div>
    </div>
  );
}
