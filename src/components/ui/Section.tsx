import { ReactNode } from "react";
import { Container } from "./Container";

export function Section({
  children,
  className = "",
  containerClassName = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`py-20 sm:py-28 ${className}`}>
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2.5 text-sm font-medium text-brand-700">
      <span aria-hidden="true" className="h-px w-6 bg-brand-300" />
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div
      className={`max-w-2xl ${align === "center" ? "mx-auto text-center" : ""}`}
    >
      {eyebrow ? (
        <div className={align === "center" ? "flex justify-center" : ""}>
          <Eyebrow>{eyebrow}</Eyebrow>
        </div>
      ) : null}
      <h2 className="mt-4 text-[2rem] leading-[1.12] sm:text-[2.75rem] text-ink-900 text-balance">
        {title}
      </h2>
      {description ? (
        <p className="mt-5 text-base leading-relaxed sm:text-lg text-ink-500 text-balance">
          {description}
        </p>
      ) : null}
    </div>
  );
}
