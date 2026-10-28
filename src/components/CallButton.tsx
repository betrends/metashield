"use client";

// A "Call" button for the message screens: opens the phone dialler
// (tel: link) with the number filled in. Shows the number beside it so
// people on a computer can dial it from their phone.

import { telHref } from "@/lib/phone";

export function CallButton({
  phone,
  label,
  emptyText = "No phone number on file",
  compact = false,
}: {
  phone: string | null | undefined;
  label: string;
  emptyText?: string;
  compact?: boolean;
}) {
  const href = phone ? telHref(phone) : null;
  if (!href) {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ink-50 px-3 py-1.5 text-xs font-semibold text-ink-400 ring-1 ring-ink-100"
        title={emptyText}
      >
        <PhoneIcon />
        {compact ? "No number" : emptyText}
      </span>
    );
  }
  return (
    <a
      href={href}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent-green px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 active:scale-[0.98]"
      title={`${label} · ${phone}`}
    >
      <PhoneIcon />
      <span>{label}</span>
      {!compact ? <span className="hidden font-normal text-white/85 sm:inline">· {phone}</span> : null}
    </a>
  );
}

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6.6 3.5h2.6l1.4 4-2 1.3a12 12 0 0 0 6.6 6.6l1.3-2 4 1.4v2.6a2 2 0 0 1-2.1 2A16.5 16.5 0 0 1 4.6 5.6a2 2 0 0 1 2-2.1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
