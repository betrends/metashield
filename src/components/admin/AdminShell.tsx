"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const adminNavItems = [
  { label: "Dashboard", href: "/admin", icon: "grid" },
  { label: "Recovery Requests", href: "/admin/cases", icon: "folder" },
  { label: "Clients", href: "/admin/clients", icon: "users" },
  { label: "Documents", href: "/admin/documents", icon: "doc" },
  { label: "Agents", href: "/admin/agents", icon: "headset" },
  { label: "Appeals", href: "/admin/appeals", icon: "flag" },
  { label: "Payments", href: "/admin/payments", icon: "card" },
  { label: "Subscriptions", href: "/admin/subscriptions", icon: "repeat" },
  { label: "Reports", href: "/admin/reports", icon: "chart" },
  { label: "Messages", href: "/admin/messages", icon: "mail" },
  { label: "Support Tickets", href: "/admin/support", icon: "ticket" },
  { label: "Settings", href: "/admin/settings", icon: "gear" },
];

const agentNavItems = [
  { label: "My Cases", href: "/admin/cases", icon: "folder" },
  { label: "Messages", href: "/admin/messages", icon: "mail" },
  { label: "Documents", href: "/admin/documents", icon: "doc" },
];

function NavIcon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none" } as const;
  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      );
    case "card":
      return (
        <svg {...common}>
          <rect x="3" y="5.5" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M3 9.5h18" stroke="currentColor" strokeWidth="1.7" />
          <path d="M6.5 14.5h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
          <path d="M3 20c.8-3.2 3.3-5 6-5s5.2 1.8 6 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M15.5 5.5a3 3 0 0 1 0 5.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M17 15c2.3.4 4 1.9 4.5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "folder":
      return (
        <svg {...common}>
          <path
            d="M4 7a1 1 0 0 1 1-1h4l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "headset":
      return (
        <svg {...common}>
          <path
            d="M4 13v-1a8 8 0 0 1 16 0v1"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <rect x="3" y="13" width="4" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
          <rect x="17" y="13" width="4" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
          <path d="M19 19v1a2 2 0 0 1-2 2h-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "flag":
      return (
        <svg {...common}>
          <path d="M5 3v18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path
            d="M5 4h11l-2.5 3.5L16 11H5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "repeat":
      return (
        <svg {...common}>
          <path
            d="M4 12a8 8 0 0 1 13.7-5.7L20 8M20 4v4h-4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20 12a8 8 0 0 1-13.7 5.7L4 16M4 20v-4h4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M4 20V10M11 20V4M18 20v-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M3 20h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "mail":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <path d="m4 6.5 8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "ticket":
      return (
        <svg {...common}>
          <path
            d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path d="M10 6v12" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
        </svg>
      );
    case "gear":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      );
    case "doc":
      return (
        <svg {...common}>
          <path
            d="M8 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7l-4-4Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path d="M12 3v4h4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M9 13h6M9 17h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

type RoleInfo =
  | { type: "admin"; email: string }
  | { type: "agent"; email: string; agentName: string };

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "authorized" | "denied">("loading");
  const [roleInfo, setRoleInfo] = useState<RoleInfo | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      let supabase;
      try {
        supabase = createClient();
      } catch {
        router.replace("/portal/login?next=/admin");
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        router.replace("/portal/login?next=/admin");
        return;
      }
      // Server-side role check: handles admin email + agents table lookup
      const res = await fetch("/api/admin/me");
      if (cancelled) return;
      if (!res.ok) {
        setStatus("denied");
        return;
      }
      const { role } = await res.json();
      if (role.type === "agent") {
        setRoleInfo({ type: "agent", email: user.email ?? "", agentName: role.agentName });
        // Agents have no dashboard — send them straight to their cases
        if (pathname === "/admin" || pathname === "/admin/") {
          router.replace("/admin/cases");
          return;
        }
        // Block agent-only pages they shouldn't access
        const agentAllowed = ["/admin/cases", "/admin/messages", "/admin/documents"];
        if (!agentAllowed.some((p) => pathname.startsWith(p))) {
          router.replace("/admin/cases");
          return;
        }
      } else {
        setRoleInfo({ type: "admin", email: user.email ?? "" });
      }
      setStatus("authorized");
    }
    check();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Not configured — nothing to sign out of.
    }
    router.push("/portal/login");
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <p className="text-sm text-ink-400">Loading…</p>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-50 px-4 text-center">
        <div className="rounded-2xl border border-ink-100 bg-white p-8 shadow-sm max-w-sm w-full">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-risk-high-bg">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v4M12 17h.01" stroke="var(--color-risk-high)" strokeWidth="2" strokeLinecap="round"/>
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="var(--color-risk-high)" strokeWidth="1.7" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-ink-900">This account doesn&apos;t have admin access.</p>
          <p className="mt-1 text-xs text-ink-500">Log in with your admin or agent credentials to continue.</p>
          <button
            onClick={async () => {
              try { const s = createClient(); await s.auth.signOut(); } catch {}
              router.replace("/portal/login?next=/admin");
            }}
            className="mt-5 w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Switch account &amp; log in
          </button>
          <Link href="/portal" className="mt-3 block text-sm text-ink-400 hover:text-ink-700">
            Back to client portal
          </Link>
        </div>
      </div>
    );
  }

  const isAgent = roleInfo?.type === "agent";
  const displayName = isAgent ? (roleInfo as { type: "agent"; agentName: string }).agentName : (roleInfo?.email ?? "");
  const initials = displayName ? displayName[0].toUpperCase() : "A";
  const navItems = isAgent ? agentNavItems : adminNavItems;

  return (
    <div className="min-h-screen bg-ink-50 text-ink-900">
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-ink-100 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 9.5 4.6-.6 8-4.4 8-9.5V6l-8-3.5Z"
                fill="currentColor"
                fillOpacity="0.18"
              />
              <path
                d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 9.5 4.6-.6 8-4.4 8-9.5V6l-8-3.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-sm font-semibold text-ink-900">MetaShield Admin Portal</span>
        </div>
        <button
          onClick={() => setMobileNavOpen((v) => !v)}
          aria-label="Toggle menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Desktop top bar with notification bell */}
      <div className="hidden border-b border-ink-100 bg-white lg:block">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-8 py-3">
          <div className="text-sm text-ink-500">Admin Portal</div>
          <button className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-50 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="19" cy="5" r="2.5" fill="currentColor" />
              <path d="M10.5 19a1.5 1.5 0 1 0 3 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1600px]">
        <aside
          className={`sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-ink-100 bg-white px-4 py-6 lg:flex ${
            mobileNavOpen ? "flex" : "hidden"
          }`}
        >
          <Link href="/admin" className="hidden items-center gap-2 px-2 lg:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 9.5 4.6-.6 8-4.4 8-9.5V6l-8-3.5Z"
                  fill="currentColor"
                  fillOpacity="0.18"
                />
                <path
                  d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 9.5 4.6-.6 8-4.4 8-9.5V6l-8-3.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-900">MetaShield</p>
              <p className="text-[11px] text-ink-400">Admin Portal</p>
            </div>
          </Link>

          <nav className="mt-8 flex-1 space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active ? "bg-brand-600 text-white shadow-sm" : "text-ink-500 hover:bg-ink-50 hover:text-ink-900"
                  }`}
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-ink-100 pt-4">
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-900">{displayName}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">
                  {isAgent ? "Agent" : "Super Admin"}
                </p>
              </div>
            </div>
            <div className="mt-2 flex flex-col gap-1">
              {!isAgent && (
                <Link
                  href="/portal"
                  className="rounded-xl px-3 py-2 text-sm text-ink-500 hover:bg-ink-50 hover:text-ink-900"
                >
                  ← Your client portal
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="rounded-xl px-3 py-2 text-left text-sm text-ink-500 hover:bg-ink-50 hover:text-risk-high"
              >
                Log out
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
