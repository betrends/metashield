"use client";

import { useT } from "@/lib/i18n/client";
import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/wizard/ProgressBar";
import { OptionCard } from "@/components/wizard/OptionCard";
import { setLocalCase, todayLabel } from "@/lib/portal/local-records";
import { createClient } from "@/lib/supabase/client";
import { createCase } from "@/lib/portal/data";
import { FOLLOWER_RANGES, getFollowerRangeFeeKobo, formatNaira, type FollowerRange } from "@/lib/portal/case-fees";
import { depositFor } from "@/lib/portal/payments";

const platforms = [
  "Instagram",
  "Facebook",
  "Meta Business",
  "TikTok",
  "Google Ads",
  "Other",
];

const issues = [
  "Account disabled",
  "Account suspended",
  "Account/integrity restricted",
  "Hacked or compromised",
  "Login / access problem",
  "Appeal already rejected",
];

const stepLabels = ["Platform", "What happened", "Followers", "Details", "Error Screenshot", "Contact Info", "Result"];

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^\+?[\d\s\-().]{7,20}$/;

const fieldCls = "mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:ring-2";
const validCls = `${fieldCls} border-ink-200 focus:border-brand-400 focus:ring-brand-100`;
const errorCls = `${fieldCls} border-risk-high focus:border-risk-high focus:ring-risk-high-bg`;

export function EligibilityWizard() {
  const t = useT();
  const cardRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [platform, setPlatform] = useState("");
  const [issue, setIssue] = useState("");
  const [followerRange, setFollowerRange] = useState<FollowerRange | null>(null);
  const [alreadyAppealed, setAlreadyAppealed] = useState<boolean | null>(null);
  const [hasAccountAccess, setHasAccountAccess] = useState<boolean | null>(null);
  const [errorScreenshot, setErrorScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [contactInfo, setContactInfo] = useState({ name: "", email: "", phone: "" });
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittingCase, setSubmittingCase] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  // Set only when this wizard runs inside the portal for an
  // already-signed-in user — the case then saves straight to their real
  // account instead of the anonymous localStorage + "sign up to see it"
  // hand-off.
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);

  useEffect(() => {
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  useEffect(() => {
    // Reading the session (an external system) can only safely happen
    // after mount. Best-effort prefill only — failing silently is fine,
    // they can just type their details.
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (!user) return;
        setContactInfo((c) => ({
          ...c,
          name: c.name || (user.user_metadata?.full_name as string | undefined) || "",
          email: c.email || user.email || "",
        }));
      })
      .catch(() => {});
  }, []);

  function handleScreenshotFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    setErrorScreenshot(file);
    setScreenshotUrl(null);
    const reader = new FileReader();
    reader.onload = (e) => setScreenshotPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  const canContinue = () => {
    switch (step) {
      case 0:
        return Boolean(platform);
      case 1:
        return Boolean(issue);
      case 2:
        return Boolean(followerRange);
      case 3:
        return alreadyAppealed !== null && hasAccountAccess !== null;
      case 4:
        return Boolean(errorScreenshot);
      case 5:
        return Boolean(
          contactInfo.name &&
          contactInfo.email &&
          emailRe.test(contactInfo.email) &&
          (!contactInfo.phone || phoneRe.test(contactInfo.phone))
        );
      default:
        return true;
    }
  };

  function handleNext() {
    setStep((s) => Math.min(s + 1, stepLabels.length - 1));
  }
  function handleBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmitCase() {
    // Terms (incl. the 50% deposit and refund policy) must be accepted;
    // the server records the acceptance with the case.
    if (!termsAgreed) return;
    setSubmittingCase(true);

    // Upload screenshot first if one was selected
    let uploadedUrl: string | null = screenshotUrl;
    if (errorScreenshot && !uploadedUrl) {
      try {
        const fd = new FormData();
        fd.append("file", errorScreenshot);
        const res = await fetch("/api/upload-screenshot", { method: "POST", body: fd });
        if (res.ok) {
          const { url } = await res.json();
          uploadedUrl = url;
          setScreenshotUrl(url);
        }
      } catch {
        // Non-fatal — proceed without the screenshot URL
      }
    }

    // Already signed in (running this from inside the portal, not the
    // marketing site) — save straight to their real case rather than the
    // anonymous localStorage + "sign up to see it" hand-off.
    let signedInCaseId: string | null = null;
    try {
      const {
        data: { user },
      } = await createClient().auth.getUser();
      if (user) {
        const created = await createCase({
          title: `${platform} Account Recovery`,
          platform,
          accountHandle: platform,
          issue,
          followerRange: followerRange || undefined,
          timeline: [{ event: "Case submitted" }],
          screenshotUrl: uploadedUrl,
          termsAccepted: termsAgreed,
        });
        signedInCaseId = created.id;
      }
    } catch (err) {
      console.error("Failed to save case:", err);
    }

    if (signedInCaseId) {
      setCreatedCaseId(signedInCaseId);
    } else {
      // Persist so the portal shows this case instead of only generic
      // sample data once they sign up right after.
      setLocalCase({
        id: "local-case",
        title: `${platform} Account Recovery`,
        platform,
        accountHandle: platform,
        stage: "New Lead",
        issue,
        timeline: [{ date: todayLabel(), event: "Case submitted" }],
      });
      // Let the team know a submission came in. Fire-and-forget — this
      // shouldn't block or fail the wizard if the request has a hiccup.
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "recovery_eligibility",
          name: contactInfo.name,
          email: contactInfo.email,
          phone: contactInfo.phone || null,
          metadata: {
            platform,
            issue,
            followerRange,
            recoveryFeeKobo: followerRange ? getFollowerRangeFeeKobo(followerRange) : null,
            alreadyAppealed,
            hasAccountAccess,
            screenshotUrl: uploadedUrl,
          },
        }),
      }).catch(() => {});
    }
    setSubmittingCase(false);
    setSubmitted(true);
  }

  return (
    <Card ref={cardRef} className="p-6 sm:p-8">
      {step < 6 ? (
        <div className="mb-8">
          <ProgressBar step={step} totalSteps={6} labels={stepLabels} />
        </div>
      ) : null}

      {step === 0 ? (
        <div>
          <h2 className="text-xl font-semibold text-ink-900">{t("Which platform is this about?")}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {platforms.map((p) => (
              <OptionCard
                key={p}
                label={t(p)}
                selected={platform === p}
                onClick={() => setPlatform(p)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div>
          <h2 className="text-xl font-semibold text-ink-900">{t("What happened?")}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {issues.map((i) => (
              <OptionCard
                key={i}
                label={t(i)}
                selected={issue === i}
                onClick={() => setIssue(i)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div>
          <h2 className="text-xl font-semibold text-ink-900">{t("How many followers?")}</h2>
          <p className="mt-2 text-sm text-ink-500">{t("This helps us calculate the recovery fee for your case.")}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {FOLLOWER_RANGES.map((range) => (
              <OptionCard
                key={range.value}
                label={t(range.label)}
                selected={followerRange === range.value}
                onClick={() => setFollowerRange(range.value as FollowerRange)}
              />
            ))}
          </div>
          {followerRange ? (
            <div className="mt-6">
              <FeeBreakdown totalKobo={getFollowerRangeFeeKobo(followerRange)} t={t} />
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-ink-900">{t("A couple more details")}</h2>
          <div>
            <p className="text-sm font-semibold text-ink-700">{t("Have you already submitted an appeal yourself?")}</p>
            <div className="mt-3 flex gap-2">
              {[
                { label: "Yes", value: true },
                { label: "No", value: false },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setAlreadyAppealed(opt.value)}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                    alreadyAppealed === opt.value
                      ? "bg-brand-600 text-white"
                      : "bg-ink-50 text-ink-600 hover:bg-ink-100"
                  }`}
                >
                  {t(opt.label)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-700">{t("Do you still have access to the account's registered email or phone?")}</p>
            <div className="mt-3 flex gap-2">
              {[
                { label: "Yes", value: true },
                { label: "No", value: false },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setHasAccountAccess(opt.value)}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                    hasAccountAccess === opt.value
                      ? "bg-brand-600 text-white"
                      : "bg-ink-50 text-ink-600 hover:bg-ink-100"
                  }`}
                >
                  {t(opt.label)}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div>
          <h2 className="text-xl font-semibold text-ink-900">{t("Upload a screenshot of the error")}</h2>
          <p className="mt-2 text-sm text-ink-500">{t("A photo or screenshot showing the error message or disabled notice — this helps our team understand exactly what you're facing.")}</p>
          <div className="mt-6">
            <input
              id="screenshot-input"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => handleScreenshotFile(e.target.files?.[0])}
            />
            {screenshotPreview ? (
              <div className="relative overflow-hidden rounded-2xl border border-ink-200 bg-ink-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={screenshotPreview}
                  alt={t("Screenshot preview")}
                  className="max-h-72 w-full object-contain"
                />
                <div className="flex items-center justify-between border-t border-ink-100 bg-white px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-risk-low">
                      <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="truncate text-sm text-ink-700">{t(errorScreenshot?.name)}</span>
                  </div>
                  <label
                    htmlFor="screenshot-input"
                    className="ml-4 shrink-0 cursor-pointer text-xs font-semibold text-brand-600 hover:text-brand-800"
                  >{t("Change")}</label>
                </div>
              </div>
            ) : (
              <label
                htmlFor="screenshot-input"
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  handleScreenshotFile(e.dataTransfer.files?.[0]);
                }}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
                  dragging
                    ? "border-brand-400 bg-brand-50"
                    : "border-ink-200 bg-ink-50 hover:border-brand-300 hover:bg-brand-50"
                }`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-brand-600">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-900">{t("Drag & drop your screenshot here")}</p>
                  <p className="mt-1 text-xs text-ink-500">{t("or")}{" "}<span className="text-brand-600 underline">{t("browse files")}</span>{" "}{t("— JPG, PNG, WEBP accepted")}</p>
                </div>
              </label>
            )}
          </div>
        </div>
      ) : null}

      {step === 5 ? (
        <div>
          <h2 className="text-xl font-semibold text-ink-900">{t("Your contact details")}</h2>
          <p className="mt-2 text-sm text-ink-500">{t("We'll use this to follow up about your case.")}</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-semibold text-ink-700">{t("Full name")}</span>
              <input
                type="text"
                value={contactInfo.name}
                onChange={(e) => setContactInfo((c) => ({ ...c, name: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                placeholder={t("Your name")}
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-ink-700">{t("Email")}</span>
              <input
                type="email"
                value={contactInfo.email}
                onChange={(e) => {
                  setContactInfo((c) => ({ ...c, email: e.target.value }));
                  setEmailError(null);
                }}
                onBlur={(e) => {
                  if (e.target.value && !emailRe.test(e.target.value))
                    setEmailError("Please enter a valid email address.");
                }}
                className={emailError ? errorCls : validCls}
                placeholder={t("you@example.com")}
              />
              {emailError ? <span className="mt-1 block text-xs text-risk-high">{t(emailError)}</span> : null}
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-semibold text-ink-700">{t("Phone / WhatsApp (optional)")}</span>
              <input
                type="tel"
                value={contactInfo.phone}
                onChange={(e) => {
                  setContactInfo((c) => ({ ...c, phone: e.target.value }));
                  setPhoneError(null);
                }}
                onBlur={(e) => {
                  if (e.target.value && !phoneRe.test(e.target.value))
                    setPhoneError("Please enter a valid phone number (e.g. +234 803 123 4567).");
                }}
                className={phoneError ? errorCls : validCls}
                placeholder="+234 803 123 4567"
              />
              {phoneError ? <span className="mt-1 block text-xs text-risk-high">{t(phoneError)}</span> : null}
            </label>
          </div>
        </div>
      ) : null}

      {step === 6 ? (
        <div className="text-center">
          {submitted ? (
            <>
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-risk-low-bg text-risk-low">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="m5 13 4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <h2 className="mt-4 text-xl font-semibold text-ink-900">{t("Case submitted,")}{" "}{contactInfo.name.split(" ")[0] || "there"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
                {t(createdCaseId
                  ? "An agent has been assigned to your case and is ready to start — pay the 50% deposit from the case page to begin recovery."
                  : "Create your free portal account and an agent will be assigned to your case right away — you'll see their name, be able to message them directly, and pay to get started.")}
              </p>

              {createdCaseId ? (
                <ButtonLink href={`/portal/cases/${createdCaseId}`} size="lg" className="mt-6">{t("View Your Case")}</ButtonLink>
              ) : (
                <ButtonLink
                  href={`/portal/login?name=${encodeURIComponent(contactInfo.name)}&email=${encodeURIComponent(contactInfo.email)}`}
                  size="lg"
                  className="mt-6"
                >{t("Create Your Portal Account")}</ButtonLink>
              )}
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-semibold text-brand-800">{t("🎉 Possible Recovery Case")}</span>
              <h2 className="mx-auto mt-4 max-w-md text-xl font-semibold text-ink-900">{t("Good news,")}{" "}{contactInfo.name.split(" ")[0] || "there"}{" "}{t("— this looks like a strong fit for recovery.")}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">{t("We won't hand you a made-up percentage — real odds depend on a proper look at your case. What we can say is that your situation matches cases we know how to work, and the next step is a real assessment by our team.")}</p>

              <dl className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-ink-100 p-5 text-left text-sm">
                <dt className="text-ink-400">{t("Platform")}</dt>
                <dd className="text-ink-800">{t(platform)}</dd>
                <dt className="text-ink-400">{t("Issue")}</dt>
                <dd className="text-ink-800">{t(issue)}</dd>
                <dt className="text-ink-400">{t("Followers")}</dt>
                <dd className="text-ink-800">{followerRange ? FOLLOWER_RANGES.find(r => r.value === followerRange)?.label : "—"}</dd>
                <dt className="text-ink-400">{t("Already appealed")}</dt>
                <dd className="text-ink-800">{t(alreadyAppealed ? "Yes" : "No")}</dd>
                <dt className="text-ink-400">{t("Account access")}</dt>
                <dd className="text-ink-800">{t(hasAccountAccess ? "Yes" : "No")}</dd>
              </dl>

              {followerRange ? (
                <div className="mx-auto mt-6 max-w-sm">
                  <FeeBreakdown totalKobo={getFollowerRangeFeeKobo(followerRange)} t={t} />
                </div>
              ) : null}

              <div className="mx-auto mt-6 max-w-sm space-y-3 rounded-xl border border-ink-100 p-4 text-left">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id="terms-agree"
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
                  />
                  <span className="text-xs leading-relaxed text-ink-600">{t("I have read and agree to the")}{" "}
                    <a href="/terms" target="_blank" className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800">{t("Terms of Service")}</a>{t(", including the recovery process, payment and refund policy, and the")}{" "}
                    <span className="font-semibold text-ink-800">{t("exclusivity requirement")}</span>{" "}{t("— I will not engage another recovery service while my case is under review.")}</span>
                </label>
              </div>

              <div className="mt-5 flex justify-center">
                <Button size="lg" onClick={handleSubmitCase} disabled={submittingCase || !termsAgreed}>
                  {t(submittingCase ? "Submitting…" : "Submit Case")}
                </Button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {step < 6 ? (
        <div className="mt-9 flex items-center justify-between border-t border-ink-100 pt-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 0}
            className={step === 0 ? "invisible" : ""}
          >{t("Back")}</Button>
          <Button onClick={handleNext} disabled={!canContinue()}>
            {t(step === 5 ? "See My Result" : "Continue")}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

// The payment plan shown before a client submits: total fee, the 50%
// deposit that starts recovery, and the 50% balance due after a
// successful recovery (same split the case page and admin use —
// lib/portal/payments.ts).
function FeeBreakdown({ totalKobo, t }: { totalKobo: number; t: (text: string) => string }) {
  const depositKobo = depositFor(totalKobo);
  const balanceKobo = totalKobo - depositKobo;
  return (
    <div className="rounded-xl bg-brand-50 p-5 text-left">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{t("Recovery Fee")}</p>
      <p className="mt-1 text-3xl font-semibold text-brand-900">{formatNaira(totalKobo)}</p>
      <dl className="mt-4 space-y-3 border-t border-brand-100 pt-4 text-sm">
        <div className="flex items-start justify-between gap-4">
          <dt>
            <span className="font-semibold text-ink-900">{t("Deposit to start (50%)")}</span>
            <span className="block text-xs text-ink-500">{t("Paid by bank transfer after you submit — recovery starts once it's confirmed")}</span>
          </dt>
          <dd className="shrink-0 font-semibold text-ink-900">{formatNaira(depositKobo)}</dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt>
            <span className="font-semibold text-ink-900">{t("Balance after recovery (50%)")}</span>
            <span className="block text-xs text-ink-500">{t("Due within 24 hours of a successful recovery")}</span>
          </dt>
          <dd className="shrink-0 font-semibold text-ink-900">{formatNaira(balanceKobo)}</dd>
        </div>
      </dl>
    </div>
  );
}
