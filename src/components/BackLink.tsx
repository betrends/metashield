"use client";

// A "Back" link that returns to the page the person actually came from
// (like the phone's Back button). If they opened this page directly — from
// an email link, say — there's nowhere to go back to, so it goes to
// `fallback` instead.

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { hasInAppHistory } from "@/components/NavigationTracker";

export function BackLink({
  fallback,
  className,
  children,
}: {
  fallback: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <Link
      href={fallback}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        if (!hasInAppHistory()) return;
        e.preventDefault();
        router.back();
      }}
    >
      {children}
    </Link>
  );
}
