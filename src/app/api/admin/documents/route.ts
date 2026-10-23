// Client documents for the admin/agent Documents page. The admin sees
// every document; an agent sees documents linked to their cases, plus
// unlinked documents (uploaded before documents had a case_id) from
// clients whose cases they handle.
//
// Previously this selected columns that don't exist on public.documents
// (filename, size, user_email, user_name), so every query failed and the
// page always showed "No documents uploaded yet".

import { createAdminClient } from "@/lib/supabase/server";
import { getAdminRole } from "@/lib/admin/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type DocumentRow = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  size_bytes: number | null;
  storage_path: string | null;
  created_at: string;
  case_id?: string | null;
};

type CaseRow = { id: string; title: string; user_id: string; agent_id: string | null };
type ProfileRow = { id: string; full_name: string | null; email: string | null };

export async function GET() {
  try {
    const role = await getAdminRole();
    if (!role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminClient = createAdminClient();

    // Works before and after migration 010 (which adds documents.case_id).
    async function selectDocuments(withCaseId: boolean) {
      return adminClient
        .from("documents")
        .select(
          withCaseId
            ? "id, user_id, name, category, size_bytes, storage_path, created_at, case_id"
            : "id, user_id, name, category, size_bytes, storage_path, created_at"
        )
        .order("created_at", { ascending: false });
    }
    let { data, error } = await selectDocuments(true);
    if (error) ({ data, error } = await selectDocuments(false));
    if (error) {
      console.error("Error fetching documents:", error);
      return NextResponse.json({ error: "query_failed" }, { status: 500 });
    }
    let documents = (data ?? []) as unknown as DocumentRow[];

    const { data: caseRows } = await adminClient
      .from("cases")
      .select("id, title, user_id, agent_id");
    const cases = (caseRows ?? []) as CaseRow[];
    const caseById = new Map<string, CaseRow>(cases.map((c) => [c.id, c]));

    if (role.type === "agent") {
      const myCases = cases.filter((c) => c.agent_id === role.agentId);
      const myCaseIds = new Set(myCases.map((c) => c.id));
      const myClientIds = new Set(myCases.map((c) => c.user_id));
      documents = documents.filter((d) =>
        d.case_id ? myCaseIds.has(d.case_id) : myClientIds.has(d.user_id)
      );
    }

    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, full_name, email")
      .in("id", Array.from(new Set(documents.map((d) => d.user_id))));
    const profileById = new Map<string, ProfileRow>(
      ((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p])
    );

    const formattedDocs = await Promise.all(
      documents.map(async (doc) => {
        const profile = profileById.get(doc.user_id);
        let url: string | undefined;
        if (doc.storage_path) {
          const { data: signed } = await adminClient.storage
            .from("documents")
            .createSignedUrl(doc.storage_path, 60 * 10); // 10 minutes
          url = signed?.signedUrl ?? undefined;
        }
        const caseRow = doc.case_id ? caseById.get(doc.case_id) : undefined;
        return {
          id: doc.id,
          filename: doc.name,
          category: doc.category,
          size: doc.size_bytes || 0,
          uploadedAt: doc.created_at,
          clientEmail: profile?.email ?? "",
          clientName: profile?.full_name || profile?.email?.split("@")[0] || "Unknown",
          caseId: doc.case_id ?? null,
          caseTitle: caseRow?.title ?? null,
          url,
        };
      })
    );

    return NextResponse.json({ documents: formattedDocs });
  } catch (error) {
    console.error("Error in admin documents route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
