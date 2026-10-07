export function OptionCard({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors ${
        selected
          ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
          : "border-ink-200 bg-white hover:border-brand-300 hover:bg-brand-50/40"
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? "border-brand-600 bg-brand-600" : "border-ink-300 bg-white"
        }`}
      >
        {selected ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path
              d="m5 13 4 4L19 7"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      <span>
        <span className="block text-sm font-semibold text-ink-900">
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-xs text-ink-500">
            {description}
          </span>
        ) : null}
      </span>
    </button>
  );
}
