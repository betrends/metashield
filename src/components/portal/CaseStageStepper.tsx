import { caseStages, type CaseStage } from "@/lib/portal/mock-data";

export function CaseStageStepper({ currentStage }: { currentStage: CaseStage }) {
  const currentIndex = caseStages.indexOf(currentStage);

  return (
    <ol className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
      {caseStages.map((stage, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={stage} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                done
                  ? "bg-brand-600 text-white"
                  : active
                    ? "bg-brand-100 text-brand-700 ring-2 ring-brand-500"
                    : "bg-ink-100 text-ink-400"
              }`}
            >
              {done ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path
                    d="m5 13 4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span
              className={`text-sm ${active ? "font-semibold text-ink-900" : done ? "text-ink-600" : "text-ink-400"}`}
            >
              {stage}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
