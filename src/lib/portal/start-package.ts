"use client";

// "Get this package": takes the client to Korapay's payment page.
//   - signed in            → straight to Korapay
//   - not signed in        → sign in (or create an account), then straight on
//                            to Korapay (via /portal/billing?plan=…&pay=1)
//   - card payment not set up → WhatsApp, so nobody hits a dead end

import { contact } from "@/lib/site-config";
import { packageWhatsAppText, type Plan } from "@/lib/portal/billing";

const PENDING_KEY = "ms-pending-package";

export function packageWhatsAppUrl(plan: Plan): string {
  return `${contact.whatsapp}?text=${encodeURIComponent(packageWhatsAppText(plan))}`;
}

export function payAfterSignInPath(planId: string): string {
  return `/portal/billing?plan=${encodeURIComponent(planId)}&pay=1`;
}

// Remember the chosen package across sign-up + email confirmation (which
// can't carry the ?next= link), for up to a day.
export function rememberPendingPackage(planId: string) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ planId, at: Date.now() }));
  } catch {
    // Storage blocked — the client can pick the package again.
  }
}

export function takePendingPackage(): string | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    localStorage.removeItem(PENDING_KEY);
    const saved = raw ? (JSON.parse(raw) as { planId?: string; at?: number }) : null;
    if (saved?.planId && saved.at && Date.now() - saved.at < 24 * 60 * 60 * 1000) return saved.planId;
  } catch {
    // ignore
  }
  return null;
}

export function forgetPendingPackage() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
}

// Returns an error message to show, or null when the page is moving on
// (to Korapay, sign-in or WhatsApp).
export async function startPackageCheckout(plan: Plan): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.id }),
    });
  } catch {
    return "We couldn't reach the payment page. Check your internet connection and try again.";
  }
  const data = (await res.json().catch(() => ({}))) as { checkoutUrl?: string; error?: string };

  if (res.ok && data.checkoutUrl) {
    forgetPendingPackage();
    window.location.href = data.checkoutUrl;
    return null;
  }
  if (res.status === 401) {
    rememberPendingPackage(String(plan.id));
    window.location.href = `/portal/login?next=${encodeURIComponent(payAfterSignInPath(String(plan.id)))}`;
    return null;
  }
  if (res.status === 503) {
    window.location.href = packageWhatsAppUrl(plan);
    return null;
  }
  return "We couldn't open the payment page. Please try again in a moment, or get this package on WhatsApp.";
}
