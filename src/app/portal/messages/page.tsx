"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  MESSAGE_PAGE_SIZE,
  fetchCases,
  fetchMessages,
  getFileUrl,
  markTeamMessagesRead,
  sendMessage,
  type PortalMessage,
} from "@/lib/portal/data";
import { InlineRecoveryForm } from "@/components/portal/InlineRecoveryForm";
import { CallButton } from "@/components/CallButton";
import { contact } from "@/lib/site-config";

// A message the client has sent that hasn't been confirmed by the server
// yet. `key` is reused on retry so the server stores it only once.
type Outgoing = { key: string; body: string; file: File | null; caseId: string | null; status: "sending" | "failed"; error?: string };

function mergeById(a: PortalMessage[], b: PortalMessage[]) {
  const map = new Map<string, PortalMessage>();
  for (const m of [...a, ...b]) map.set(m.id, m);
  return Array.from(map.values()).sort((x, y) => x.createdAt.localeCompare(y.createdAt));
}

function fileSize(bytes?: number) {
  if (!bytes) return "";
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
import { createClient } from "@/lib/supabase/client";
import { BrandLoader } from "@/components/BrandLoader";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function TeamAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 9.5 4.6-.6 8-4.4 8-9.5V6l-8-3.5Z"
          fill="currentColor"
          fillOpacity="0.3"
        />
        <path
          d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 9.5 4.6-.6 8-4.4 8-9.5V6l-8-3.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function ClientAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 shadow-sm">
      {initials(name)}
    </div>
  );
}

export default function PortalMessagesPage() {
  const [messages, setMessages] = useState<PortalMessage[] | "loading" | "error">("loading");
  const [hasEarlier, setHasEarlier] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [outbox, setOutbox] = useState<Outgoing[]>([]);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const sending = outbox.some((o) => o.status === "sending");
  const [sendError, setSendError] = useState<string | null>(null);
  const [userName, setUserName] = useState("You");
  const scrollRef = useRef<HTMLDivElement>(null);
  // Who the Call button rings: the agent on this case (or the client's
  // newest open case); MetaShield's line until an agent is assigned.
  const [callee, setCallee] = useState<{ name: string; phone: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCases()
      .then((cases) => {
        if (cancelled) return;
        const wanted = new URLSearchParams(window.location.search).get("case");
        const live = cases.filter((c) => !c.cancelledAt);
        const chosen =
          live.find((c) => c.id === wanted) ??
          live.find((c) => c.stage !== "Resolved" && c.agentPhone) ??
          live.find((c) => c.agentPhone);
        setCallee(
          chosen?.agentPhone
            ? { name: chosen.agentName ? chosen.agentName.split(" ")[0] : "your agent", phone: chosen.agentPhone }
            : { name: "MetaShield", phone: contact.phone }
        );
      })
      .catch(() => {
        if (!cancelled) setCallee({ name: "MetaShield", phone: contact.phone });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (user) {
          const name =
            (user.user_metadata?.full_name as string | undefined) ||
            user.email?.split("@")[0] ||
            "You";
          setUserName(name);
        }
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let first = true;
    function load() {
      fetchMessages()
        .then((result) => {
          if (cancelled) return;
          if (first) setHasEarlier(result.length === MESSAGE_PAGE_SIZE);
          first = false;
          // Merge (keeps older pages already loaded); only replace the
          // state when something changed so polling doesn't re-scroll.
          setMessages((prev) => {
            const base = Array.isArray(prev) ? prev : [];
            const merged = mergeById(base, result);
            return Array.isArray(prev) &&
              merged.length === prev.length &&
              merged.every((m, i) => m.id === prev[i].id && m.readAt === prev[i].readAt)
              ? prev
              : merged;
          });
          // Opening Messages marks the team's messages as read.
          if (result.some((m) => m.from === "team" && !m.readAt)) void markTeamMessagesRead();
        })
        .catch(() => {
          if (!cancelled) setMessages((prev) => (Array.isArray(prev) ? prev : "error"));
        });
    }
    load();
    // Agent replies show up without a manual reload.
    const interval = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const lastId = Array.isArray(messages) ? messages[messages.length - 1]?.id : undefined;
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lastId, outbox.length]);

  async function loadEarlier() {
    if (!Array.isArray(messages) || messages.length === 0 || loadingEarlier) return;
    setLoadingEarlier(true);
    try {
      const older = await fetchMessages({ before: messages[0].createdAt });
      setHasEarlier(older.length === MESSAGE_PAGE_SIZE);
      setMessages((prev) => (Array.isArray(prev) ? mergeById(older, prev) : older));
    } finally {
      setLoadingEarlier(false);
    }
  }

  async function deliver(item: Outgoing) {
    setOutbox((prev) => prev.map((o) => (o.key === item.key ? { ...o, status: "sending", error: undefined } : o)));
    try {
      const message = await sendMessage({
        body: item.body,
        caseId: item.caseId,
        attachmentFile: item.file,
        dedupeKey: item.key,
      });
      setMessages((prev) => (Array.isArray(prev) ? mergeById(prev, [message]) : [message]));
      setOutbox((prev) => prev.filter((o) => o.key !== item.key));
    } catch (err) {
      setOutbox((prev) =>
        prev.map((o) =>
          o.key === item.key
            ? { ...o, status: "failed", error: err instanceof Error ? err.message : "Couldn't send." }
            : o
        )
      );
    }
  }

  async function openAttachment(path: string) {
    const url = await getFileUrl(path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if ((!draft.trim() && !attachment) || sending) return;
    setSendError(null);
    // ?case=<id> when opened from a case page; otherwise sendMessage
    // links it to the client's newest open case.
    const item: Outgoing = {
      key: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      body: draft.trim() || "Sent an attachment.",
      file: attachment,
      caseId: new URLSearchParams(window.location.search).get("case"),
      status: "sending",
    };
    setOutbox((prev) => [...prev, item]);
    setDraft("");
    setAttachment(null);
    void deliver(item);
  }

  const lastClientMessage = Array.isArray(messages) ? [...messages].reverse().find((m) => m.from === "client") : undefined;

  return (
    <div className="flex h-[calc(100vh-8rem)] max-h-[820px] flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Messages</h1>
          <p className="mt-1 text-sm text-ink-500">
            Case Team · usually replies within 24 hours
          </p>
        </div>
        {callee ? <CallButton phone={callee.phone} label={`Call ${callee.name}`} /> : null}
      </div>

      <Card className="mt-6 flex flex-1 flex-col overflow-hidden p-0">
        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          {hasEarlier ? (
            <div className="text-center">
              <button
                type="button"
                onClick={loadEarlier}
                disabled={loadingEarlier}
                className="text-xs font-semibold text-brand-700 hover:underline disabled:opacity-50"
              >
                {loadingEarlier ? "Loading…" : "Load earlier messages"}
              </button>
            </div>
          ) : null}
          {messages === "loading" ? (
            <BrandLoader label="Loading messages…" />
          ) : messages === "error" ? (
            <p className="text-sm text-risk-high">Couldn&apos;t load your messages — check your connection. We&apos;ll keep trying.</p>
          ) : messages.length === 0 && outbox.length === 0 ? (
            <p className="text-sm text-ink-400">
              No messages yet — send one below and our team will reply here.
            </p>
          ) : (
            messages.map((m) => {
              const isClient = m.from === "client";
              return (
                <div
                  key={m.id}
                  className={`flex items-end gap-2.5 ${isClient ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar */}
                  {isClient ? (
                    <ClientAvatar name={userName} />
                  ) : (
                    <TeamAvatar name={m.authorName} />
                  )}

                  {/* Bubble */}
                  <div className={`max-w-[78%] sm:max-w-[65%]`}>
                    <p
                      className={`mb-1 text-[11px] font-semibold ${
                        isClient ? "text-right text-ink-400" : "text-ink-400"
                      }`}
                    >
                      {m.authorName} · {m.date}
                    </p>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm ${
                        isClient
                          ? "rounded-br-sm bg-brand-600 text-white"
                          : "rounded-bl-sm bg-ink-100 text-ink-800"
                      }`}
                    >
                      <p className="leading-relaxed">{m.body}</p>
                      {m.attachment ? (
                        <button
                          type="button"
                          disabled={!m.attachmentPath}
                          onClick={() => m.attachmentPath && openAttachment(m.attachmentPath)}
                          className={`mt-2 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs enabled:hover:underline ${
                            isClient ? "bg-white/15" : "bg-white"
                          }`}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinejoin="round"
                            />
                          </svg>
                          {m.attachment}
                          {m.attachmentSize ? <span className="opacity-70">· {fileSize(m.attachmentSize)}</span> : null}
                        </button>
                      ) : null}
                    </div>
                    {isClient && m.id === lastClientMessage?.id ? (
                      <p className="mt-1 text-right text-[10px] text-ink-400">{m.readAt ? "Seen" : "Sent"}</p>
                    ) : null}
                    {m.kind === "form_request" && m.caseId ? (
                      <div className="mt-2">
                        <InlineRecoveryForm caseId={m.caseId} />
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
          {outbox.map((o) => (
            <div key={o.key} className="flex flex-row-reverse items-end gap-2.5">
              <ClientAvatar name={userName} />
              <div className="max-w-[78%] sm:max-w-[65%]">
                <div className="rounded-2xl rounded-br-sm bg-brand-600/70 px-4 py-3 text-sm text-white">
                  <p className="leading-relaxed">{o.body}</p>
                  {o.file ? <p className="mt-1 text-xs opacity-80">📎 {o.file.name}</p> : null}
                </div>
                {o.status === "sending" ? (
                  <p className="mt-1 text-right text-[10px] text-ink-400">Sending…</p>
                ) : (
                  <p className="mt-1 text-right text-[11px] text-risk-high">
                    Not sent{o.error ? ` — ${o.error}` : ""}.{" "}
                    <button type="button" onClick={() => deliver(o)} className="font-semibold underline">
                      Retry
                    </button>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 border-t border-ink-100 p-3 sm:p-4"
        >
          <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-400 hover:bg-ink-50 hover:text-ink-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                setAttachment(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </label>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={attachment ? `Attached: ${attachment.name}` : "Type a message…"}
            className="min-w-0 flex-1 rounded-full border border-ink-200 px-4 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <Button type="submit" size="sm" disabled={sending} className="shrink-0">
            {sending ? "Sending…" : "Send"}
          </Button>
        </form>
      </Card>

      {sendError ? (
        <p className="mt-3 rounded-xl bg-risk-high-bg px-3.5 py-2.5 text-xs font-medium text-risk-high">
          {sendError}
        </p>
      ) : null}

      <p className="mt-3 text-xs text-ink-400">
        We will never ask for your social media password over messages.
      </p>
    </div>
  );
}
