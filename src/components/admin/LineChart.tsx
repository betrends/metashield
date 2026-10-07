// A small hand-rolled line/area chart for the "Requests overview" trend
// — same rationale as DonutChart: no charting library in this project,
// and a 7-point trend line doesn't need one.

export function LineChart({
  data,
  height = 220,
}: {
  data: { date: string; count: number }[];
  height?: number;
}) {
  const width = 560;
  const paddingX = 8;
  const paddingTop = 16;
  const paddingBottom = 28;
  const plotHeight = height - paddingTop - paddingBottom;
  const plotWidth = width - paddingX * 2;

  const max = Math.max(1, ...data.map((d) => d.count));
  // Round the axis ceiling up to a friendly step so the top gridline isn't
  // sitting exactly on the highest point.
  const ceiling = Math.ceil(max / 5) * 5 || 5;

  const points = data.map((d, i) => {
    const x = paddingX + (data.length > 1 ? (i / (data.length - 1)) * plotWidth : plotWidth / 2);
    const y = paddingTop + plotHeight - (d.count / ceiling) * plotHeight;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + plotHeight} L ${points[0].x} ${
          paddingTop + plotHeight
        } Z`
      : "";

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id="requestsAreaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridLines.map((g) => {
        const y = paddingTop + plotHeight * (1 - g);
        return (
          <g key={g}>
            <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="var(--color-ink-100)" strokeWidth="1" />
            <text x={0} y={y + 4} fontSize="10" fill="var(--color-ink-400)">
              {Math.round(ceiling * g)}
            </text>
          </g>
        );
      })}

      {areaPath ? <path d={areaPath} fill="url(#requestsAreaFill)" /> : null}
      {linePath ? (
        <path d={linePath} fill="none" stroke="var(--color-brand-600)" strokeWidth="2.5" strokeLinejoin="round" />
      ) : null}

      {points.map((p) => (
        <circle key={p.date} cx={p.x} cy={p.y} r="3.5" fill="white" stroke="var(--color-brand-600)" strokeWidth="2" />
      ))}

      {points.map((p) => (
        <text
          key={`label-${p.date}`}
          x={p.x}
          y={height - 6}
          fontSize="10"
          textAnchor="middle"
          fill="var(--color-ink-400)"
        >
          {p.date}
        </text>
      ))}
    </svg>
  );
}
