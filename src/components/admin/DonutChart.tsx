// A small hand-rolled donut chart — no charting library in this project,
// and this is simple enough not to need one. Segments are drawn as
// stacked stroke-dasharray arcs around a circle.

type Segment = {
  label: string;
  value: number;
  color: string;
};

export function DonutChart({
  segments,
  total,
  centerLabel,
  size = 176,
}: {
  segments: Segment[];
  total: number;
  centerLabel: string;
  size?: number;
}) {
  const strokeWidth = size * 0.16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offset = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const fraction = total > 0 ? s.value / total : 0;
      const dash = fraction * circumference;
      const arc = (
        <circle
          key={s.label}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={s.color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeDashoffset={-offset}
          strokeLinecap="butt"
          transform={`rotate(-90 ${center} ${center})`}
        />
      );
      offset += dash;
      return arc;
    });

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {total === 0 ? (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--color-ink-100)"
            strokeWidth={strokeWidth}
          />
        ) : (
          arcs
        )}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-semibold text-ink-900">{total}</span>
        <span className="text-xs text-ink-400">{centerLabel}</span>
      </div>
    </div>
  );
}

export function DonutLegend({ segments, total }: { segments: Segment[]; total: number }) {
  return (
    <ul className="space-y-3">
      {segments.map((s) => (
        <li key={s.label} className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
          <span className="font-medium text-ink-700">{s.label}</span>
          <span className="ml-auto text-ink-400">
            {s.value} ({total > 0 ? Math.round((s.value / total) * 100 * 10) / 10 : 0}%)
          </span>
        </li>
      ))}
    </ul>
  );
}
