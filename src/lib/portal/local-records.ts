"use client";

// Carries what a client just submitted (a health check or a recovery
// case) across the hand-off into the portal, so signing up right after
// checking your account actually shows *your* account — not just the
// generic sample data. This is still browser-local (localStorage) rather
// than written to the database; the real account/case tables in Supabase
// (see supabase/schema.sql) are where this should eventually land.

import type { RiskLevel } from "@/components/ui/RiskBadge";
import type { CaseStage } from "@/lib/portal/mock-data";

const ACCOUNT_KEY = "portal-demo-local-account";
const CASE_KEY = "portal-demo-local-case";

export type LocalAccountRecord = {
  id: string;
  handle: string;
  platform: string;
  health: number;
  level: RiskLevel;
  protectionActive: boolean;
  categories?: { label: string; level: RiskLevel }[];
  // Stamped automatically by setLocalAccount — lets migratePendingLocalRecords
  // tell "just ran this, then signed up" apart from a long-abandoned attempt
  // from a previous, unrelated visit.
  savedAt: number;
};

export type LocalCaseRecord = {
  id: string;
  title: string;
  platform: string;
  accountHandle: string;
  stage: CaseStage;
  issue: string;
  timeline: { date: string; event: string }[];
  savedAt: number;
};

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getLocalAccount(): LocalAccountRecord | null {
  return read<LocalAccountRecord>(ACCOUNT_KEY);
}

export function setLocalAccount(record: Omit<LocalAccountRecord, "savedAt">) {
  write(ACCOUNT_KEY, { ...record, savedAt: Date.now() });
}

export function clearLocalAccount() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCOUNT_KEY);
}

export function getLocalCase(): LocalCaseRecord | null {
  return read<LocalCaseRecord>(CASE_KEY);
}

export function setLocalCase(record: Omit<LocalCaseRecord, "savedAt">) {
  write(CASE_KEY, { ...record, savedAt: Date.now() });
}

export function clearLocalCase() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CASE_KEY);
}

export function todayLabel(): string {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
