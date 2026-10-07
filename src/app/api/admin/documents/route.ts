import { createAdminClient } from "@/lib/supabase/server";
import { getAdminRole } from "@/lib/admin/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const role = await getAdminRole();
    if (!role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminClient = createAdminClient();

    let caseIds: string[] | null = null;

    if (role.type === "agent") {
      // Agents only see documents for their assigned cases
      const { data: cases } = await adminClient
        .from("cases")
        .select("id")
        .eq("agent_id", role.agentId);
      caseIds = (cases ?? []).map((c: { id: string }) => c.id);
    }

    let query = adminClient
      .from("documents")
      .select("id, filename, category, size, created_at, user_email, user_name, case_id")
      .order("created_at", { ascending: false });

    if (caseIds !== null) {
      if (caseIds.length === 0) {
        return NextResponse.json({ documents: [] });
      }
      query = query.in("case_id", caseIds);
    }

    const { data: documents, error } = await query;

    if (error) {
      console.error("Error fetching documents:", error);
      return NextResponse.json({ documents: [] });
    }

    const formattedDocs = (documents || []).map((doc: any) => ({
      id: doc.id,
      filename: doc.filename,
      category: doc.category,
      size: doc.size || 0,
      uploadedAt: doc.created_at,
      clientEmail: doc.user_email,
      clientName: doc.user_name || doc.user_email?.split("@")[0] || "Unknown",
    }));

    return NextResponse.json({ documents: formattedDocs });
  } catch (error) {
    console.error("Error in admin documents route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
