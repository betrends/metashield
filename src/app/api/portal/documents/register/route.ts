// Registers a document the signed-in client has just uploaded to their
// own Storage folder, after checking it on the server:
//  - the case belongs to this client (read through their RLS session)
//    and isn't cancelled,
//  - the storage path is inside "<user-id>/" (no other client's files),
//  - the stored object exists, and its real type and size (from Storage,
//    not from the browser) are an accepted format within the size limit.
// A file that fails these checks is removed from Storage and refused.
// Only then is the document row created and linked to the case.

import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { ACCEPTED_MIME_TYPES, DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from "@/lib/portal/workflow";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  let body: { caseId?: unknown; category?: unknown; storagePath?: unknown; name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  const category = typeof body.category === "string" ? body.category : "";
  const storagePath = typeof body.storagePath === "string" ? body.storagePath : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
  if (!caseId || !name || !DOCUMENT_TYPES.some((d) => d.value === category)) {
    return NextResponse.json({ error: "invalid_input", message: "Missing case, file name or document type." }, { status: 400 });
  }
  if (!storagePath.startsWith(`${user.id}/`) || storagePath.includes("..")) {
    return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  }

  const { data: ownCase } = await supabase.from("cases").select("id, cancelled_at").eq("id", caseId).maybeSingle();
  if (!ownCase) return NextResponse.json({ error: "case_not_found" }, { status: 404 });
  if (ownCase.cancelled_at) return NextResponse.json({ error: "case_cancelled" }, { status: 409 });

  const admin = createAdminClient();
  const folder = storagePath.slice(0, storagePath.lastIndexOf("/"));
  const fileName = storagePath.slice(storagePath.lastIndexOf("/") + 1);
  const { data: listing, error: listError } = await admin.storage
    .from("documents")
    .list(folder, { search: fileName, limit: 10 });
  if (listError) {
    console.error("Document register: storage lookup failed:", listError);
    return NextResponse.json({ error: "storage_unavailable", message: "Couldn't check the upload — please retry." }, { status: 503 });
  }
  const object = (listing ?? []).find((o) => o.name === fileName);
  if (!object) {
    return NextResponse.json({ error: "file_missing", message: "The upload didn't finish — please retry." }, { status: 400 });
  }
  const meta = (object.metadata ?? {}) as { size?: number; mimetype?: string };
  const size = Number(meta.size ?? 0);
  const mime = String(meta.mimetype ?? "");
  const problem = !ACCEPTED_MIME_TYPES[mime]
    ? "Only PDF, JPG, PNG, WEBP or HEIC files are accepted."
    : size <= 0
      ? "That file is empty."
      : size > MAX_DOCUMENT_BYTES
        ? "Files must be 10 MB or smaller."
        : null;
  if (problem) {
    await admin.storage.from("documents").remove([storagePath]);
    return NextResponse.json({ error: "invalid_file", message: problem }, { status: 400 });
  }

  // Idempotent: registering the same stored file twice returns the same row.
  const { data: existing } = await admin
    .from("documents")
    .select("id, name, category, size_bytes, storage_path, created_at, case_id, review_status, mime_type")
    .eq("storage_path", storagePath)
    .maybeSingle();
  if (existing) return NextResponse.json({ document: existing });

  const { data: doc, error } = await admin
    .from("documents")
    .insert({
      user_id: user.id,
      case_id: caseId,
      name,
      category,
      storage_path: storagePath,
      size_bytes: size,
      mime_type: mime,
      review_status: "submitted",
    })
    .select("id, name, category, size_bytes, storage_path, created_at, case_id, review_status, mime_type")
    .single();
  if (error || !doc) {
    console.error("Document register: insert failed:", error);
    return NextResponse.json({ error: "save_failed", message: "Couldn't save the document — please retry." }, { status: 500 });
  }
  return NextResponse.json({ document: doc });
}
