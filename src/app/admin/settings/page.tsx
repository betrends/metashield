"use client";

// Read-only view of the platform's current configuration — bank details
// clients pay into, the case fee price list, and who has admin access.
// These are set in code (see the files linked in each card's comment)
// rather than editable here yet.

import { bankDetails } from "@/lib/portal/bank-details";
import { FOLLOWER_RANGES, formatNaira } from "@/lib/portal/case-fees";

export default function AdminSettingsPage() {
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "Not set";

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">Settings</h1>
      <p className="mt-1 text-sm text-ink-500">Current platform configuration.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-ink-900">Admin Access</h2>
          <p className="mt-3 text-sm text-ink-500">Signed-in email with admin dashboard access</p>
          <p className="mt-1 text-sm font-semibold text-ink-900">{adminEmail}</p>
          <p className="mt-4 text-xs text-ink-400">
            Change this by updating <code className="rounded bg-ink-50 px-1 py-0.5">ADMIN_EMAIL</code> and{" "}
            <code className="rounded bg-ink-50 px-1 py-0.5">NEXT_PUBLIC_ADMIN_EMAIL</code> in your environment.
          </p>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-ink-900">Bank Transfer Details</h2>
          <p className="mt-3 text-sm text-ink-500">What clients see when paying a recovery case fee</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Bank</dt>
              <dd className="font-semibold text-ink-900">{bankDetails.bankName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Account number</dt>
              <dd className="font-semibold text-ink-900">{bankDetails.accountNumber}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Account name</dt>
              <dd className="font-semibold text-ink-900">{bankDetails.accountName}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-base font-semibold text-ink-900">Recovery Fee Price List</h2>
          <p className="mt-3 text-sm text-ink-500">Charged based on the account&apos;s follower count when submitting a case</p>
          <div className="mt-4 overflow-hidden rounded-xl border border-ink-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Follower Range</th>
                  <th className="px-4 py-2.5 font-medium">Fee</th>
                </tr>
              </thead>
              <tbody>
                {FOLLOWER_RANGES.map((range) => (
                  <tr key={range.value} className="border-t border-ink-100">
                    <td className="px-4 py-2.5 text-ink-700">{range.label}</td>
                    <td className="px-4 py-2.5 font-semibold text-ink-900">{formatNaira(range.feeKobo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-ink-400">
            Edit <code className="rounded bg-ink-50 px-1 py-0.5">src/lib/portal/case-fees.ts</code> to change these.
          </p>
        </div>
      </div>
    </div>
  );
}
