"use client";

import { markTeamMessagesRead } from "@/lib/portal/data";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { brandName } from "@/lib/site-config";
import { createClient } from "@/lib/supabase/client";
import { AskAIBar } from "@/components/portal/AskAIBar";
import { ContactSupportMenu } from "@/components/portal/ContactSupportMenu";
import { EmergencyModal } from "@/components/portal/EmergencyModal";
import { BrandLoader } from "@/components/BrandLoader";

type PortalSession = { id: string; name: string; email: string };
// Any package (current or an older plan) includes the emergency button.
const EMERGENCY_PLANS = ["watch", "elite", "annual", "lifetime", "basic", "professional", "business", "one_time"];

const seenKey = (userId: string) => `metashield:notifications-seen:${userId}`;
function readSeenAt(userId: string): number {
  try {
    return Number(window.localStorage.getItem(seenKey(userId)) ?? 0) || 0;
  } catch {
    return 0;
  }
}
function markNotificationsSeen(userId: string) {
  try {
    window.localStorage.setItem(seenKey(userId), String(Date.now()));
  } catch {
    // Storage unavailable (private mode) — the badge just won't persist.
  }
}

const navItems = [
  { label: "Overview", href: "/portal", icon: "grid" },
  { label: "AI Assistant", href: "/portal/assistant", icon: "sparkles" },
  { label: "My Accounts", href: "/portal/accounts", icon: "user" },
  { label: "Cases", href: "/portal/cases", icon: "folder" },
  { label: "Messages", href: "/portal/messages", icon: "chat" },
  { label: "Documents", href: "/portal/documents", icon: "doc" },
  { label: "Packages", href: "/portal/billing", icon: "card" },
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
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M5 20c1-3.5 4-5 7-5s6 1.5 7 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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
    case "chat":
      return (
        <svg {...common}>
          <path
            d="M4 5h16v11H8l-4 4V5Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "doc":
      return (
        <svg {...common}>
          <path
            d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
      );
    case "sparkles":
      return (
        <svg {...common}>
          <path
            d="M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M17.7 17.7l1.4 1.4M6.3 17.7l-1.4 1.4M17.7 6.3l1.4-1.4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
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
    case "admin":
      return (
        <svg {...common}>
          <path
            d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 9.5 4.6-.6 8-4.4 8-9.5V6l-8-3.5Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path d="m8.5 12.2 2.4 2.4 4.6-4.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "support":
      return (
        <svg {...common}>
          <path
            d="M4 13v-1a8 8 0 0 1 16 0v1"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <rect x="3" y="13" width="4.5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
          <rect x="16.5" y="13" width="4.5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
          <path d="M18 19v.5a2.5 2.5 0 0 1-2.5 2.5H13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/portal/login";

  const [session, setSession] = useState<PortalSession | null | "loading">("loading");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [hasEmergency, setHasEmergency] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; sender: string; message: string; created_at: string; is_read: boolean }>>([]);

  useEffect(() => {
    if (isLoginPage) return;

    let cancelled = false;

    async function loadSession() {
      let supabase;
      try {
        supabase = createClient();
      } catch {
        // Supabase isn't configured yet — nothing to check against, so
        // send them to login where that gets explained.
        router.replace("/portal/login");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        router.replace("/portal/login");
        return;
      }

      setSession({
        id: user.id,
        name: (user.user_metadata?.full_name as string | undefined) || user.email?.split("@")[0] || "Client",
        email: user.email ?? "",
      });
    }

    loadSession();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoginPage, pathname]);

  // Check if this user has an emergency-eligible subscription
  useEffect(() => {
    if (isLoginPage || session === "loading" || session === null) return;
    createClient()
      .from("subscriptions")
      .select("plan_id")
      .eq("status", "active")
      .maybeSingle()
      .then(({ data }) => {
        if (data && EMERGENCY_PLANS.includes(data.plan_id)) {
          setHasEmergency(true);
        }
      });
  }, [session, isLoginPage]);

  // Fetch unread messages and count with real-time + polling
  useEffect(() => {
    if (isLoginPage || session === "loading" || session === null) return;

    const sessionUserId = session.id;
    let cancelled = false;
    let pollInterval: NodeJS.Timeout | null = null;

    // Notifications are the team's messages to this client; unread =
    // read_at not set (marked read when the client opens the bell or
    // Messages). Falls back to the per-browser "last opened" time for
    // databases without the read_at column.
    async function fetchNotifications() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("user_id", sessionUserId)
          .eq("from_role", "team")
          .order("created_at", { ascending: false })
          .limit(20);

        if (!cancelled && !error && data) {
          const seenAt = readSeenAt(sessionUserId);
          const mappedData = (
            data as { id: string; author_name: string; body: string; created_at: string; read_at?: string | null }[]
          ).map((m) => ({
            id: m.id,
            sender: m.author_name,
            message: m.body,
            created_at: m.created_at,
            is_read: m.read_at !== undefined ? !!m.read_at : new Date(m.created_at).getTime() <= seenAt,
          }));
          setNotifications(mappedData);
          setUnreadCount(mappedData.filter((m) => !m.is_read).length);
        }
      } catch {
        // Non-fatal: the bell just stays empty.
      }
    }

    fetchNotifications();

    // Real-time subscription
    let channel: any;
    try {
      const supabase = createClient();
      channel = supabase
        .channel(`messages:${sessionUserId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
            filter: `user_id=eq.${sessionUserId}`,
          },
          () => {
            // Refetch when messages change
            if (!cancelled) fetchNotifications();
          }
        )
        .subscribe();
    } catch {
      // Fallback to polling if real-time fails
    }

    // Polling fallback - check every 5 seconds for new messages
    pollInterval = setInterval(() => {
      if (!cancelled) fetchNotifications();
    }, 5000);

    return () => {
      cancelled = true;
      if (channel) channel.unsubscribe();
      if (pollInterval) clearInterval(pollInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isLoginPage]);

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-brand-glow flex items-center justify-center px-4 py-12">
        {children}
      </div>
    );
  }

  if (session === "loading" || session === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <BrandLoader size="page" label="Loading your dashboard…" />
      </div>
    );
  }

  async function handleLogout() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Not configured — nothing to sign out of.
    }
    router.push("/portal/login");
  }

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Desktop top header with email & notification bell */}
      <div className="hidden border-b border-ink-100 bg-white lg:block">
        <style>{`
          @keyframes bellBounce {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
          }
          .bell-bouncing {
            animation: bellBounce 1s infinite;
          }
        `}</style>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-4">
          <p className="text-sm text-ink-500">{session.email}</p>
          <div className="relative">
            <button
              onClick={() => {
                if (!notificationsOpen) {
                  markNotificationsSeen(session.id);
                  void markTeamMessagesRead();
                  setUnreadCount(0);
                }
                setNotificationsOpen(!notificationsOpen);
              }}
              className={`relative flex h-12 w-12 items-center justify-center rounded-xl text-ink-600 transition-all hover:bg-brand-50 hover:text-brand-600 active:scale-95 ${
                unreadCount > 0 ? "bell-bouncing text-brand-600" : ""
              }`}
              title={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="19" cy="5" r="3" fill="currentColor" />
                <path d="M10.5 19a1.5 1.5 0 1 0 3 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-risk-high text-xs font-bold text-white shadow-lg">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 top-14 w-96 rounded-2xl border border-ink-100 bg-white shadow-xl z-50">
                <div className="border-b border-ink-100 bg-ink-50 px-4 py-3 rounded-t-2xl">
                  <h3 className="font-semibold text-ink-900">Notifications {unreadCount > 0 && `(${unreadCount} new)`}</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`border-b border-ink-50 px-4 py-3 transition-colors ${
                          !notif.is_read ? "bg-brand-50" : ""
                        } hover:bg-ink-50`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-ink-900">{notif.sender}</p>
                            <p className="mt-1 text-sm text-ink-600 line-clamp-2">{notif.message}</p>
                          </div>
                          {!notif.is_read && (
                            <div className="ml-2 mt-0.5 h-2.5 w-2.5 rounded-full bg-brand-600 flex-shrink-0" />
                          )}
                        </div>
                        <p className="mt-1.5 text-xs text-ink-400">
                          {new Date(notif.created_at).toLocaleDateString()} {new Date(notif.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-ink-500">No notifications yet</p>
                    </div>
                  )}
                </div>
                <div className="border-t border-ink-100 bg-ink-50 px-4 py-2 rounded-b-2xl text-center">
                  <Link href="/portal/messages" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                    View all messages →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-ink-100 bg-white px-4 py-3 lg:hidden">
        <Link href="/portal" className="flex items-center gap-2">
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
          <span className="text-sm font-semibold text-ink-900">{brandName} Portal</span>
        </Link>
        <button
          onClick={() => setMobileNavOpen((v) => !v)}
          aria-label="Toggle menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-50"
        >
          {mobileNavOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile sidebar backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar — fixed overlay on mobile, in-flow on desktop */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 overflow-y-auto border-r border-ink-100 bg-white px-4 py-6 transition-transform lg:relative lg:inset-auto lg:z-auto lg:w-64 lg:translate-x-0 lg:overflow-visible lg:transition-none ${
            mobileNavOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
          } lg:block`}
        >
          <Link href="/portal" className="hidden items-center gap-2 px-2 lg:flex">
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
            <span className="text-sm font-semibold text-ink-900">{brandName} Portal</span>
          </Link>

          <nav className="mt-2 space-y-1 lg:mt-8">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                  }`}
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                </Link>
              );
            })}
            {session.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL ? (
              <Link
                href="/admin"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900"
              >
                <NavIcon name="admin" />
                Admin Dashboard
              </Link>
            ) : null}
            <ContactSupportMenu />
            {hasEmergency && (
              <button
                onClick={() => { setEmergencyOpen(true); setMobileNavOpen(false); }}
                className="mt-2 flex w-full items-center gap-3 rounded-xl bg-risk-high px-3 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                  <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Emergency
              </button>
            )}
          </nav>

          <div className="mt-8 border-t border-ink-100 pt-4">
            <div className="px-3">
              <p className="text-sm font-medium text-ink-900">{session.name}</p>
              <p className="mt-0.5 truncate text-xs text-ink-400">{session.email}</p>
            </div>
            <div className="mt-3 flex flex-col gap-1">
              <Link
                href="/"
                className="rounded-xl px-3 py-2 text-sm text-ink-500 hover:bg-ink-50 hover:text-ink-800"
              >
                ← Back to main site
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-xl px-3 py-2 text-left text-sm text-ink-500 hover:bg-ink-50 hover:text-risk-high"
              >
                Log out
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 px-4 py-8 pb-32 sm:px-8 sm:py-10 sm:pb-36">
          {children}
        </main>
      </div>

      <AskAIBar />
      {emergencyOpen && <EmergencyModal onClose={() => setEmergencyOpen(false)} />}
    </div>
  );
}
