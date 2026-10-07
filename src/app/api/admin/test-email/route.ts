import { NextResponse } from "next/server";
import { getAdminRole } from "@/lib/admin/auth";

export async function GET() {
  const role = await getAdminRole();
  if (!role || role.type !== "admin") {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL;
  const toAddress = process.env.ADMIN_EMAIL;

  if (!apiKey) return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  if (!fromAddress) return NextResponse.json({ error: "RESEND_FROM_EMAIL not set" }, { status: 500 });
  if (!toAddress) return NextResponse.json({ error: "ADMIN_EMAIL not set" }, { status: 500 });

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: fromAddress,
      to: toAddress,
      subject: "MetaShield — Email test",
      html: "<p>If you see this, Resend is working correctly from <strong>metashield.online</strong>.</p>",
    });
    return NextResponse.json({ ok: true, from: fromAddress, to: toAddress, result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
