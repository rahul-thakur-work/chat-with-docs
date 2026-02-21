import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listChats, saveChat } from "@/lib/chat-storage";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to list chats" }, { status: 401 });
  }
  const chats = await listChats(userId);
  return NextResponse.json({ chats: chats.sort((a, b) => b.updatedAt - a.updatedAt) });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to save chats" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { chatId, title, messages } = body as { chatId: string; title?: string; messages: unknown[] };
    if (!chatId || !Array.isArray(messages)) {
      return NextResponse.json({ error: "chatId and messages required" }, { status: 400 });
    }
    const firstUser = messages.find((m: { role?: string }) => m.role === "user") as { parts?: { type?: string; text?: string }[] } | undefined;
    const firstText = firstUser?.parts?.find((p) => p.type === "text")?.text;
    const titleToUse = title || (firstText ? String(firstText).slice(0, 80) : "Chat");
    await saveChat(userId, chatId, titleToUse, messages);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Save chat error:", e);
    return NextResponse.json({ error: "Failed to save chat" }, { status: 500 });
  }
}
