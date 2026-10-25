"use client";

// Remembers whether the visitor has moved between pages inside the site
// during this visit, so Back links know whether "previous page" exists.

import { useEffect } from "react";
import { usePathname } from "next/navigation";

let pagesSeen = 0;

export function hasInAppHistory(): boolean {
  return pagesSeen > 1;
}

export function NavigationTracker() {
  const pathname = usePathname();
  useEffect(() => {
    pagesSeen += 1;
  }, [pathname]);
  return null;
}
