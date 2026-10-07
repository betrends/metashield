"use client";

import { useT } from "@/lib/i18n/client";
import Image from "next/image";
import { useState } from "react";

// ─── Edit your 3 video reviews here ────────────────────────────────────────
// youtubeId  — the ID from the YouTube URL (after /watch?v= or /shorts/)
//              set to null if you don't have a video yet
// isShort    — true for YouTube Shorts (portrait), false for regular (landscape)
// image      — path to a local image in /public/images/reviews/ used as the
//              card thumbnail when there is no YouTube video (e.g. a screenshot
//              of the review). Leave null if unused.
// avatar     — path to a photo of the reviewer in /public/images/reviews/
//              (e.g. "/images/reviews/adaeze.jpg"). Leave null to show initials.
const VIDEO_REVIEWS = [
  {
    id: 1,
    youtubeId: null as string | null,
    isShort: true,
    image: "/images/reviews/dben-estate.jpg" as string | null,
    avatar: null as string | null,
    name: "Dben Real Estate",
    handle: "@dben_estate",
    platform: "Instagram",
    platformColor: "from-fuchsia-500 to-orange-400",
    review:
      "Our business Instagram account (9,200+ followers) was permanently disabled with no warning. BetheTrendsNG recovered it fully. We were told it was impossible — they made it happen.",
    stars: 5,
  },
  {
    id: 2,
    youtubeId: null as string | null,
    isShort: true,
    image: "/images/reviews/avivah-official.jpg" as string | null,
    avatar: null as string | null,
    name: "Avivah Official",
    handle: "@avivah.official",
    platform: "Instagram",
    platformColor: "from-fuchsia-500 to-orange-400",
    review:
      "Got the email from Instagram confirming my account was back. I had already given up after Meta rejected my appeal twice. These guys knew exactly what to do.",
    stars: 5,
  },
  {
    id: 3,
    youtubeId: null as string | null,
    isShort: true,
    image: "/images/reviews/scent-home.jpg" as string | null,
    avatar: null as string | null,
    name: "The Scent Home",
    handle: "@the_scent_home",
    platform: "Instagram",
    platformColor: "from-fuchsia-500 to-orange-400",
    review:
      "Account disabled on July 4 and recovered same day. The process was smooth and the team kept me updated throughout. Highly recommend to any business that depends on Instagram.",
    stars: 5,
  },
];

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" />
    </svg>
  );
}

function VideoCard({
  review,
}: {
  review: (typeof VIDEO_REVIEWS)[number];
}) {
  const t = useT();
  const [playing, setPlaying] = useState(false);
  const isGradient = review.platformColor.startsWith("from-");
  // Shorts are 9:16 portrait; regular videos are 16:9 landscape
  const aspectClass = review.isShort ? "aspect-[9/16]" : "aspect-video";

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
      {/* Video / thumbnail area */}
      <div className={`relative ${aspectClass} w-full overflow-hidden bg-ink-100`}>
        {review.youtubeId && playing ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube.com/embed/${review.youtubeId}?autoplay=1&rel=0`}
            title={t("{name} video review", { name: review.name })}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : review.youtubeId ? (
          /* Real video — show YouTube thumbnail + play button */
          <button
            onClick={() => setPlaying(true)}
            aria-label={t("Play video review")}
            className="absolute inset-0 w-full h-full group"
          >
            {/* YouTube thumbnail */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://img.youtube.com/vi/${review.youtubeId}/hqdefault.jpg`}
              alt={t("{name} video review", { name: review.name })}
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Dark overlay on hover */}
            <span className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/30" />
            {/* YouTube-style red play button */}
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-xl transition-transform group-hover:scale-110">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                  <path d="M8 5v14l11-7L8 5Z" />
                </svg>
              </span>
            </span>
            {/* Platform badge */}
            <span
              className={`absolute right-3 top-3 flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold text-white ${
                isGradient ? `bg-gradient-to-br ${review.platformColor}` : review.platformColor
              }`}
            >
              {t(review.platform)}
            </span>
          </button>
        ) : review.image ? (
          /* Local image thumbnail */
          <>
            <Image
              src={review.image}
              alt={t("{name} review", { name: review.name })}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <span
              className={`absolute right-3 top-3 flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold text-white ${
                isGradient ? `bg-gradient-to-br ${review.platformColor}` : review.platformColor
              }`}
            >
              {t(review.platform)}
            </span>
          </>
        ) : (
          /* No video or image yet — placeholder */
          <>
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-brand-200 text-brand-600">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M8 5v14l11-7L8 5Z" fill="currentColor" fillOpacity="0.4" />
                    <path d="M8 5v14l11-7L8 5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-brand-500">{t("Video coming soon")}</p>
              </div>
            </div>
            <span
              className={`absolute right-3 top-3 flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold text-white ${
                isGradient ? `bg-gradient-to-br ${review.platformColor}` : review.platformColor
              }`}
            >
              {t(review.platform)}
            </span>
          </>
        )}
      </div>

      {/* Review text + author */}
      <div className="flex flex-1 flex-col p-5">
        {/* Stars */}
        <div className="flex gap-0.5 text-amber-400">
          {Array.from({ length: review.stars }).map((_, i) => (
            <StarIcon key={i} />
          ))}
        </div>

        <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink-700">
          "{t(review.review)}"
        </blockquote>

        <div className="mt-4 flex items-center gap-3">
          {review.avatar ? (
            <Image
              src={review.avatar}
              alt={t(review.name)}
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                isGradient ? `bg-gradient-to-br ${review.platformColor}` : review.platformColor
              }`}
            >
              {review.name[0]}
            </span>
          )}
          <div>
            <p className="text-sm font-semibold text-ink-900">{t(review.name)}</p>
            <p className="text-xs text-ink-400">{t(review.handle)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VideoReviews() {
  const t = useT();
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="container-page">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">{t("Video Reviews")}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">{t("Hear it from our clients")}</h2>
          <p className="mt-2 text-sm text-ink-500">{t("Real people, real recoveries. Watch their stories.")}</p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {VIDEO_REVIEWS.map((review) => (
            <VideoCard key={review.id} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
}
