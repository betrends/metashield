import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "no_file" }, { status: 400 });

    // Public, unauthenticated endpoint writing to a public bucket: accept
    // only images, cap the size, and never trust the caller's file name
    // or content type (an uploaded .html file would be served as a page).
    const ext = ALLOWED_IMAGE_TYPES[file.type];
    if (!ext) return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "file_too_large" }, { status: 413 });
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const admin = createAdminClient();
    const { error } = await admin.storage
      .from("screenshots")
      .upload(filename, buffer, { contentType: file.type, upsert: false });

    if (error) {
      console.error("Storage upload error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: urlData } = admin.storage.from("screenshots").getPublicUrl(filename);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
