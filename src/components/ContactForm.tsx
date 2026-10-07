"use client";

import { useT } from "@/lib/i18n/client";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";

const platforms = ["Instagram", "Facebook", "Meta Business", "TikTok", "Google Ads", "Other"];

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^\+?[\d\s\-().]{7,20}$/;

const fieldCls = "mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:ring-2";
const validCls = `${fieldCls} border-ink-200 focus:border-brand-400 focus:ring-brand-100`;
const errorCls = `${fieldCls} border-risk-high focus:border-risk-high focus:ring-risk-high-bg`;

export function ContactForm() {
  const t = useT();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    const formData = new FormData(e.currentTarget);
    const emailVal = String(formData.get("email") ?? "");
    const phoneVal = String(formData.get("phone") ?? "").trim();

    let hasError = false;
    if (!emailRe.test(emailVal)) {
      setEmailError("Please enter a valid email address.");
      hasError = true;
    }
    if (phoneVal && !phoneRe.test(phoneVal)) {
      setPhoneError("Please enter a valid phone number (e.g. +234 803 123 4567).");
      hasError = true;
    }
    if (hasError) return;

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "contact_form",
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone") || null,
          message: formData.get("message"),
          metadata: { platform: formData.get("platform") || undefined },
        }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
    } catch {
      setError("Something went wrong sending that — please try again, or email us directly.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-ink-100 bg-white p-8 text-center">
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
        <h3 className="mt-4 text-lg font-semibold text-ink-900">{t("Thanks — we've got your message")}</h3>
        <p className="mt-2 text-sm text-ink-500">{t("Our team typically responds within 24 hours. We'll reach out using the contact details you provided.")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-ink-100 bg-white p-7 space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-ink-700">{t("Full name")}</span>
          <input
            required
            type="text"
            name="name"
            className="mt-1.5 w-full rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            placeholder={t("Your name")}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink-700">{t("Email")}</span>
          <input
            required
            type="email"
            name="email"
            onChange={() => setEmailError(null)}
            className={emailError ? errorCls : validCls}
            placeholder={t("you@example.com")}
          />
          {emailError ? <span className="mt-1 block text-xs text-risk-high">{t(emailError)}</span> : null}
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-ink-700">{t("Phone / WhatsApp")}</span>
          <input
            type="tel"
            name="phone"
            onChange={() => setPhoneError(null)}
            className={phoneError ? errorCls : validCls}
            placeholder="+234 803 123 4567"
          />
          {phoneError ? <span className="mt-1 block text-xs text-risk-high">{t(phoneError)}</span> : null}
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink-700">{t("Platform")}</span>
          <select
            name="platform"
            className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            defaultValue=""
          >
            <option value="" disabled>{t("Select a platform")}</option>
            {platforms.map((p) => (
              <option key={p} value={p}>
                {t(p)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-ink-700">{t("What's going on with your account?")}</span>
        <textarea
          required
          name="message"
          rows={5}
          className="mt-1.5 w-full rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          placeholder={t("Tell us what happened, and when.")}
        />
      </label>

      <p className="text-xs text-ink-400">{t("We will never ask for your social media password — do not include it here or in any attachment.")}</p>

      {error ? (
        <p className="rounded-xl bg-risk-high-bg px-3.5 py-2.5 text-xs font-medium text-risk-high">
          {t(error)}
        </p>
      ) : null}

      <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
        {t(submitting ? "Sending…" : "Send Message")}
      </Button>
    </form>
  );
}
