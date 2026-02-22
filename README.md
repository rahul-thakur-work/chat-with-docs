# Chat with Docs

A Next.js app that lets you upload documents (PDF, TXT, MD) and chat with an AI assistant that answers from your uploaded content. Supports semantic retrieval when embeddings are configured, chat history, and optional persistent storage.

## Features

- **Document upload** — PDF, `.txt`, and `.md` (max 10 MB). Text is extracted and chunked for RAG.
- **RAG chat** — Ask questions; answers are grounded in your documents with optional inline citations `[Source: filename]`.
- **Semantic search** — When `GOOGLE_GENERATIVE_AI_API_KEY` is set, document chunks are embedded and the most relevant passages are used for context.
- **Chat history** — Previous chats are listed and can be resumed (persisted when Vercel Blob is configured).
- **Auth** — Sign in/sign up via [Clerk](https://clerk.com); uploads and chats are scoped per user.
- **Theme** — Light/dark mode toggle.

## Tech stack

- **Next.js 16** (App Router), **React 19**, **TypeScript**
- **Clerk** — authentication
- **Vercel AI SDK** — chat and streaming; supports **Google Gemini**, **Groq**, and **OpenAI**
- **pdf-parse** — PDF text extraction
- **Vercel Blob** (optional) — persistent document and chat storage

## Setup

### 1. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 2. Environment variables

Create `.env.local` in the project root.

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | One of these | Gemini for chat; also enables embeddings for semantic RAG |
| `GROQ_API_KEY` | One of these | Groq (e.g. Llama) for chat |
| `OPENAI_API_KEY` | One of these | OpenAI for chat |
| `BLOB_READ_WRITE_TOKEN` | No | Vercel Blob token; enables persisting docs and chat history |

**Chat model priority:** Gemini → Groq → OpenAI (first key found wins).

**Embeddings:** Only Google is used for embeddings; set `GOOGLE_GENERATIVE_AI_API_KEY` to enable semantic retrieval. Without it, context is keyword-style (all chunks from selected docs).

### 3. Clerk

1. Create an app at [clerk.com](https://clerk.com).
2. Add the Clerk env vars above.
3. Configure sign-in/sign-up (e.g. email, Google) as needed.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── upload/route.ts   # POST: upload PDF/TXT/MD, extract text, chunk, optional embed
│   │   ├── chat/route.ts     # POST: streamed RAG chat (Gemini/Groq/OpenAI)
│   │   ├── documents/route.ts
│   │   └── chats/            # Chat list and by-id (for history)
│   ├── layout.tsx
│   ├── page.tsx              # Main UI: upload zone, doc list, chat, theme toggle
│   └── globals.css
├── components/
│   ├── UploadZone.tsx
│   ├── ChatMessages.tsx
│   ├── ChatInput.tsx
│   ├── ThemeToggle.tsx
│   └── ThemeProvider.tsx
├── lib/
│   ├── docs.ts       # Chunking, in-memory store, semantic/keyword context
│   ├── embeddings.ts # Google embeddings for RAG
│   ├── storage.ts    # Vercel Blob document persistence
│   └── chat-storage.ts
└── middleware.ts     # Clerk protection for /api/upload, /api/chat, etc.
```

## License

Private / unlicensed.
