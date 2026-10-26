"use client";

import { useEffect, useState } from "react";
import { BrandLoader } from "@/components/BrandLoader";

type Agent = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  active: boolean;
  createdAt: string;
  resolvedCount: number;
  inProgressCount: number;
  totalCount: number;
  successRate: number;
};

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<Agent[] | "loading" | "unauthorized">("loading");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/agents");
    if (res.status === 403) {
      setAgents("unauthorized");
      return;
    }
    const data = await res.json();
    setAgents(data.agents ?? []);
  }

  useEffect(() => {
    // Reading from Supabase (an external system) can only safely happen
    // after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function handleAddAgent(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (!form.password || form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.detail || (data.error === "password_too_short" ? "Password must be at least 8 characters." : "Couldn't add agent — please try again.")
        );
      }
      setForm({ name: "", email: "", phone: "", password: "" });
      setShowPw(false);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAgent(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/admin/agents/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  async function toggleActive(agent: Agent) {
    setTogglingId(agent.id);
    try {
      const res = await fetch(`/api/admin/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !agent.active }),
      });
      if (res.ok) {
        setAgents((prev) =>
          Array.isArray(prev) ? prev.map((a) => (a.id === agent.id ? { ...a, active: !a.active } : a)) : prev
        );
      }
    } finally {
      setTogglingId(null);
    }
  }

  if (agents === "unauthorized") {
    return <p className="text-sm text-ink-500">You don&apos;t have access to this page.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Agents</h1>
          <p className="mt-1 text-sm text-ink-500">Your team — add agents and see who&apos;s handling what.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {showForm ? "Cancel" : "+ Add Agent"}
        </button>
      </div>

      {showForm ? (
        <form
          onSubmit={handleAddAgent}
          className="mt-4 rounded-2xl border border-ink-100 bg-white p-6 shadow-sm"
        >
          {error ? <p className="mb-4 rounded-lg bg-risk-high-bg px-3 py-2 text-sm text-risk-high">{error}</p> : null}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-xs font-semibold text-ink-500">Full name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                placeholder="e.g. Ifeoma Chukwu"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-500">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                placeholder="agent@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-500">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                placeholder="+234…"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-500">Password</label>
              <div className="relative mt-1">
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 pr-10 text-sm outline-none focus:border-brand-500"
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M3 3l18 18M10.5 10.7A3 3 0 0 0 13.3 13.5M6.5 6.6C4.6 7.9 3 10 3 12c0 0 3 7 9 7a9.5 9.5 0 0 0 5.4-1.6M9 3.5A9.4 9.4 0 0 1 12 3c6 0 9 7 9 7a14 14 0 0 1-2.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M3 12s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-ink-400">Share this with the agent privately.</p>
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add agent"}
          </button>
        </form>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-5 py-3 font-medium">Agent</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Resolved</th>
                <th className="px-5 py-3 font-medium">In Progress</th>
                <th className="px-5 py-3 font-medium">Success Rate</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {agents === "loading" ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-ink-400">
                    <BrandLoader size="inline" label="Loading…" />
                  </td>
                </tr>
              ) : agents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-ink-400">
                    No agents yet — add your first one above.
                  </td>
                </tr>
              ) : (
                agents.map((a) => (
                  <tr key={a.id} className="border-b border-ink-50 last:border-b-0">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                          {a.name[0]?.toUpperCase()}
                        </span>
                        <span className="font-medium text-ink-900">{a.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-ink-500">
                      <a href={`mailto:${a.email}`} className="hover:text-brand-600">
                        {a.email}
                      </a>
                      {a.phone ? <p className="text-xs text-ink-400">{a.phone}</p> : null}
                    </td>
                    <td className="px-5 py-3.5 text-ink-600">{a.resolvedCount}</td>
                    <td className="px-5 py-3.5 text-ink-600">{a.inProgressCount}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="w-9 text-xs font-semibold text-ink-700">{a.successRate}%</span>
                        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-ink-100">
                          <span
                            className="block h-full rounded-full"
                            style={{ width: `${a.successRate}%`, backgroundColor: "var(--color-accent-green)" }}
                          />
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => toggleActive(a)}
                        disabled={togglingId === a.id}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${
                          a.active ? "bg-risk-low-bg text-risk-low" : "bg-ink-100 text-ink-500"
                        }`}
                      >
                        {a.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      {confirmDeleteId === a.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-ink-500">
                            {a.inProgressCount > 0
                              ? `${a.inProgressCount} case${a.inProgressCount > 1 ? "s" : ""} will be reassigned.`
                              : "Are you sure?"}
                          </span>
                          <button
                            onClick={() => deleteAgent(a.id)}
                            disabled={deletingId === a.id}
                            className="rounded-lg bg-risk-high px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            {deletingId === a.id ? "Deleting…" : "Confirm"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs text-ink-400 hover:text-ink-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(a.id)}
                          className="rounded-lg px-2.5 py-1 text-xs font-semibold text-risk-high hover:bg-risk-high-bg"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
