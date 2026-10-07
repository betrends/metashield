// Shared logic for src/proxy.ts (Next.js 16 renamed middleware.ts to
// proxy.ts — see AGENTS.md). Refreshes the Supabase auth session cookie on
// every request so it doesn't expire mid-visit.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Not configured yet — nothing to refresh, let the request through as-is
  // rather than crashing every page load.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Touches the session so Supabase refreshes an expiring token; the
  // resulting user isn't used here — page-level checks handle redirects.
  await supabase.auth.getUser();

  return response;
}
