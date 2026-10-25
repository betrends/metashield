// One-click unsubscribe from MetaShield follow-up emails (link in the
// email footer). Case-update emails about an active case are unaffected.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyUnsubscribeToken } from "@/lib/server/unsubscribe";

function page(title: string, text: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:64px auto;padding:0 16px;color:#1e293b">
<h1 style="font-size:20px">${title}</h1><p style="color:#475569;line-height:1.6">${text}</p>
<p><a href="/" style="color:#6d28d9">Back to MetaShield</a></p></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = (url.searchParams.get("e") ?? "").trim().toLowerCase();
  const token = url.searchParams.get("t") ?? "";
  if (!verifyUnsubscribeToken(email, token)) {
    return page("Link not valid", "This unsubscribe link isn't valid. Please use the link from the email.", 400);
  }
  const admin = createAdminClient();
  const { error } = await admin.from("email_unsubscribes").upsert({ email }, { onConflict: "email", ignoreDuplicates: true });
  if (error) {
    console.error("Unsubscribe failed:", error);
    return page("Something went wrong", "We couldn't update your preferences — please try again later.", 500);
  }
  return page("You're unsubscribed", "You won't receive follow-up emails from MetaShield any more.");
}
