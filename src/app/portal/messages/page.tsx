"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchMessages, getFileUrl, sendMessage, type PortalMessage } from "@/lib/portal/data";
import { createClient } from "@/lib/supabase/client";

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
  const [messages, setMessages] = useState<PortalMessage[] | "loading">("loading");
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [userName, setUserName] = useState("You");
  const scrollRef = useRef<HTMLDivElement>(null);

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
    function load() {
      fetchMessages()
        .then((result) => {
          // Only replace when something changed, so polling doesn't
          // re-scroll the conversation every few seconds.
          if (cancelled) return;
          setMessages((prev) =>
            prev !== "loading" &&
            prev.length === result.length &&
            prev[prev.length - 1]?.id === result[result.length - 1]?.id
              ? prev
              : result
          );
        })
        .catch(() => {});
    }
    load();
    // Agent replies show up without a manual reload.
    const interval = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function openAttachment(path: string) {
    const url = await getFileUrl(path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if ((!draft.trim() && !attachment) || sending) return;
    setSending(true);
    setSendError(null);
    try {
      // ?case=<id> when opened from a case page; otherwise sendMessage
      // links it to the client's newest open case.
      const caseId = new URLSearchParams(window.location.search).get("case");
      const message = await sendMessage({
        body: draft.trim() || "Sent an attachment.",
        caseId,
        attachmentFile: attachment,
      });
      setMessages((prev) => (prev === "loading" ? [message] : [...prev, message]));
      setDraft("");
      setAttachment(null);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Couldn't send — please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] max-h-[820px] flex-col">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Messages</h1>
        <p className="mt-1 text-sm text-ink-500">
          Case Team · usually replies within 24 hours
        </p>
      </div>

      <Card className="mt-6 flex flex-1 flex-col overflow-hidden p-0">
        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          {messages === "loading" ? (
            <p className="text-sm text-ink-400">Loading messages…</p>
          ) : messages.length === 0 ? (
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
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 border-t border-ink-100 p-4"
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
            className="flex-1 rounded-full border border-ink-200 px-4 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <Button type="submit" size="sm" disabled={sending}>
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
