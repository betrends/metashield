"use client";

import { useEffect, useRef, useState } from "react";
import { contact } from "@/lib/site-config";

const channels = [
  {
    label: "WhatsApp",
    description: "Chat with our team",
    href: contact.whatsapp,
    external: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M8.5 8.8c.3-.7 1-1.5 1.6-1.4.4 0 .8.9 1 1.4.2.4 0 .7-.2.9l-.5.5c.4 1 1.4 2 2.4 2.4l.5-.5c.2-.2.5-.4.9-.2.5.2 1.4.6 1.4 1 .1.6-.7 1.3-1.4 1.6-1 .4-2.4-.1-3.6-1.3s-1.7-2.6-1.3-3.6c0-.3.1-.5.2-.8Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    label: "Instagram",
    description: "Message us a DM",
    href: contact.instagram,
    external: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: "Email",
    description: contact.email,
    href: `mailto:${contact.email}`,
    external: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="m4 6.5 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

// Small popover on the sidebar's "Contact Support" item, so reaching a
// human doesn't require a trip to the marketing contact page.
export function ContactSupportMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
          open ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M4 13v-1a8 8 0 0 1 16 0v1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <rect x="3" y="13" width="4.5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
          <rect x="16.5" y="13" width="4.5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
          <path d="M18 19v.5a2.5 2.5 0 0 1-2.5 2.5H13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        Contact Support
      </button>

      {open ? (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-2xl border border-ink-100 bg-white p-2 shadow-lg shadow-ink-900/10">
          <p className="px-3 pt-1.5 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
            Chat with us
          </p>
          {channels.map((channel) => (
            <a
              key={channel.label}
              href={channel.href}
              target={channel.external ? "_blank" : undefined}
              rel={channel.external ? "noopener noreferrer" : undefined}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-700 hover:bg-brand-50 hover:text-brand-700"
              onClick={() => setOpen(false)}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                {channel.icon}
              </span>
              <span>
                <span className="block font-semibold">{channel.label}</span>
                <span className="block text-xs text-ink-400">{channel.description}</span>
              </span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
