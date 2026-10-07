"use client";

import { useEffect } from "react";

// Registers the service worker once the page has loaded.
// Placed in the root layout so it runs on every page.
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .catch((err) => console.warn("SW registration failed:", err));
      });
    }
  }, []);

  return null;
}
