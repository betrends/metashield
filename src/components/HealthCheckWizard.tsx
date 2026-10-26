"use client";

import { useT } from "@/lib/i18n/client";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { ProgressBar } from "@/components/wizard/ProgressBar";
import { OptionCard } from "@/components/wizard/OptionCard";
import {
  scoreHealthCheck,
  type DescribeAnswers,
  type HealthCheckResult,
} from "@/lib/health-check-score";
import { setLocalAccount } from "@/lib/portal/local-records";
import { createClient } from "@/lib/supabase/client";
import { createAccount } from "@/lib/portal/data";
import { useStepHistory } from "@/lib/use-step-history";

const platforms = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "meta-business", label: "Meta Business" },
  { value: "tiktok", label: "TikTok" },
  { value: "google-ads", label: "Google Ads" },
  { value: "other", label: "Other" },
];

const accountTypes = [
  { value: "personal", label: "Personal" },
  { value: "creator", label: "Creator" },
  { value: "business", label: "Business" },
  { value: "agency", label: "Agency" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "advertiser", label: "Advertiser" },
];

const accountAges = [
  { value: "under-6-months", label: "Under 6 months" },
  { value: "6-12-months", label: "6–12 months" },
  { value: "1-3-years", label: "1–3 years" },
  { value: "3-plus-years", label: "3+ years" },
];

const audienceSizes = [
  { value: "under-1000", label: "Under 1,000" },
  { value: "1000-10000", label: "1,000–10,000" },
  { value: "10000-100000", label: "10,000–100,000" },
  { value: "100000-plus", label: "100,000+" },
];

const advertisingActivities = [
  { value: "none", label: "No advertising" },
  { value: "occasional", label: "Occasional campaigns" },
  { value: "regular", label: "Regular / ongoing campaigns" },
];

const yesNoQuestions: {
  key: keyof Pick<
    DescribeAnswers,
    | "previousRestrictions"
    | "previousWarnings"
    | "previousDisabledAssociated"
    | "recentUsernameChange"
    | "recentActivityChange"
  >;
  question: string;
}[] = [
  { key: "previousRestrictions", question: "Has this account had previous restrictions?" },
  { key: "previousWarnings", question: "Has this account received previous warnings?" },
  {
    key: "previousDisabledAssociated",
    question: "Have other accounts linked to this business been disabled before?",
  },
  { key: "recentUsernameChange", question: "Any recent username or name changes?" },
  { key: "recentActivityChange", question: "Any recent major activity changes (e.g. posting volume, ad spend)?" },
];

const evidenceTypes = [
  "Screenshots",
  "Warning messages",
  "Account status screenshots",
  "Emails from the platform",
  "Ad account screenshots",
  "Business Manager screenshots",
];

const stepLabels = [
  "Select platform",
  "Select account type",
  "Describe the account",
  "Upload evidence",
  "Your results",
];

type UploadedFile = { name: string; size: number };

export function HealthCheckWizard() {
  const t = useT();
  const cardRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  // Each step is a browser-history entry: the phone's Back button goes to
  // the previous question instead of leaving the page.
  const stepNav = useStepHistory(step, setStep, stepLabels.length - 1);
  const [platform, setPlatform] = useState("");
  const [accountUsername, setAccountUsername] = useState("");
  const [accountType, setAccountType] = useState("");
  const [describe, setDescribe] = useState<DescribeAnswers>({
    accountAge: "",
    audienceSize: "",
    advertisingActivity: "",
    previousRestrictions: false,
    previousWarnings: false,
    previousDisabledAssociated: false,
    recentUsernameChange: false,
    recentActivityChange: false,
  });
  const [businessCategory, setBusinessCategory] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [contactInfo, setContactInfo] = useState({ name: "", email: "", phone: "" });
  const [result, setResult] = useState<HealthCheckResult | null>(null);
  const [submittingResult, setSubmittingResult] = useState(false);
  // Set only when this wizard runs inside the portal for an
  // already-signed-in user — the result then saves straight to their real
  // account instead of the anonymous localStorage + "sign up to see it"
  // hand-off.
  const [createdAccountId, setCreatedAccountId] = useState<string | null>(null);

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

  const canContinue = () => {
    switch (step) {
      case 0:
        return Boolean(platform && accountUsername.trim());
      case 1:
        return Boolean(accountType);
      case 2:
        return Boolean(describe.accountAge && describe.audienceSize && describe.advertisingActivity);
      case 3:
        return true;
      default:
        return true;
    }
  };

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).map((f) => ({ name: f.name, size: f.size }));
    setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  // Carry the name/email they typed over to the sign-up form (kept out of
  // the URL so personal details don't end up in browser history or logs).
  function rememberSignupDetails() {
    try {
      sessionStorage.setItem(
        "ms-signup-prefill",
        JSON.stringify({ name: contactInfo.name, email: contactInfo.email })
      );
    } catch {
      // Storage blocked — they can type it on the sign-up form.
    }
  }

  async function handleNext() {
    if (step === 3) {
      const computed = scoreHealthCheck(describe);
      setResult(computed);
      setSubmittingResult(true);

      const platformLabel = platforms.find((p) => p.value === platform)?.label ?? platform;
      const categories = computed.categories.map((c) => ({ label: c.label, level: c.level }));

      // Already signed in (running this from inside the portal, not the
      // marketing site) — save straight to their real account rather than
      // the anonymous localStorage + "sign up to see it" hand-off.
      let signedInAccountId: string | null = null;
      try {
        const {
          data: { user },
        } = await createClient().auth.getUser();
        if (user) {
          const created = await createAccount({
            handle: accountUsername || "Your account",
            platform: platformLabel,
            health: computed.overall,
            level: computed.overallLevel,
            protectionActive: false,
            categories,
          });
          signedInAccountId = created.id;
        }
      } catch (err) {
        console.error("Failed to save account:", err);
      }

      if (signedInAccountId) {
        setCreatedAccountId(signedInAccountId);
      } else {
        // Persist so the portal shows this account instead of only
        // generic sample data once they sign up right after.
        setLocalAccount({
          id: "local-account",
          handle: accountUsername || "Your account",
          platform: platformLabel,
          health: computed.overall,
          level: computed.overallLevel,
          protectionActive: false,
          categories,
        });
        // Let the team know a submission came in — only possible when we
        // actually have contact details (a signed-in user's session, or a
        // previous run in this browser); anonymous visitors are no longer
        // asked for their name/email inside this wizard, so there's
        // nothing to notify with until they sign up.
        if (contactInfo.name && contactInfo.email) {
          fetch("/api/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              source: "health_check",
              name: contactInfo.name,
              email: contactInfo.email,
              phone: contactInfo.phone || null,
              metadata: {
                platform: platformLabel,
                handle: accountUsername,
                overallScore: computed.overall,
                riskLevel: computed.overallLevel,
              },
            }),
          }).catch(() => {});
        }
      }
      setSubmittingResult(false);
    }
    stepNav.next();
  }

  function handleBack() {
    stepNav.back();
  }

  function handleRestart() {
    stepNav.restart();
    setPlatform("");
    setAccountUsername("");
    setAccountType("");
    setDescribe({
      accountAge: "",
      audienceSize: "",
      advertisingActivity: "",
      previousRestrictions: false,
      previousWarnings: false,
      previousDisabledAssociated: false,
      recentUsernameChange: false,
      recentActivityChange: false,
    });
    setBusinessCategory("");
    setFiles([]);
    setContactInfo({ name: "", email: "", phone: "" });
    setResult(null);
    setCreatedAccountId(null);
  }

  return (
    <Card ref={cardRef} className="p-6 sm:p-8">
      {step < 4 ? (
        <div className="mb-8">
          <ProgressBar step={step} totalSteps={4} labels={stepLabels} />
        </div>
      ) : null}

      {step === 0 ? (
        <div>
          <h2 className="text-xl font-semibold text-ink-900">{t("Which platform is this about?")}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {platforms.map((p) => (
              <OptionCard
                key={p.value}
                label={t(p.label)}
                selected={platform === p.value}
                onClick={() => setPlatform(p.value)}
              />
            ))}
          </div>

          <label className="mt-6 block text-sm">
            <span className="font-semibold text-ink-700">{t("Account username / handle")}</span>
            <input
              type="text"
              value={accountUsername}
              onChange={(e) => setAccountUsername(e.target.value)}
              placeholder={t("e.g. @yourhandle or Page name")}
              className="mt-1.5 w-full rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <span className="mt-1.5 block text-xs text-ink-400">{t("So our team knows exactly which account to review. We will never ask for your password.")}</span>
          </label>
        </div>
      ) : null}

      {step === 1 ? (
        <div>
          <h2 className="text-xl font-semibold text-ink-900">{t("What type of account is it?")}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {accountTypes.map((type) => (
              <OptionCard
                key={type.value}
                label={t(type.label)}
                selected={accountType === type.value}
                onClick={() => setAccountType(type.value)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-8">
          <h2 className="text-xl font-semibold text-ink-900">{t("Tell us a bit more about the account")}</h2>

          <div>
            <p className="text-sm font-semibold text-ink-700">{t("Account age")}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {accountAges.map((a) => (
                <OptionCard
                  key={a.value}
                  label={t(a.label)}
                  selected={describe.accountAge === a.value}
                  onClick={() => setDescribe((d) => ({ ...d, accountAge: a.value }))}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-ink-700">{t("Approximate audience size")}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {audienceSizes.map((a) => (
                <OptionCard
                  key={a.value}
                  label={t(a.label)}
                  selected={describe.audienceSize === a.value}
                  onClick={() => setDescribe((d) => ({ ...d, audienceSize: a.value }))}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-ink-700">{t("Advertising activity")}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {advertisingActivities.map((a) => (
                <OptionCard
                  key={a.value}
                  label={t(a.label)}
                  selected={describe.advertisingActivity === a.value}
                  onClick={() => setDescribe((d) => ({ ...d, advertisingActivity: a.value }))}
                />
              ))}
            </div>
          </div>

          <label className="block text-sm">
            <span className="font-semibold text-ink-700">{t("Business category (optional)")}</span>
            <input
              type="text"
              value={businessCategory}
              onChange={(e) => setBusinessCategory(e.target.value)}
              placeholder={t("e.g. Fashion retail, coaching, e-commerce")}
              className="mt-1.5 w-full rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-ink-700">{t("A few quick yes/no questions")}</p>
            {yesNoQuestions.map((q) => (
              <div
                key={q.key}
                className="flex flex-col gap-3 rounded-xl border border-ink-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm text-ink-700">{t(q.question)}</span>
                <div className="flex gap-2">
                  {[
                    { label: "Yes", value: true },
                    { label: "No", value: false },
                  ].map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setDescribe((d) => ({ ...d, [q.key]: opt.value }))}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                        describe[q.key] === opt.value
                          ? "bg-brand-600 text-white"
                          : "bg-ink-50 text-ink-600 hover:bg-ink-100"
                      }`}
                    >
                      {t(opt.label)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div>
          <h2 className="text-xl font-semibold text-ink-900">{t("Upload evidence")}</h2>
          <p className="mt-2 text-sm text-ink-500">{t("Optional, but it helps our team assess your case faster. Accepted examples:")}{" "}{evidenceTypes.join(", ")}.
          </p>

          <label className="mt-6 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-200 px-6 py-10 text-center hover:border-brand-400 hover:bg-brand-50/40">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-brand-600">
              <path
                d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm font-semibold text-ink-800">{t("Click to add files")}</span>
            <span className="text-xs text-ink-400">{t("Screenshots, PDFs or emails")}</span>
            <input type="file" multiple className="hidden" onChange={handleFileChange} />
          </label>

          {files.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {files.map((f) => (
                <li
                  key={f.name}
                  className="flex items-center justify-between rounded-xl border border-ink-100 px-4 py-2.5 text-sm"
                >
                  <span className="truncate text-ink-700">{t(f.name)}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(f.name)}
                    className="text-xs font-semibold text-ink-400 hover:text-risk-high"
                  >{t("Remove")}</button>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-4 text-xs text-ink-400">{t("We will never ask for your social media password — do not upload it in any file.")}</p>
        </div>
      ) : null}


      {step === 4 && result ? (
        <div>
          {/* Header — urgent vs standard */}
          {result.overall < 50 ? (
            <div className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-risk-high-bg text-risk-high">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 9v4m0 4h.01M10.3 4.2 2.8 17A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <h2 className="mt-4 text-xl font-semibold text-ink-900">{t("Your account is at risk")}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">{t("Your score flags serious risk factors. Without protection, restrictions or a full disable could happen without warning.")}</p>
            </div>
          ) : (
            <div className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-risk-low-bg text-risk-low">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <h2 className="mt-4 text-xl font-semibold text-ink-900">{t("Your Account Health Report is ready")}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">{t("Here's your full score and category breakdown.")}</p>
            </div>
          )}

          {/* Score card */}
          <div className={`mx-auto mt-8 max-w-sm rounded-xl p-6 ${result.overall < 50 ? "border-2 border-risk-high bg-risk-high-bg/30" : "border border-ink-200"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-ink-900">{t("Account Health Score")}</p>
                {accountUsername ? (
                  <p className="mt-0.5 text-xs text-ink-400">{accountUsername}</p>
                ) : null}
              </div>
              <RiskBadge level={result.overallLevel} />
            </div>
            <p className={`mt-3 text-5xl font-semibold ${result.overall < 50 ? "text-risk-high" : "text-ink-900"}`}>{result.overall}</p>
            <div className="mt-5 space-y-3">
              {result.categories.map((cat) => (
                <div
                  key={cat.label}
                  className="flex items-center justify-between border-t border-ink-100 pt-3 first:border-t-0 first:pt-0"
                >
                  <span className="text-sm text-ink-600">{t(cat.label)}</span>
                  <RiskBadge level={cat.level} />
                </div>
              ))}
            </div>
          </div>

          <p className="mx-auto mt-3 max-w-sm text-center text-xs text-ink-400">{t("Automated preliminary assessment — reviewed by our team, not an official platform score.")}</p>

          {/* Account Protection CTA — urgent below 50, standard above */}
          {result.overall < 50 ? (
            <div className="mx-auto mt-6 max-w-sm overflow-hidden rounded-2xl border-2 border-risk-high bg-white p-6 text-center shadow-lg">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-risk-high-bg text-risk-high">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 9v4m0 4h.01M10.3 4.2 2.8 17A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <p className="mt-3 text-base font-bold text-ink-900">{t("This account needs protection — now")}</p>
              <p className="mt-1.5 mx-auto max-w-[16rem] text-xs text-ink-500">{t("One or more risk factors on this account are serious. Account Protection gives you monthly monitoring and early intervention before platforms act.")}</p>
              {createdAccountId ? (
                <ButtonLink href="/portal/billing" size="sm" className="mt-4 w-full">{t("Get Account Protection")}</ButtonLink>
              ) : (
                <ButtonLink
                  href="/portal/login?mode=sign-up"
                  onClick={rememberSignupDetails}
                  size="sm"
                  className="mt-4 w-full"
                >{t("Get Account Protection Now")}</ButtonLink>
              )}
              <p className="mt-2 text-xs text-ink-400">{t("Takes 2 minutes to set up")}</p>
            </div>
          ) : (
            <div className="mx-auto mt-6 max-w-sm overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-center shadow-lg">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 9.5 4.6-.6 8-4.4 8-9.5V6l-8-3.5Z" fill="currentColor" fillOpacity="0.18"/>
                  <path d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 9.5 4.6-.6 8-4.4 8-9.5V6l-8-3.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                  <path d="m8.5 12.2 2.4 2.4 4.6-4.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <p className="mt-3 text-base font-bold text-white">{t("Protect this account")}</p>
              <p className="mt-1.5 mx-auto max-w-[15rem] text-xs text-brand-100">{t("A one-off check shows the risk — Account Protection keeps you monitored and intervenes before a restriction hits.")}</p>
              {createdAccountId ? (
                <ButtonLink href="/portal/billing" size="sm" className="mt-4 !bg-white !text-brand-700 hover:!bg-brand-50">{t("Subscribe to Account Protection")}</ButtonLink>
              ) : (
                <ButtonLink
                  href="/portal/login?mode=sign-up"
                  onClick={rememberSignupDetails}
                  size="sm"
                  className="mt-4 !bg-white !text-brand-700 hover:!bg-brand-50"
                >{t("Sign Up for Account Protection")}</ButtonLink>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-col items-center justify-center gap-x-6 gap-y-2 text-center sm:flex-row">
            <Link
              href="/recovery-eligibility"
              className="text-sm font-semibold text-brand-700 hover:text-brand-800"
            >{t("Already Restricted? Check Recovery")}</Link>
            <button
              type="button"
              onClick={handleRestart}
              className="text-sm font-semibold text-ink-400 hover:text-ink-700"
            >{t("Check another account")}</button>
          </div>
        </div>
      ) : null}

      {step < 4 ? (
        <div className="mt-9 flex items-center justify-between border-t border-ink-100 pt-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 0}
            className={step === 0 ? "invisible" : ""}
          >{t("Back")}</Button>
          <Button onClick={handleNext} disabled={!canContinue() || submittingResult}>
            {t(step === 3 ? (submittingResult ? "Submitting…" : "See My Results") : "Continue")}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
