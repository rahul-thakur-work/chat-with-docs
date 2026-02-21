import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PDFParse } from "pdf-parse";
import { saveDoc } from "@/lib/docs";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["application/pdf", "text/plain", "text/markdown"];
const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".md", ".markdown"];

function hasAllowedExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

async function extractTextFromFile(file: File, buffer: Buffer): Promise<string> {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (type === "text/plain" || type === "text/markdown" || name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".markdown")) {
    return buffer.toString("utf-8").trim();
  }
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();
  return (result?.text ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Sign in to upload documents" }, { status: 401 });
    }
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type) && !hasAllowedExtension(file.name)) {
      return NextResponse.json(
        { error: "Supported: PDF, .txt, .md" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 10 MB)" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromFile(file, buffer);

    if (!text) {
      return NextResponse.json(
        { error: "No text could be extracted from the file" },
        { status: 400 }
      );
    }

    const docId = randomUUID();
    const doc = await saveDoc(docId, file.name, text, userId);

    return NextResponse.json({
      docId,
      filename: doc.filename,
      chunksCount: doc.chunks.length,
      preview: text.slice(0, 200) + (text.length > 200 ? "…" : ""),
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
