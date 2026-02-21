# Chat with your docs

AI chat app that answers questions from your uploaded PDFs. Built with **Next.js 15** (App Router), **Vercel AI SDK**, **streaming UX**, and RAG-style retrieval.

## Features

- **Upload PDFs** – Drag-and-drop or click to upload (max 10 MB).
- **Streaming responses** – Answers stream in real time.
- **RAG-style context** – Document text is chunked and injected into the model context so answers are grounded in your docs.
- **Accessible UI** – Focus management, ARIA labels, keyboard support.
- **Multi-provider** – **Gemini** (2.0 Flash) when `GOOGLE_GENERATIVE_AI_API_KEY` is set; else **Groq** (Llama 3.3 70B) or **OpenAI** (gpt-4o-mini).

## Stack

- Next.js 15 (App Router), React 19, TypeScript
- Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/groq`)
- Tailwind CSS 4
- pdf-parse (PDF text extraction)

## Setup

1. Clone and install:

   ```bash
   cd chat-with-docs && npm install
   ```

2. Add env vars (copy from `.env.local.example`):

   ```bash
   cp .env.local.example .env.local
   ```

   Set **one** of (priority order):

   - `GOOGLE_GENERATIVE_AI_API_KEY` – for Gemini (get from [Google AI Studio](https://aistudio.google.com/apikey))
   - `GROQ_API_KEY` – for Groq (Llama)
   - `OPENAI_API_KEY` – for OpenAI

3. Run dev:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000), upload a PDF, then ask questions about it.

## Project layout

- `src/app/page.tsx` – Main chat page (upload zone + messages + input).
- `src/app/api/upload/route.ts` – PDF upload; extracts text, chunks, stores in memory.
- `src/app/api/chat/route.ts` – Chat API; injects doc context and streams via Vercel AI SDK.
- `src/lib/docs.ts` – In-memory doc store and chunking for RAG.
- `src/components/` – `UploadZone`, `ChatMessages`, `ChatInput`.

## Metrics

- **First token time** – Logged server-side in the chat route (`onFinish`). Target: &lt; 200 ms first token for a strong UX.

## Resume line

> Built an AI chat-with-docs app using Next.js 15 App Router, Vercel AI SDK, and streaming UX; integrated RAG-style retrieval and file upload.

## Roadmap

See **[docs/PRODUCT_ROADMAP.md](docs/PRODUCT_ROADMAP.md)** for a Senior PM-style scaling and optimization plan: persistence, semantic RAG, citations, auth, and phased feature priorities.

## License

MIT
