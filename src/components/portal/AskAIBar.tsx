"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AskAIBar() {
  const router = useRouter();
  const [draft, setDraft] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    router.push(text ? `/portal/assistant?q=${encodeURIComponent(text)}` : "/portal/assistant");
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-[#1d2e5e]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-8">
        {/* Icon + label */}
        <div className="hidden items-center gap-2 sm:flex">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#3b74ff] to-[#2557e6] text-[11px] font-extrabold tracking-widest text-white">
            AI
          </span>
          <p className="whitespace-nowrap text-xs font-semibold text-ink-700">Ask the AI</p>
        </div>

        {/* Divider */}
        <div className="hidden h-5 w-px bg-ink-200 sm:block" />

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex flex-1 items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about your account health, policies, recovery…"
            className="h-10 w-full flex-1 rounded-xl border border-ink-200 px-4 text-sm outline-none focus:border-brand-400"
          />
          <button
            type="submit"
            aria-label="Ask the AI Assistant"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-opacity hover:opacity-90"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 12h16M13 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
