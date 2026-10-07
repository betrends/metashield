import { forwardRef, ReactNode } from "react";

export const Card = forwardRef<
  HTMLDivElement,
  { children: ReactNode; className?: string }
>(function Card({ children, className = "" }, ref) {
  return (
    <div
      ref={ref}
      className={`rounded-2xl border border-ink-100 bg-white p-6 shadow-sm shadow-ink-900/5 ${className}`}
    >
      {children}
    </div>
  );
});
