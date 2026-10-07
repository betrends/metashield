"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchAccounts, migratePendingLocalRecords, type PortalAccount } from "@/lib/portal/data";
import { generateInsight, pickPriorityAccount, respondTo } from "@/lib/portal/ai-assistant";

type ChatMessage = { id: string; from: "user" | "ai"; text: string };

const suggestedPrompts = [
  "How healthy are my accounts?",
  "What's my biggest risk right now?",
  "How do I protect my account?",
  "I need to recover a disabled account",
];

let nextId = 1;

export default function PortalAssistantPage() {
  return (
    <Suspense fallback={null}>
      <PortalAssistantPageInner />
    </Suspense>
  );
}

function PortalAssistantPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<PortalAccount[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentInitialQuery = useRef(false);

  useEffect(() => {
    async function load() {
      await migratePendingLocalRecords();
      const merged = await fetchAccounts();
      setAccounts(merged);

      const priority = pickPriorityAccount(merged);
      const greeting = priority
        ? `Hi! I've already been checking your accounts. ${generateInsight(priority)}`
        : "Hi! Run an Account Health Check and I'll start monitoring it for you.";
      setMessages([{ id: "greeting", from: "ai", text: greeting }]);

      // A question asked from the "Ask anything" bar elsewhere in the
      // portal arrives here via ?q= — send it once, then drop it from the
      // URL so refreshing doesn't resend it.
      const q = searchParams.get("q");
      if (q && !sentInitialQuery.current) {
        // Guards against React Strict Mode's double-invoke of effects in
        // development, which would otherwise send this question twice.
        sentInitialQuery.current = true;
        window.setTimeout(() => sendMessage(q, merged), 300);
        router.replace("/portal/assistant");
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  async function sendMessage(text: string, accountsOverride?: PortalAccount[]) {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { id: `m-${nextId++}`, from: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    setTyping(true);

    const activeAccounts = accountsOverride ?? accounts;

    // Real AI Assistant, backed by Claude — see src/app/api/assistant.
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, accounts: activeAccounts }),
      });
      if (res.ok) {
        const data = (await res.json()) as { reply: string };
        setMessages((prev) => [...prev, { id: `m-${nextId++}`, from: "ai", text: data.reply }]);
        setTyping(false);
        return;
      }
    } catch {
      // Network error — fall through to the offline responder below.
    }

    // ANTHROPIC_API_KEY isn't configured yet, or the request failed —
    // fall back to the rule-based responder so the chat still works. Kept
    // on a short delay so it doesn't feel instant/canned either way.
    window.setTimeout(() => {
      const reply = respondTo(text, activeAccounts);
      setMessages((prev) => [...prev, { id: `m-${nextId++}`, from: "ai", text: reply }]);
      setTyping(false);
    }, 900);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] max-h-[820px] flex-col">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M17.7 17.7l1.4 1.4M6.3 17.7l-1.4 1.4M17.7 6.3l1.4-1.4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </span>
        <div>
          <h1 className="text-xl font-semibold text-ink-900">AI Health Assistant</h1>
          <p className="text-sm text-ink-500">
            Automated, always watching — for anything complex, message our team.
          </p>
        </div>
      </div>

      <Card className="mt-6 flex flex-1 flex-col overflow-hidden p-0">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
          {messages.map((m) => {
            const isUser = m.from === "user";
            return (
              <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm sm:max-w-[70%] ${
                    isUser ? "bg-brand-600 text-white" : "bg-ink-50 text-ink-800"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            );
          })}
          {typing ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl bg-ink-50 px-4 py-3">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400" />
              </div>
            </div>
          ) : null}
        </div>

        {messages.length <= 1 ? (
          <div className="flex flex-wrap gap-2 border-t border-ink-100 p-4">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-600 hover:border-brand-400 hover:text-brand-700"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(draft);
          }}
          className="flex items-center gap-2 border-t border-ink-100 p-4"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about your account health…"
            className="flex-1 rounded-full border border-ink-200 px-4 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <Button type="submit" size="sm">
            Send
          </Button>
        </form>
      </Card>

      <p className="mt-3 text-xs text-ink-400">
        Automated assistant — not a substitute for a full review. It will
        never ask for your social media password.
      </p>
    </div>
  );
}
