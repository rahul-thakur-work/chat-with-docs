import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { storageListDocs } from "@/lib/storage";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to list documents" }, { status: 401 });
  }
  const docs = await storageListDocs(userId);
  return NextResponse.json({ documents: docs });
}
