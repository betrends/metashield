import { forwardRef, ReactNode } from "react";

export const Card = forwardRef<
  HTMLDivElement,
  { children: ReactNode; className?: string }
>(function Card({ children, className = "" }, ref) {
  return (
    <div
      ref={ref}
      className={`rounded-2xl border border-ink-200/70 bg-white p-6 ${className}`}
    >
      {children}
    </div>
  );
});
