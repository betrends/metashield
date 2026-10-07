import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { reviews } from "@/lib/content/reviews";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Client Reviews"),
    description:
      t("Video and written reviews from businesses and creators whose accounts we've helped recover and protect."),
  };
}

function Stars() {
  return (
    <div className="flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="m12 2.5 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 18l-6.2 3.6 1.2-6.9-5-4.9 6.9-1L12 2.5Z" />
        </svg>
      ))}
    </div>
  );
}

export default async function ReviewsPage() {
  const t = await getT();
  return (
    <>
      <section className="bg-brand-glow">
        <Container className="py-16 sm:py-20">
          <div className="max-w-2xl">
            <Eyebrow>{t("Client Reviews")}</Eyebrow>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl text-balance">{t("Hear it from businesses and creators we've helped.")}</h1>
            <p className="mt-5 text-lg text-ink-600 text-balance">{t("Video and written reviews from real cases — anonymized where requested. New video testimonials are added as clients agree to share their story.")}</p>
          </div>
        </Container>
      </section>

      <Section className="pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => {
            const initials = review.name
              .split(" ")
              .map((p) => p[0])
              .join("");
            return (
              <Card key={review.name} className="flex flex-col overflow-hidden p-0">
                {review.videoUrl ? (
                  <video
                    src={review.videoUrl}
                    controls
                    className="aspect-video w-full bg-ink-900 object-cover"
                  />
                ) : (
                  <div className="relative flex aspect-video w-full items-center justify-center bg-gradient-to-br from-ink-800 to-ink-900">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7L8 5Z" />
                      </svg>
                    </span>
                    <span className="absolute bottom-3 left-3 rounded-full bg-black/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">{t("Video coming soon")}</span>
                  </div>
                )}

                <div className="flex flex-1 flex-col p-6">
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
              </Card>
            );
          })}
        </div>

        <div className="mt-14 rounded-3xl bg-ink-900 px-8 py-14 text-center sm:px-16">
          <h2 className="text-3xl font-semibold text-white text-balance sm:text-4xl">{t("Ready to be our next success story?")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-ink-300 text-balance">{t("Run a free eligibility check and see if your case is a good fit for professional recovery support.")}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/recovery-eligibility" size="lg">{t("Check Recovery Eligibility")}</ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
