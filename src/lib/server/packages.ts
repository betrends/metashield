// Server-side package lookups (service-role client).

import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlan, isPlanId, packageCovers, type Plan } from "@/lib/portal/billing";

export type ActivePackage = { plan: Plan; subscriptionId: string; endsOn: string | null };

// The client's package, if it is active and its paid period hasn't ended.
// Only the current packages count (old Account Protection plans never
// included free recovery).
export async function activePackageFor(admin: SupabaseClient, userId: string): Promise<ActivePackage | null> {
  const { data } = await admin
    .from("subscriptions")
    .select("id, plan_id, status, renews_on")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!data || !isPlanId(data.plan_id)) return null;
  if (data.renews_on && new Date(data.renews_on).getTime() < Date.now() - 24 * 60 * 60 * 1000) return null;
  return { plan: getPlan(data.plan_id), subscriptionId: data.id as string, endsOn: (data.renews_on as string | null) ?? null };
}

// The package that covers a new recovery case on this platform, if any.
export async function coveringPackage(admin: SupabaseClient, userId: string, platform: string): Promise<ActivePackage | null> {
  const pkg = await activePackageFor(admin, userId);
  return pkg && packageCovers(pkg.plan, platform) ? pkg : null;
}
