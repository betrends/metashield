"use client";

// Agent dashboard: what needs the agent now, what's waiting on the client,
// their pipeline and recent activity — all from their own assigned cases.
// The admin can open it for any agent (?agent=<id>) to see what they see.

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandLoader } from "@/components/BrandLoader";
import { AgentDashboardScreen, type AgentDashboardPayload } from "@/components/admin/AgentDashboardScreen";

export default function AgentDashboardPage() {
  return (
    <Suspense fallback={<BrandLoader size="page" />}>
      <AgentDashboardView />
    </Suspense>
  );
}

function AgentDashboardView() {
  const router = useRouter();
  const params = useSearchParams();
  const agentParam = params.get("agent");
  const [data, setData] = useState<AgentDashboardPayload | "loading" | "error">("loading");
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/agent-dashboard${agentParam ? `?agent=${encodeURIComponent(agentParam)}` : ""}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
      setNow(Date.now());
    } catch {
      setData((prev) => (prev === "loading" ? "error" : prev));
    }
  }, [agentParam]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const interval = setInterval(load, 30_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  if (data === "loading") return <BrandLoader size="page" label="Loading your dashboard…" />;
  if (data === "error") {
    return (
      <div className="rounded-2xl border border-ink-100 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-ink-900">Couldn&apos;t load the dashboard.</p>
        <button onClick={load} className="mt-3 text-sm font-semibold text-brand-700 hover:underline">
          Try again
        </button>
      </div>
    );
  }
  return <AgentDashboardScreen data={data} now={now} onSwitchAgent={() => router.push("/admin/agent-dashboard")} />;
}
