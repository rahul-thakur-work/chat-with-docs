import { streamText, type UIMessage, convertToModelMessages } from "ai";
import { auth } from "@clerk/nextjs/server";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { groq } from "@ai-sdk/groq";
import { getContextForPrompt } from "@/lib/docs";

const SYSTEM_PROMPT_BASE = `You are a helpful assistant that answers questions based on the documents the user has uploaded.
- Answer only from the provided document context when relevant; otherwise say you don't have that information in the documents.
- When you use a specific passage from the context, cite it inline like [Source: filename] so the user knows which doc it came from.
- Be concise and accurate. If the user hasn't uploaded any documents yet, suggest they upload a PDF to get started.`;

export async function POST(req: Request) {
  const startTime = Date.now();
  let firstTokenTime: number | null = null;

  try {
    const body = await req.json();
    const { messages, docIds = [] }: { messages: UIMessage[]; docIds?: string[] } = body;

    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let query: string | undefined;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        const part = messages[i].parts.find((p) => p.type === "text");
        if (part && "text" in part && typeof part.text === "string") query = part.text;
        break;
      }
    }
    const { userId } = await auth();
    const context = await getContextForPrompt(docIds, 6000, query, userId ?? null);
    const system =
      context.length > 0
        ? `${SYSTEM_PROMPT_BASE}\n\n## Document context (use this to answer):\n\n${context}`
        : SYSTEM_PROMPT_BASE;

    const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!googleKey && !groqKey && !openaiKey) {
      return new Response(
        JSON.stringify({
          error:
            "No API key configured. Set GOOGLE_GENERATIVE_AI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY in .env.local (in the chat-with-docs folder).",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Prefer Gemini when key is set; else Groq; else OpenAI (versioned ID for free tier)
    const model = googleKey
      ? google("gemini-2.5-flash-lite")
      : groqKey
        ? groq("llama-3.3-70b-versatile")
        : openai("gpt-4o-mini");

    const result = streamText({
      model,
      system,
      messages: await convertToModelMessages(messages),
      onChunk: () => {
        if (firstTokenTime == null) firstTokenTime = Date.now();
      },
      onFinish: () => {
        const firstTokenMs = firstTokenTime != null ? firstTokenTime - startTime : null;
        if (firstTokenMs != null) {
          console.log("[chat] first token ms:", firstTokenMs);
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("Chat error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Chat failed" }),
      { status: 500 }
    );
  }
}
