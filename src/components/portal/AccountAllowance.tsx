"use client";

import Link from "next/link";
import { accountKind, limitsFor, KIND_LABEL, type AccountKind, type SubscriptionLike } from "@/lib/portal/account-limits";
import { getPlan } from "@/lib/portal/billing";

type AccountLike = { platform: string };

// "Your Watch package covers 1 Instagram and 1 Facebook account — 1 of 1
// Instagram used." Shown on My Accounts and on Add an Account, so clients
// know before they start what will (and won't) be kept.
export function AccountAllowance({ accounts, subscription }: { accounts: AccountLike[]; subscription: SubscriptionLike }) {
  const limits = limitsFor(subscription);
  const kinds = (Object.keys(limits) as Exclude<AccountKind, "other">[]).filter((k) => limits[k] > 0);

  if (kinds.length === 0) {
    return (
      <div className="rounded-xl border border-ink-200/70 bg-ink-50 px-4 py-3 text-sm text-ink-700">
        <span className="font-semibold text-ink-900">No package yet.</span> You can run a health check and see the score,
        but it isn&apos;t saved here.{" "}
        <Link href="/portal/billing" className="font-semibold text-brand-700 underline underline-offset-2">
          Start your free month
        </Link>{" "}
        to keep your accounts monitored.
      </div>
    );
  }

  const planName = subscription ? getPlan(subscription.planId).name : "Your package";
  const used = (k: AccountKind) => accounts.filter((a) => accountKind(a.platform) === k).length;

  return (
    <div className="rounded-xl border border-ink-200/70 bg-white px-4 py-3">
      <p className="text-sm text-ink-700">
        <span className="font-semibold text-ink-900">{planName}</span> covers{" "}
        {kinds.map((k, i) => (
          <span key={k}>
            {i > 0 ? (i === kinds.length - 1 ? " and " : ", ") : ""}
            {limits[k]} {KIND_LABEL[k]} account{limits[k] > 1 ? "s" : ""}
          </span>
        ))}
        .
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {kinds.map((k) => {
          const n = Math.min(used(k), limits[k]);
          const full = n >= limits[k];
          return (
            <span
              key={k}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${full ? "bg-ink-100 text-ink-600" : "bg-risk-low-bg text-risk-low"}`}
            >
              {KIND_LABEL[k]}: {n} of {limits[k]} used
            </span>
          );
        })}
      </div>
    </div>
  );
}
