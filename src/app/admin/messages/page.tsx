"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BrandLoader } from "@/components/BrandLoader";

type Conversation = {
  key: string;
  userId: string;
  caseId: string | null;
  caseTitle: string | null;
  clientName: string | null;
  clientEmail: string | null;
  lastMessage: string;
  lastFromRole: "client" | "team";
  lastAt: string;
  unread: number;
};

type ThreadMessage = {
  id: string;
  from_role: "client" | "team";
  author_name: string;
  body: string;
  created_at: string;
  kind?: string;
  read_at?: string | null;
  attachment_name?: string | null;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
};

type Outgoing = { key: string; text: string; status: "sending" | "failed" };

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fileInfo(m: ThreadMessage) {
  const type = m.attachment_type ? m.attachment_type.split("/").pop()?.toUpperCase() : null;
  const size = m.attachment_size
    ? m.attachment_size < 1024 * 1024
      ? `${Math.round(m.attachment_size / 1024)} KB`
      : `${(m.attachment_size / (1024 * 1024)).toFixed(1)} MB`
    : null;
  return [type, size].filter(Boolean).join(" · ");
}

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[] | "loading" | "unauthorized" | "error">("loading");
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [thread, setThread] = useState<ThreadMessage[] | "loading" | "error">("loading");
  const [reply, setReply] = useState("");
  const [outbox, setOutbox] = useState<Outgoing[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function loadConversations() {
    try {
      const res = await fetch("/api/admin/messages", { cache: "no-store" });
      if (res.status === 403) {
        setConversations("unauthorized");
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      const list = (data.conversations ?? []) as Conversation[];
      setConversations(list);
      // Deep link from a case page: /admin/messages?case=<id>
      const wanted = new URLSearchParams(window.location.search).get("case");
      if (wanted) {
        setSelected((cur) => cur ?? list.find((c) => c.caseId === wanted) ?? null);
      }
    } catch {
      setConversations((prev) => (Array.isArray(prev) ? prev : "error"));
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConversations();
    // New client messages show up without a manual reload.
    const interval = setInterval(loadConversations, 20_000);
    return () => clearInterval(interval);
  }, []);

  async function loadThread(c: Conversation) {
    const params = new URLSearchParams({ userId: c.userId });
    if (c.caseId) params.set("caseId", c.caseId);
    const res = await fetch(`/api/admin/messages/thread?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.messages ?? []) as ThreadMessage[];
  }

  async function markRead(c: Conversation) {
    await fetch("/api/admin/messages/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: c.userId, caseId: c.caseId }),
    }).catch(() => {});
    setConversations((prev) => (Array.isArray(prev) ? prev.map((x) => (x.key === c.key ? { ...x, unread: 0 } : x)) : prev));
  }

  // Open the selected conversation, keep it fresh, and mark it read.
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    async function refresh(first: boolean) {
      const messages = await loadThread(selected!);
      if (cancelled) return;
      if (messages) {
        setThread(messages);
        if (messages.some((m) => m.from_role === "client" && !m.read_at)) void markRead(selected!);
      } else if (first) {
        setThread("error");
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThread("loading");
    void refresh(true);
    const interval = setInterval(() => refresh(false), 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selected]);

  const lastId = Array.isArray(thread) ? thread[thread.length - 1]?.id : undefined;
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lastId, outbox.length]);

  async function deliver(item: Outgoing) {
    if (!selected) return;
    setOutbox((prev) => prev.map((o) => (o.key === item.key ? { ...o, status: "sending" } : o)));
    try {
      const res = await fetch("/api/admin/messages/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selected.userId,
          caseId: selected.caseId,
          text: item.text,
          authorName: "MetaShield Team",
          dedupeKey: item.key,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setThread((prev) => (Array.isArray(prev) && !prev.some((m) => m.id === data.message.id) ? [...prev, data.message] : prev));
      setOutbox((prev) => prev.filter((o) => o.key !== item.key));
    } catch {
      setOutbox((prev) => prev.map((o) => (o.key === item.key ? { ...o, status: "failed" } : o)));
    }
  }

  function handleReply() {
    const text = reply.trim();
    if (!selected || !text) return;
    const item: Outgoing = { key: newKey(), text, status: "sending" };
    setOutbox((prev) => [...prev, item]);
    setReply("");
    void deliver(item);
  }

  if (conversations === "unauthorized") {
    return <p className="text-sm text-ink-500">You don&apos;t have access to this page.</p>;
  }

  const lastTeamId = Array.isArray(thread) ? [...thread].reverse().find((m) => m.from_role === "team")?.id : undefined;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">Messages</h1>
      <p className="mt-1 text-sm text-ink-500">Every client conversation, in one inbox.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
          {conversations === "loading" ? (
            <BrandLoader label="Loading…" />
          ) : conversations === "error" ? (
            <p className="p-6 text-sm text-risk-high">Couldn&apos;t load conversations — retrying.</p>
          ) : conversations.length === 0 ? (
            <p className="p-6 text-sm text-ink-400">No messages yet.</p>
          ) : (
            <ul className="max-h-[600px] divide-y divide-ink-50 overflow-y-auto">
              {conversations.map((c) => (
                <li key={c.key}>
                  <button
                    onClick={() => {
                      setOutbox([]);
                      setSelected(c);
                    }}
                    className={`block w-full px-4 py-3 text-left hover:bg-ink-50 ${selected?.key === c.key ? "bg-brand-50" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate text-sm ${c.unread ? "font-bold text-ink-900" : "font-semibold text-ink-900"}`}>
                        {c.clientName || c.clientEmail || "Client"}
                      </p>
                      {c.unread ? (
                        <span className="shrink-0 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">{c.unread}</span>
                      ) : (
                        <span className="shrink-0 text-[10px] text-ink-400">{when(c.lastAt)}</span>
                      )}
                    </div>
                    <p className="text-xs text-ink-400">{c.caseTitle || "General"}</p>
                    <p className="mt-1 truncate text-xs text-ink-500">
                      {c.lastFromRole === "team" ? "You: " : ""}
                      {c.lastMessage}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center p-10">
              <p className="text-sm text-ink-400">Select a conversation to view messages.</p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{selected.clientName || selected.clientEmail}</p>
                  <p className="text-xs text-ink-400">{selected.caseTitle || "General"}</p>
                </div>
                {selected.caseId ? (
                  <Link href={`/admin/cases/${selected.caseId}`} className="shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-700">
                    Open case →
                  </Link>
                ) : null}
              </div>
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4" style={{ minHeight: 320, maxHeight: 480 }}>
                {thread === "loading" ? (
                  <BrandLoader label="Loading…" />
                ) : thread === "error" ? (
                  <p className="text-sm text-risk-high">Couldn&apos;t load this conversation — retrying.</p>
                ) : thread.length === 0 && outbox.length === 0 ? (
                  <p className="text-sm text-ink-400">No messages in this conversation yet.</p>
                ) : (
                  thread.map((m) => (
                    <div key={m.id} className={`max-w-[75%] ${m.from_role === "team" ? "ml-auto" : ""}`}>
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm ${
                          m.from_role === "team" ? "bg-brand-600 text-white" : "bg-ink-50 text-ink-800"
                        } ${m.kind && m.kind !== "message" ? "opacity-90" : ""}`}
                      >
                        <p className="text-[11px] font-semibold opacity-70">
                          {m.author_name} · {when(m.created_at)}
                          {m.kind === "system" || m.kind === "form_request" ? " · automatic" : ""}
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap">{m.body}</p>
                        {m.attachment_name ? (
                          <div className="mt-1.5 text-xs">
                            {m.attachment_url ? (
                              <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                                📎 {m.attachment_name}
                              </a>
                            ) : (
                              <span className="opacity-70">📎 {m.attachment_name} (file not uploaded)</span>
                            )}
                            {fileInfo(m) ? <span className="ml-1 opacity-70">· {fileInfo(m)}</span> : null}
                          </div>
                        ) : null}
                      </div>
                      {m.id === lastTeamId ? (
                        <p className="mt-0.5 text-right text-[10px] text-ink-400">{m.read_at ? "Seen by client" : "Delivered"}</p>
                      ) : null}
                    </div>
                  ))
                )}
                {outbox.map((o) => (
                  <div key={o.key} className="ml-auto max-w-[75%]">
                    <div className="rounded-2xl bg-brand-600/70 px-4 py-2.5 text-sm text-white">
                      <p className="whitespace-pre-wrap">{o.text}</p>
                    </div>
                    {o.status === "sending" ? (
                      <p className="mt-0.5 text-right text-[10px] text-ink-400">Sending…</p>
                    ) : (
                      <p className="mt-0.5 text-right text-[11px] text-risk-high">
                        Not sent.{" "}
                        <button type="button" onClick={() => deliver(o)} className="font-semibold underline">
                          Retry
                        </button>
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 border-t border-ink-100 px-4 py-3">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleReply()}
                  placeholder="Type a reply…"
                  className="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
                <button
                  onClick={handleReply}
                  disabled={!reply.trim()}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
