import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getChat } from "@/lib/chat-storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to load chat" }, { status: 401 });
  }
  const { chatId } = await params;
  const chat = await getChat(userId, chatId);
  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }
  return NextResponse.json({ chat: { id: chat.id, title: chat.title, messages: chat.messages, updatedAt: chat.updatedAt } });
}
