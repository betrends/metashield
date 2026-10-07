"use client";

import { useEffect, useState } from "react";

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
};

type ThreadMessage = {
  id: string;
  from_role: "client" | "team";
  author_name: string;
  body: string;
  created_at: string;
};

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[] | "loading" | "unauthorized">("loading");
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [thread, setThread] = useState<ThreadMessage[] | "loading">("loading");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/messages");
      if (res.status === 403) {
        setConversations("unauthorized");
        return;
      }
      const data = await res.json();
      setConversations(data.conversations ?? []);
    }
    load();
  }, []);

  async function openConversation(c: Conversation) {
    setSelected(c);
    setThread("loading");
    const params = new URLSearchParams({ userId: c.userId });
    if (c.caseId) params.set("caseId", c.caseId);
    const res = await fetch(`/api/admin/messages/thread?${params.toString()}`);
    const data = await res.json();
    setThread(data.messages ?? []);
  }

  async function handleReply() {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/messages/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selected.userId,
          caseId: selected.caseId,
          text: reply.trim(),
          authorName: "MetaShield Team",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setThread((prev) => (Array.isArray(prev) ? [...prev, data.message] : prev));
        setReply("");
      }
    } finally {
      setSending(false);
    }
  }

  if (conversations === "unauthorized") {
    return <p className="text-sm text-ink-500">You don&apos;t have access to this page.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">Messages</h1>
      <p className="mt-1 text-sm text-ink-500">Every client conversation, in one inbox.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
          {conversations === "loading" ? (
            <p className="p-6 text-sm text-ink-400">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="p-6 text-sm text-ink-400">No messages yet.</p>
          ) : (
            <ul className="max-h-[600px] divide-y divide-ink-50 overflow-y-auto">
              {conversations.map((c) => (
                <li key={c.key}>
                  <button
                    onClick={() => openConversation(c)}
                    className={`block w-full px-4 py-3 text-left hover:bg-ink-50 ${
                      selected?.key === c.key ? "bg-brand-50" : ""
                    }`}
                  >
                    <p className="text-sm font-semibold text-ink-900">{c.clientName || c.clientEmail || "Client"}</p>
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
              <div className="border-b border-ink-100 px-5 py-4">
                <p className="text-sm font-semibold text-ink-900">
                  {selected.clientName || selected.clientEmail}
                </p>
                <p className="text-xs text-ink-400">{selected.caseTitle || "General"}</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4" style={{ minHeight: 320, maxHeight: 480 }}>
                {thread === "loading" ? (
                  <p className="text-sm text-ink-400">Loading…</p>
                ) : (
                  thread.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                        m.from_role === "team" ? "ml-auto bg-brand-600 text-white" : "bg-ink-50 text-ink-800"
                      }`}
                    >
                      <p className="text-[11px] font-semibold opacity-70">{m.author_name}</p>
                      <p className="mt-0.5">{m.body}</p>
                    </div>
                  ))
                )}
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
                  disabled={sending || !reply.trim()}
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
