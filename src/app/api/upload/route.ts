import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import * as pdfjsLib from "pdfjs-dist";
import { saveDoc } from "@/lib/docs";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Allow CORS preflight (OPTIONS) so POST from same or other origins works. */
export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: "POST, OPTIONS" } });
}

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

  // For PDF files, use pdfjs-dist
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str).join("") + "\n";
  }

  return text.trim();
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
    let text: string;

    try {
      text = await extractTextFromFile(file, buffer);
    } catch (parseErr) {
      console.error("Parse error:", parseErr);
      return NextResponse.json(
        {
          error:
            parseErr instanceof Error
              ? parseErr.message
              : "Could not read the file. The PDF may be invalid, corrupted, or password-protected.",
        },
        { status: 400 }
      );
    }

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
