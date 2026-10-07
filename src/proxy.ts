// Next.js 16 renamed middleware.ts → proxy.ts (see AGENTS.md). Runs on
// every matched request to keep the Supabase auth session cookie fresh.

import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets and image optimization so those keep loading
    // fast without going through the session-refresh logic.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
