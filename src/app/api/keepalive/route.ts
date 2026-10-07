import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Called by Vercel Cron every 3 days to prevent the Supabase free-tier
// project from pausing due to inactivity (pauses after 7 days idle).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("cases").select("id").limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    console.error("[keepalive] Supabase ping failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
