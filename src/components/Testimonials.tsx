"use client";

import { useT } from "@/lib/i18n/client";
import { reviews } from "@/lib/content/reviews";

function Stars() {
  return (
    <div className="flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="m12 2.5 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 18l-6.2 3.6 1.2-6.9-5-4.9 6.9-1L12 2.5Z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: (typeof reviews)[number] }) {
  const t = useT();
  const initials = review.name
    .split(" ")
    .map((p) => p[0])
    .join("");
  return (
    <div className="mx-3 flex w-80 shrink-0 flex-col rounded-2xl border border-ink-100 bg-white p-6 shadow-sm shadow-ink-900/5">
      <div className="flex items-center justify-between">
        <Stars />
        <span className="rounded-full bg-risk-low-bg px-2.5 py-1 text-xs font-semibold text-risk-low">
          {t(review.outcome)}
        </span>
      </div>
      <p className="mt-4 flex-1 text-sm text-ink-600">&ldquo;{t(review.quote)}&rdquo;</p>
      <div className="mt-5 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
          {initials}
        </span>
        <div>
          <p className="text-sm font-semibold text-ink-900">{t(review.name)}</p>
          <p className="text-xs text-ink-400">
            {t(review.role)} · {t(review.platform)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function Testimonials() {
  const loop = [...reviews, ...reviews];
  return (
    <div className="marquee-mask overflow-hidden">
      <div className="animate-marquee flex w-max hover:[animation-play-state:paused]">
        {loop.map((review, i) => (
          <ReviewCard key={`${review.name}-${i}`} review={review} />
        ))}
      </div>
    </div>
  );
}
