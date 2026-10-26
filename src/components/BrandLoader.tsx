// MetaShield's animated loading icon: a glowing shield that draws its own
// outline and check mark, inside a spinning gradient ring with orbiting
// sparks. Pure SVG + CSS (styles in globals.css, `ms-loader-*`), so it
// shows instantly with no JavaScript. Calms down for people who turn on
// "reduce motion".

type Size = "page" | "section" | "inline";

const PX: Record<Size, number> = { page: 112, section: 84, inline: 22 };

export function BrandLoader({
  label = "Loading…",
  size = "section",
  className = "",
}: {
  label?: string | null;
  size?: Size;
  className?: string;
}) {
  const px = PX[size];

  if (size === "inline") {
    return (
      <span role="status" className={`inline-flex items-center gap-2 text-ink-400 ${className}`}>
        <ShieldMark px={px} />
        {label ? <span className="text-sm">{label}</span> : <span className="sr-only">Loading</span>}
      </span>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-5 ${
        size === "page" ? "min-h-[60vh] py-16" : "py-12"
      } ${className}`}
    >
      <div className="ms-loader" style={{ width: px, height: px }}>
        <span className="ms-loader-glow" aria-hidden="true" />
        <span className="ms-loader-ring" aria-hidden="true" />
        <span className="ms-loader-orbit" aria-hidden="true">
          <i />
        </span>
        <span className="ms-loader-orbit ms-loader-orbit--slow" aria-hidden="true">
          <i />
        </span>
        <ShieldMark px={px} />
      </div>
      {label ? (
        <p className="ms-loader-label text-sm font-semibold tracking-wide">{label}</p>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );
}

function ShieldMark({ px }: { px: number }) {
  return (
    <svg
      className="ms-loader-shield"
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ms-loader-fill" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#5b21b6" />
        </linearGradient>
        <linearGradient id="ms-loader-stroke" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#c4b5fd" />
          <stop offset="0.5" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#4c1d95" />
        </linearGradient>
      </defs>
      <g transform="translate(12 12) scale(0.7) translate(-12 -12)">
        <path
          className="ms-loader-body"
          d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 9.5 4.6-.6 8-4.4 8-9.5V6l-8-3.5Z"
          fill="url(#ms-loader-fill)"
        />
        <path
          className="ms-loader-outline"
          d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 9.5 4.6-.6 8-4.4 8-9.5V6l-8-3.5Z"
          pathLength={100}
          stroke="url(#ms-loader-stroke)"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          className="ms-loader-check"
          d="M8.6 12.2l2.3 2.3 4.6-4.9"
          pathLength={100}
          stroke="#ffffff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
