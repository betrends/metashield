import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section, SectionHeading, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { recoveryPlatforms } from "@/lib/content/recovery";
import { caseStudies } from "@/lib/content/case-studies";
import { servicesNav } from "@/lib/site-config";
import dynamic from "next/dynamic";

const Testimonials = dynamic(() => import("@/components/Testimonials").then(m => m.Testimonials));
const CountUp = dynamic(() => import("@/components/CountUp").then(m => m.CountUp));
const VideoReviews = dynamic(() => import("@/components/VideoReviews").then(m => m.VideoReviews));

const stats = [
  { value: 1000, prefix: "", suffix: "+", label: "Cases resolved", icon: "chart" },
  { value: 24, prefix: "<", suffix: "h", label: "Typical first response", icon: "clock" },
  { value: 5, prefix: "", suffix: "", label: "Platforms supported", icon: "globe" },
  { value: 5, prefix: "", suffix: "+", label: "Years combined experience", icon: "users" },
];

const supportedPlatforms = [
  {
    name: "Instagram",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8">
        <defs>
          <radialGradient id="ig-g1" cx="30%" cy="107%" r="120%">
            <stop offset="0%" stopColor="#ffd600"/>
            <stop offset="50%" stopColor="#ff6a00"/>
            <stop offset="100%" stopColor="#ee0979"/>
          </radialGradient>
          <radialGradient id="ig-g2" cx="10%" cy="100%" r="80%">
            <stop offset="0%" stopColor="#f09433"/>
            <stop offset="25%" stopColor="#e6683c"/>
            <stop offset="50%" stopColor="#dc2743"/>
            <stop offset="75%" stopColor="#cc2366"/>
            <stop offset="100%" stopColor="#bc1888"/>
          </radialGradient>
          <linearGradient id="ig-g3" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#4f5bd5"/>
            <stop offset="50%" stopColor="#962fbf"/>
            <stop offset="100%" stopColor="#d62976"/>
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="12" fill="url(#ig-g3)"/>
        <rect x="13" y="13" width="22" height="22" rx="6" stroke="white" strokeWidth="2.5" fill="none"/>
        <circle cx="24" cy="24" r="5.5" stroke="white" strokeWidth="2.5" fill="none"/>
        <circle cx="33" cy="15" r="1.5" fill="white"/>
      </svg>
    ),
  },
  {
    name: "Facebook",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8">
        <rect width="48" height="48" rx="12" fill="#1877F2"/>
        <path d="M27 25h4l1-4h-5v-2c0-1.1.4-2 1.8-2H32v-4s-1.5-.3-3-.3c-3.8 0-6 2.3-6 6.3V21h-4v4h4v10h5V25z" fill="white"/>
      </svg>
    ),
  },
  {
    name: "Messenger",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8">
        <defs>
          <linearGradient id="msg-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00B2FF"/>
            <stop offset="100%" stopColor="#006AFF"/>
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="12" fill="url(#msg-g)"/>
        <path d="M24 10C16.3 10 10 16 10 23.4c0 4 1.9 7.5 4.9 9.9V38l4.7-2.6c1.2.4 2.6.6 4 .6 7.7 0 14-6 14-13.4C37.6 16 31.3 10 24 10zm1.4 17.9l-3.6-3.8-6.9 3.8 7.6-8.1 3.7 3.8 6.8-3.8-7.6 8.1z" fill="white"/>
      </svg>
    ),
  },
  {
    name: "TikTok",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8">
        <rect width="48" height="48" rx="12" fill="#010101"/>
        <path d="M31 13.5c.8 1 2 1.7 3.5 1.9v3.7a8.4 8.4 0 0 1-3.5-.8v7.7a7.5 7.5 0 1 1-7.5-7.5h.5v3.8h-.5a3.7 3.7 0 1 0 3.7 3.7V13.5H31z" fill="white"/>
        <path d="M31 13.5c.8 1 2 1.7 3.5 1.9v3.7a8.4 8.4 0 0 1-3.5-.8v7.7a7.5 7.5 0 1 1-7.5-7.5h.5v3.8h-.5a3.7 3.7 0 1 0 3.7 3.7V13.5H31z" fill="none" stroke="#69C9D0" strokeWidth="0.5"/>
      </svg>
    ),
  },
  {
    name: "Threads",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8">
        <rect width="48" height="48" rx="12" fill="#101010"/>
        <path d="M30.7 22.3a7.2 7.2 0 0 0-.4-.2c-.2-3.3-2-5.2-5-5.2-1.8 0-3.3.8-4.2 2.1l1.6 1.1c.7-1 1.6-1.4 2.7-1.4 1.5 0 2.5.9 2.8 2.5a11 11 0 0 0-2.2-.1c-2.8 0-4.6 1.3-4.6 3.5 0 2.3 1.9 3.4 3.9 3.4 1.9 0 3.4-.8 4.3-2.3.4.7 1 1.3 1.6 1.7l1-1.5c-.8-.6-1.3-1.3-1.5-2.2v-.5c0-.2 0-.5-.1-.7v-.2zm-4.6 3.8c-1.1 0-1.9-.5-1.9-1.6 0-1.3 1.1-1.7 2.8-1.7.6 0 1.2 0 1.8.1-.2 1.8-1.4 3.2-2.7 3.2zM24 12a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm0 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" fill="white"/>
      </svg>
    ),
  },
  {
    name: "Google",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8">
        <rect width="48" height="48" rx="12" fill="white" stroke="#e5e7eb" strokeWidth="1"/>
        <path d="M35.7 24.2c0-.7-.1-1.4-.2-2H24v3.8h6.6a5.6 5.6 0 0 1-2.5 3.7v3h4c2.4-2.2 3.7-5.5 3.7-9.4-.1 0-.1.6-.1.9z" fill="#4285F4"/>
        <path d="M24 36c3.3 0 6.1-1.1 8.2-3l-4-3.1a7.5 7.5 0 0 1-11.2-4H13v3.2A12 12 0 0 0 24 36z" fill="#34A853"/>
        <path d="M17 25.9a7.1 7.1 0 0 1 0-4.5v-3.2H13a12 12 0 0 0 0 10.9l4-3.2z" fill="#FBBC05"/>
        <path d="M24 16.5c1.8 0 3.4.6 4.7 1.8l3.5-3.5A12 12 0 0 0 13 18.2l4 3.2c.9-2.8 3.5-4.9 7-4.9z" fill="#EA4335"/>
      </svg>
    ),
  },
];

const features = [
  {
    icon: "pulse",
    iconClass: "text-brand-600 bg-brand-100",
    title: "Account Health Check",
    description: "A short questionnaire, reviewed by our team, to detect risks and improve account health.",
    href: "/check-my-account",
  },
  {
    icon: "shield",
    iconClass: "text-accent-green bg-accent-green-bg",
    title: "Account Protection",
    description: "Continuous monitoring and proactive risk reduction to keep your accounts safe.",
    href: "/account-protection",
  },
  {
    icon: "refresh",
    iconClass: "text-accent-orange bg-accent-orange-bg",
    title: "Account Recovery",
    description: "Expert support to recover disabled, restricted or compromised accounts.",
    href: "/account-recovery",
  },
  {
    icon: "sparkles",
    iconClass: "text-accent-blue bg-accent-blue-bg",
    title: "AI Risk Assistant",
    description: "Chat with an assistant that already knows your account's health for instant answers and alerts.",
    href: "/portal",
  },
];

const processSteps = [
  {
    icon: "user",
    title: "1. Check",
    description: "Run a free account health check in minutes.",
  },
  {
    icon: "search",
    title: "2. Assess",
    description: "Our team reviews your account and flags real risks.",
  },
  {
    icon: "shield",
    title: "3. Protect or Recover",
    description: "Enroll in ongoing protection, or start a recovery case.",
  },
  {
    icon: "check",
    title: "4. Stay Informed",
    description: "Track everything live from your client portal.",
  },
];

const trustPoints = [
  {
    title: "We never ask for your password",
    description:
      "Recovery and verification are handled entirely through official platform channels — that's a non-negotiable trust boundary.",
  },
  {
    title: "Secure document handling",
    description:
      "Evidence and documents you share are handled with limited staff access and a clear data-retention policy.",
  },
  {
    title: "Transparent case tracking",
    description:
      "Every case moves through clearly defined stages — no guessing, no unanswered messages.",
  },
];

function Icon({ name, className = "" }: { name: string; className?: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    className,
  } as const;
  switch (name) {
    case "pulse":
      return (
        <svg {...common}>
          <path
            d="M3 12h4l2-7 4 14 2-7h6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path
            d="M12 3 5 6v5c0 4.4 3 8.4 7 9.5 4-1.1 7-5.1 7-9.5V6l-7-3Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="m9 12 2 2 4-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "refresh":
      return (
        <svg {...common}>
          <path
            d="M4 4v5h5M20 20v-5h-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4.5 15a8 8 0 0 0 14.1 3M19.5 9A8 8 0 0 0 5.4 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path
            d="M5 19V10M12 19V5M19 19v-7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "globe":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
          <path
            d="M3.5 12h17M12 3.5c2.5 2.4 3.8 5.2 3.8 8.5s-1.3 6.1-3.8 8.5c-2.5-2.4-3.8-5.2-3.8-8.5S9.5 5.9 12 3.5Z"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
          <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8.5" r="3" stroke="currentColor" strokeWidth="2" />
          <path d="M3 20c1-3.2 3.5-5 6-5s5 1.8 6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M15.5 6a3 3 0 0 1 0 5.8M18.5 20c-.5-2-1.6-3.5-3-4.4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="2" />
          <path d="M5 20c1-3.5 4-5 7-5s6 1.5 7 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
          <path d="m8.5 12.3 2.4 2.4 4.6-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "sparkles":
      return (
        <svg {...common}>
          <path
            d="M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M17.7 17.7l1.4 1.4M6.3 17.7l-1.4 1.4M17.7 6.3l1.4-1.4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    default:
      return null;
  }
}

function HeroGraphic() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md">
      <svg
        viewBox="0 0 448 448"
        className="absolute inset-0 h-full w-full text-brand-200"
        fill="none"
      >
        <circle cx="224" cy="224" r="150" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 6" />
        <line x1="224" y1="224" x2="75" y2="95" stroke="currentColor" strokeWidth="1.5" className="animate-dash-flow" strokeDasharray="6 6" />
        <line x1="224" y1="224" x2="380" y2="80" stroke="currentColor" strokeWidth="1.5" className="animate-dash-flow" strokeDasharray="6 6" />
        <line x1="224" y1="224" x2="65" y2="355" stroke="currentColor" strokeWidth="1.5" className="animate-dash-flow" strokeDasharray="6 6" />
        <line x1="224" y1="224" x2="385" y2="365" stroke="currentColor" strokeWidth="1.5" className="animate-dash-flow" strokeDasharray="6 6" />
      </svg>

      {/* Center shield */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-400" />
        <span className="relative flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 shadow-xl shadow-brand-900/20 sm:h-40 sm:w-40">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 9.5 4.6-.6 8-4.4 8-9.5V6l-8-3.5Z"
              fill="white"
              fillOpacity="0.15"
            />
            <path
              d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 9.5 4.6-.6 8-4.4 8-9.5V6l-8-3.5Z"
              stroke="white"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="m8.3 12.2 2.4 2.4 4.8-5.1"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      {/* Orbiting platform bubbles */}
      <div className="animate-float absolute left-[10%] top-[15%]">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-ink-100">
          {supportedPlatforms[0].icon}
        </span>
      </div>
      <div className="animate-float-delayed absolute right-[3%] top-[8%]">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-ink-100">
          {supportedPlatforms[1].icon}
        </span>
      </div>
      <div className="animate-float-delayed absolute bottom-[10%] left-[2%]">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-ink-100">
          {supportedPlatforms[3].icon}
        </span>
      </div>
      <div className="animate-float absolute bottom-[6%] right-[8%]">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-ink-100">
          {supportedPlatforms[5].icon}
        </span>
      </div>
    </div>
  );
}

export default async function Home() {
  const t = await getT();
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-glow">
        <Container className="relative py-16 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="animate-fade-in-up">
              <h1 className="text-4xl font-semibold tracking-tight text-ink-900 text-balance sm:text-6xl">{t("Advanced Protection &")}{" "}<span className="text-brand-600">{t("Account Recovery.")}</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-ink-600 text-balance">{t("Professional account recovery and protection services for businesses and creators. We recover disabled accounts, prevent future issues, and keep your digital presence safe and always accessible.")}</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <ButtonLink
                  href="/check-my-account"
                  size="lg"
                  className="w-full sm:w-auto !font-extrabold shadow-lg shadow-brand-600/30 ring-2 ring-brand-200 hover:!scale-[1.05]"
                >{t("Check My Account Health")}<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12h14m-6-6 6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </ButtonLink>
                <ButtonLink href="/recovery-eligibility" variant="outline" size="lg" className="w-full sm:w-auto">{t("Start Your Recovery")}</ButtonLink>
              </div>

              <div className="mt-12">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{t("Supported Platforms")}</p>
                </div>
                <div className="mt-3 -mx-1 flex items-end gap-3 overflow-x-auto px-1 pb-1 scrollbar-none">
                  {supportedPlatforms.map((p) => (
                    <div key={p.name} className="flex shrink-0 flex-col items-center gap-1.5">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm shadow-ink-900/10 ring-1 ring-ink-100">
                        {p.icon}
                      </div>
                      <span className="text-[11px] font-medium text-ink-500">{t(p.name)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <HeroGraphic />
          </div>
        </Container>
      </section>

      {/* Video Reviews */}
      <VideoReviews />

      {/* Testimonials */}
      <Section className="bg-ink-50/50 pt-12 sm:pt-16" containerClassName="!max-w-none !px-0">
        <div className="container-page">
          <SectionHeading
            eyebrow={t("Client reviews")}
            title={t("Trusted by businesses and creators we've helped recover")}
            align="center"
          />
        </div>
        <div className="mt-10">
          <Testimonials />
        </div>
        <div className="container-page mt-8 flex justify-center">
          <ButtonLink href="/reviews" variant="outline">{t("See all reviews")}</ButtonLink>
        </div>
      </Section>

      {/* Services — shown directly, matching the header nav */}
      <Section>
        <SectionHeading eyebrow={t("Our services")} title={t("Explore our services")} align="center" />
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {servicesNav.map((service, i) => (
            <Link key={service.href} href={service.href} className="group block">
              <Card className="flex h-full flex-col transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-md">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <Icon name={["refresh", "shield", "chart"][i] ?? "shield"} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink-900">
                  {t(service.label)}
                </h3>
                <p className="mt-2 flex-1 text-sm text-ink-500">
                  {t(service.description)}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 group-hover:text-brand-800">{t("Learn more")}<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12h14m-6-6 6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </Section>

      {/* Feature grid */}
      <Section className="bg-ink-50/50">
        <SectionHeading
          eyebrow={t("What we do")}
          title={t("Everything you need to secure your digital accounts")}
          description={t("From prevention to recovery, all in one place.")}
          align="center"
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${feature.iconClass}`}>
                <Icon name={feature.icon} />
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink-900">
                {t(feature.title)}
              </h3>
              <p className="mt-2 flex-1 text-sm text-ink-500">
                {t(feature.description)}
              </p>
              <Link
                href={feature.href}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
              >{t("Learn more")}<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12h14m-6-6 6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </Card>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section className="bg-ink-50/50">
        <SectionHeading
          eyebrow={t("How it works")}
          title={t("Simple process. Real protection.")}
          align="center"
        />
        <div className="relative mt-14">
          {/* Connector line between steps. A plain gradient-background div
              rather than an SVG line — the earlier SVG viewBox + non-scaling
              stroke combination scaled the dash pattern down to nearly
              nothing, so only a sliver rendered near step 1. */}
          <div
            className="animate-connector-flow absolute top-7 right-[12%] left-[12%] hidden h-0.5 sm:block"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to right, var(--color-brand-300) 0, var(--color-brand-300) 6px, transparent 6px, transparent 14px)",
              backgroundSize: "28px 100%",
            }}
            aria-hidden="true"
          />
          <div className="grid gap-y-10 sm:grid-cols-4">
            {processSteps.map((step) => (
              <div key={step.title} className="flex flex-col items-center text-center">
                <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-2 border-brand-200 bg-white text-brand-600 shadow-sm">
                  <Icon name={step.icon} />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-ink-900">{t(step.title)}</h3>
                <p className="mt-1.5 max-w-[14rem] text-sm text-ink-500">{t(step.description)}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Stats */}
      <Section>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <Icon name={stat.icon} className="h-5 w-5" />
              </span>
              <p className="mt-3 text-2xl font-semibold text-ink-900 sm:text-3xl">
                <CountUp value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
              </p>
              <p className="mt-1 text-xs text-ink-500 sm:text-sm">{t(stat.label)}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Account Recovery platforms teaser */}
      <Section className="bg-ink-50/50">
        <SectionHeading
          eyebrow={t("Account Recovery")}
          title={t("Support across the platforms that matter most to your business")}
          description={t("Each service follows the same structured path: Problem → Diagnosis → Process → Timeline → Requirements → Resolution.")}
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {recoveryPlatforms.map((platform) => (
            <Card
              key={platform.slug}
              className="flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <h3 className="text-lg font-semibold text-ink-900">
                {t(platform.platform)}
              </h3>
              <p className="mt-2 flex-1 text-sm text-ink-500">
                {t(platform.summary)}
              </p>
              <ul className="mt-4 space-y-1.5 text-sm text-ink-600">
                {platform.issues.slice(0, 3).map((issue) => (
                  <li key={issue.slug} className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-brand-400" />
                    {t(issue.problem)}
                  </li>
                ))}
              </ul>
              <Link
                href={`/account-recovery#${platform.slug}`}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
              >{t("View {platform} issues", { platform: t(platform.platform) })}<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12h14m-6-6 6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </Card>
          ))}
        </div>
      </Section>

      {/* Account Health Check feature */}
      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow>{t("★ Signature feature")}</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl text-balance">{t("Find out your account's risk level before it becomes a problem")}</h2>
            <p className="mt-4 text-lg text-ink-500 text-balance">{t("The Account Health Check walks you through your platform, account type and recent activity, then our team reviews the details and returns a clear risk breakdown — not an official platform score, but our own assessment methodology.")}</p>
            <ul className="mt-6 space-y-3">
              {[
                "Select your platform and account type",
                "Answer a short set of structured questions",
                "Upload any relevant screenshots or notices",
                "Get a reviewed Account Health breakdown",
              ].map((step, i) => (
                <li key={step} className="flex items-start gap-3 text-sm text-ink-600">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                    {i + 1}
                  </span>
                  {t(step)}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <ButtonLink href="/check-my-account" size="lg">{t("Start Your Health Check")}</ButtonLink>
            </div>
          </div>

          <Card className="p-7">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink-900">{t("Account Health")}</p>
              <RiskBadge level="medium" />
            </div>
            <p className="mt-3 text-4xl font-semibold text-ink-900">
              68<span className="text-lg text-ink-400">/100</span>
            </p>
            <div className="mt-5 space-y-3">
              {[
                { label: "Account status", level: "low" as const },
                { label: "Policy compliance", level: "medium" as const },
                { label: "Security", level: "low" as const },
                { label: "Advertising", level: "high" as const },
                { label: "Business assets", level: "medium" as const },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between border-t border-ink-100 pt-3 first:border-t-0 first:pt-0"
                >
                  <span className="text-sm text-ink-600">{t(row.label)}</span>
                  <RiskBadge level={row.level} />
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs text-ink-400">{t("This is illustrative sample output. Scores reflect our internal assessment methodology, not an official score from Meta or any platform.")}</p>
          </Card>
        </div>
      </Section>

      {/* Case studies teaser */}
      <Section className="bg-ink-50/50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow={t("Proven track record")}
            title={t("Recent case outcomes")}
            description={t("A sample of resolved cases. Full write-ups with anonymized details are available in Case Studies.")}
          />
          <ButtonLink href="/case-studies" variant="outline" className="shrink-0">{t("View all case studies")}</ButtonLink>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {caseStudies.slice(0, 2).map((study) => (
            <Card key={study.id}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-700">{t("Case #")}{study.id}
                </span>
                <span className="rounded-full bg-risk-low-bg px-2.5 py-1 text-xs font-semibold text-risk-low">
                  {t(study.resolution)}
                </span>
              </div>
              <h3 className="mt-3 text-base font-semibold text-ink-900">
                {t(study.platform)} — {t(study.problem)}
              </h3>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-ink-400">{t("Account type")}</dt>
                  <dd className="text-ink-700">{t(study.accountType)}</dd>
                </div>
                <div>
                  <dt className="text-ink-400">{t("Timeline")}</dt>
                  <dd className="text-ink-700">{t(study.timeline)}</dd>
                </div>
              </dl>
              <p className="mt-4 text-sm italic text-ink-500">
                {t(study.feedback)}
              </p>
            </Card>
          ))}
        </div>
      </Section>

      {/* Trust & security */}
      <Section>
        <SectionHeading
          eyebrow={t("Trust & security")}
          title={t("Your accounts, handled responsibly")}
          align="center"
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {trustPoints.map((point) => (
            <div key={point.title} className="text-center sm:text-left">
              <h3 className="text-base font-semibold text-ink-900">
                {t(point.title)}
              </h3>
              <p className="mt-2 text-sm text-ink-500">{t(point.description)}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Final CTA */}
      <Section className="pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-8 py-14 text-center sm:px-16">
          <h2 className="text-3xl font-semibold text-white text-balance sm:text-4xl">{t("Ready to secure your digital presence?")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-brand-100 text-balance">{t("Answer a few questions and we'll tell you whether your case is a good fit for professional recovery support.")}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink
              href="/recovery-eligibility"
              size="lg"
              className="!bg-white !text-brand-700 hover:!bg-brand-50"
            >{t("Check Recovery Eligibility")}</ButtonLink>
            <ButtonLink
              href="/contact"
              variant="outline"
              size="lg"
              className="!border-white/40 !text-white hover:!bg-white/10"
            >{t("Talk to Our Team")}</ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
