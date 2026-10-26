"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { brandName } from "@/lib/site-config";
import { createClient } from "@/lib/supabase/client";
import { migratePendingLocalRecords } from "@/lib/portal/data";

// After signing in, land wherever is most useful: the admin account goes
// straight to the admin dashboard (not the client portal), a health check
// just run means "go tell them to enroll in Account Protection" (the
// account detail page already has that as its recommended next step), a
// case just filed means the case itself, otherwise the general dashboard.
// Where the "confirm your email" link lands: the sign-in page, with a
// note that the email is confirmed. This URL must be allowed in Supabase →
// Authentication → URL Configuration → Redirect URLs.
function confirmRedirectUrl() {
  return `${window.location.origin}/portal/login?confirmed=1`;
}

// Browsers report a dropped connection as "Load failed" (Safari) or
// "Failed to fetch" (Chrome). Retry once, then explain it in plain words.
function isNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const name = err instanceof Error ? err.name : "";
  return /load failed|failed to fetch|networkerror|network request failed/i.test(msg) || name === "AuthRetryableFetchError";
}

async function withRetry<T>(call: () => Promise<T>): Promise<T> {
  try {
    const first = await call();
    const error = (first as { error?: unknown } | null)?.error;
    if (!error || !isNetworkError(error)) return first;
  } catch (err) {
    if (!isNetworkError(err)) throw err;
  }
  await new Promise((r) => setTimeout(r, 1200));
  return call();
}

const NETWORK_MESSAGE =
  "We couldn't connect to the sign-in server. Please check your internet connection and try again. If you use a VPN, ad blocker or data saver, turn it off for this site, or try another network (Wi-Fi or mobile data).";

async function redirectAfterAuth(
  router: ReturnType<typeof useRouter>,
  email?: string | null,
  next?: string | null,
) {
  // If a ?next= param was passed (e.g. from AdminShell), honour it for /admin paths
  if (next && next.startsWith("/admin")) {
    router.push(next);
    router.refresh();
    return;
  }

  if (email && email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    router.push("/admin");
    router.refresh();
    return;
  }

  // Check if the logged-in user is an agent — if so, send to admin portal
  try {
    const res = await fetch("/api/admin/me");
    if (res.ok) {
      const { role } = await res.json();
      if (role?.type === "agent") {
        router.push("/admin/agent-dashboard");
        router.refresh();
        return;
      }
    }
  } catch {
    // Not an agent or check failed — fall through to client portal
  }

  const { accountId, caseId } = await migratePendingLocalRecords();
  if (accountId) {
    router.push(`/portal/accounts/${accountId}`);
  } else if (caseId) {
    router.push(`/portal/cases/${caseId}`);
  } else {
    router.push("/portal");
  }
  router.refresh();
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillName = searchParams.get("name") ?? "";
  const prefillEmail = searchParams.get("email") ?? "";
  const next = searchParams.get("next") ?? null;
  const isAdminLogin = next?.startsWith("/admin") ?? false;
  const cameFromCase = Boolean(prefillEmail);
  const requestedSignUp = searchParams.get("mode") === "sign-up";
  const justConfirmed = searchParams.get("confirmed") === "1";

  // Arriving with a name/email already filled in (from a wizard), or via
  // an explicit ?mode=sign-up link (e.g. the header's Sign Up button),
  // strongly suggests this is a first-time visitor — default to creating
  // an account, but let them switch either way.
  const [mode, setMode] = useState<"sign-in" | "sign-up">(
    isAdminLogin || justConfirmed ? "sign-in" : cameFromCase || requestedSignUp ? "sign-up" : "sign-in"
  );
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [name, setName] = useState(prefillName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [notice, setNotice] = useState<string | null>(
    justConfirmed ? "Your email is confirmed. Sign in below to continue." : null
  );
  const [resent, setResent] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  // Name/email typed in the account health check (see HealthCheckWizard).
  useEffect(() => {
    if (prefillEmail) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem("ms-signup-prefill") ?? "null");
      if (!saved) return;
      sessionStorage.removeItem("ms-signup-prefill");
      if (typeof saved.name === "string" && saved.name) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setName((n) => n || saved.name);
      }
      if (typeof saved.email === "string" && saved.email) {
        setEmail((e) => e || saved.email);
      }
    } catch {
      // Nothing saved, or storage blocked.
    }
  }, [prefillEmail]);

  // An expired or already-used link comes back with the error in the URL
  // hash (Supabase), so it can only be read in the browser.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (!hash.get("error_code") && !hash.get("error")) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotice(null);
    setError(
      "This confirmation link has expired or was already used. Try signing in — if your email isn't confirmed yet, create the account again and we'll send a new link."
    );
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  async function resendConfirmation() {
    setResent("sending");
    const { error: resendError } = await createClient().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: confirmRedirectUrl() },
    });
    setResent(resendError ? "failed" : "sent");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);

    try {
      const supabase = createClient();

      if (mode === "sign-up") {
        const { data, error: signUpError } = await withRetry(() => supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name }, emailRedirectTo: confirmRedirectUrl() },
        }));
        if (signUpError) throw signUpError;

        if (data.session) {
          await redirectAfterAuth(router, email, next);
        } else {
          // Email confirmation is required before a session exists.
          setCheckEmail(true);
        }
      } else {
        const { error: signInError } = await withRetry(() =>
          supabase.auth.signInWithPassword({ email, password })
        );
        if (signInError) throw signInError;
        await redirectAfterAuth(router, email, next);
      }
    } catch (err) {
      setError(
        isNetworkError(err)
          ? NETWORK_MESSAGE
          : err instanceof Error
            ? err.message
            : "Something went wrong — please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Back to the previous page (home if they opened this page directly) */}
      <div className="mb-6 text-center">
        <BackLink
          fallback="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-700 transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5m7-7-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </BackLink>
      </div>

      <div className="text-center">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 9.5 4.6-.6 8-4.4 8-9.5V6l-8-3.5Z"
                fill="currentColor"
                fillOpacity="0.18"
              />
              <path
                d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 9.5 4.6-.6 8-4.4 8-9.5V6l-8-3.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-lg font-semibold text-ink-900">{brandName}</span>
        </Link>
        {isAdminLogin ? (
          <>
            <h1 className="mt-6 text-2xl font-semibold text-ink-900">Admin Portal</h1>
            <p className="mt-2 text-sm text-ink-500">Sign in with your admin or agent credentials.</p>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-2xl font-semibold text-ink-900">
              {mode === "sign-up" ? "Create Your Portal Account" : "Client Portal"}
            </h1>
            <p className="mt-2 text-sm text-ink-500">
              {mode === "sign-up"
                ? cameFromCase
                  ? "One quick step and you'll be able to track your case, message our team and upload documents."
                  : "Create your free account to check an account's health, start a recovery case, or manage protection — all from one place."
                : "Sign in to check your accounts, cases, messages and documents."}
            </p>
          </>
        )}
      </div>

      {checkEmail ? (
        <div className="mt-8 rounded-xl border border-ink-100 bg-white p-6 text-center shadow-sm shadow-ink-900/5">
          <p className="text-sm font-semibold text-ink-900">Check your email</p>
          <p className="mt-2 text-sm text-ink-600">
            We sent a confirmation link to <strong>{email}</strong>. Click it
            to activate your account, then come back and sign in.
          </p>
          <Button
            className="mt-5 w-full"
            onClick={() => {
              setCheckEmail(false);
              setMode("sign-in");
              setPassword("");
            }}
          >
            Back to sign in
          </Button>
          <button
            type="button"
            onClick={resendConfirmation}
            disabled={resent === "sending" || resent === "sent"}
            className="mt-3 w-full text-center text-xs font-semibold text-brand-700 hover:text-brand-800 disabled:text-ink-400"
          >
            {resent === "sending"
              ? "Sending…"
              : resent === "sent"
                ? "New link sent — check your inbox and spam folder"
                : resent === "failed"
                  ? "Couldn't resend — wait a minute and try again"
                  : "Didn't get it? Send the link again"}
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-4 rounded-xl border border-ink-100 bg-white p-6 shadow-sm shadow-ink-900/5"
        >
          {mode === "sign-up" && !isAdminLogin ? (
            <label className="block text-sm">
              <span className="font-medium text-ink-700">Full name</span>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                placeholder="Your name"
              />
            </label>
          ) : null}
          <label className="block text-sm">
            <span className="font-medium text-ink-700">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              placeholder="you@example.com"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-ink-700">
              {mode === "sign-up" ? "Create a password" : "Password"}
            </span>
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              placeholder="••••••••"
            />
          </label>

          {notice ? (
            <p className="rounded-xl bg-risk-low-bg px-3.5 py-2.5 text-xs font-medium text-risk-low">
              {notice}
            </p>
          ) : null}

          {error ? (
            <p className="rounded-xl bg-risk-high-bg px-3.5 py-2.5 text-xs font-medium text-risk-high">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting
              ? "Please wait…"
              : isAdminLogin
                ? "Sign In to Admin Portal"
                : mode === "sign-up"
                  ? cameFromCase
                    ? "Create Account & View Case"
                    : "Create Account"
                  : "Sign In"}
          </Button>

          {!isAdminLogin && (
            <button
              type="button"
              onClick={() => {
                setMode((m) => (m === "sign-up" ? "sign-in" : "sign-up"));
                setError(null);
              }}
              className="w-full text-center text-xs font-semibold text-brand-700 hover:text-brand-800"
            >
              {mode === "sign-up"
                ? "Already have an account? Sign in"
                : "New here? Create an account"}
            </button>
          )}
        </form>
      )}

      <p className="mt-6 text-center text-xs text-ink-400">
        We will never ask for your social media password — only your{" "}
        {brandName} account credentials.
      </p>
    </div>
  );
}

export default function PortalLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
