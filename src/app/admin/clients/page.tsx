"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLoader } from "@/components/BrandLoader";

type Client = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  joinedAt: string;
  accountCount: number;
  caseCount: number;
  unpaidCaseCount: number;
};

export default function AdminClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[] | "loading" | "unauthorized">("loading");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/clients");
      if (res.status === 403) {
        setClients("unauthorized");
        return;
      }
      const data = await res.json();
      setClients(data.clients ?? []);
    }
    load();
  }, []);

  if (clients === "unauthorized") {
    return <p className="text-sm text-ink-500">You don&apos;t have access to this page.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">Clients</h1>
      <p className="mt-1 text-sm text-ink-500">
        Everyone who has signed up, newest first.
      </p>

      {clients === "loading" ? (
        <BrandLoader label="Loading…" />
      ) : clients.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-ink-400">No one has signed up yet.</p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Accounts</th>
                  <th className="px-5 py-3 font-medium">Cases</th>
                  <th className="px-5 py-3 font-medium">Unpaid</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/admin/clients/${c.id}`)}
                    className="cursor-pointer border-b border-ink-50 last:border-b-0 hover:bg-ink-50"
                  >
                    <td className="px-5 py-3.5 font-medium text-ink-900">{c.name || "—"}</td>
                    <td className="px-5 py-3.5 text-ink-600">
                      <a
                        href={`mailto:${c.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-brand-600"
                      >
                        {c.email}
                      </a>
                    </td>
                    <td className="px-5 py-3.5 text-ink-600">
                      {c.phone ? (
                        <a
                          href={`tel:${c.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-brand-600"
                        >
                          {c.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-ink-600">{c.accountCount}</td>
                    <td className="px-5 py-3.5 text-ink-600">{c.caseCount}</td>
                    <td className="px-5 py-3.5">
                      {c.unpaidCaseCount > 0 ? (
                        <span className="rounded-full bg-risk-high-bg px-2.5 py-1 text-xs font-semibold text-risk-high">
                          {c.unpaidCaseCount}
                        </span>
                      ) : (
                        <span className="text-ink-400">0</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-ink-500">
                      {new Date(c.joinedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
