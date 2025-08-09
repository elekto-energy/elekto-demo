// src/components/cards/FuturisticGauge.jsx
import React, { useMemo } from "react";

function pc(x, y, r, a) {
  const rad = (a * Math.PI) / 180;
  return { x: x + r * Math.cos(rad), y: y + r * Math.sin(rad) };
}
function arc(x, y, r, a1, a2) {
  const s = pc(x, y, r, a2);
  const e = pc(x, y, r, a1);
  const large = a2 - a1 <= 180 ? 0 : 1;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
}

const THEMES = {
  solar:   { from: "#f59e0b", to: "#fb923c" },
  wind:    { from: "#2563eb", to: "#06b6d4" },
  default: { from: "#10b981", to: "#84cc16" },
};

export default function FuturisticGauge({
  value = 0,
  max = 100,
  unit = "",
  label = "",
  theme = "default",
  width = 260,
  height = 160,
  thickness = 14,
  rounded = true,
  ticks = 5,
  animate = true,
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const r = 70, cx = width / 2, cy = height;
  const end = 180 - (pct * 180) / 100;
  const colors = THEMES[theme] || THEMES.default;

  const bgPath = useMemo(() => arc(cx, cy, r, 180, 0), [cx, cy, r]);
  const fgPath = useMemo(() => arc(cx, cy, r, 180, end), [cx, cy, r, end]);

  const cap = rounded ? "round" : "butt";
  const strokeStyle = animate ? { transition: "d .35s ease" } : {};

  const bgStroke   = "#64748b";
  const tickStroke = "#475569";

  return (
    <div className="relative flex flex-col items-center" style={{ width, height }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="relative">
        <defs>
          <linearGradient id={`grad-${theme}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"  stopColor={colors.from} />
            <stop offset="100%" stopColor={colors.to} />
          </linearGradient>
        </defs>

        {/* Bakgrundsbåge */}
        <path d={bgPath} stroke={bgStroke} strokeWidth={thickness} fill="none" strokeLinecap={cap} />

        {/* Tick marks */}
        {ticks > 0 &&
          Array.from({ length: ticks + 1 }).map((_, i) => {
            const a = 180 - (i * 180) / ticks;
            const p1 = pc(cx, cy, r + thickness * 0.6, a);
            const p2 = pc(cx, cy, r + thickness * 1.1, a);
            return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={tickStroke} strokeWidth="2" />;
          })}

        {/* Fram-båge */}
        <path
          d={fgPath}
          stroke={`url(#grad-${theme})`}
          strokeWidth={thickness}
          fill="none"
          strokeLinecap={cap}
          style={strokeStyle}
        />
      </svg>

      {/* Text ovanför bågen – nu med bra kontrast i dark mode */}
      <div className="absolute top-4 flex flex-col items-center pointer-events-none">
        <div className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-100">
          {Number.isFinite(value) ? Math.round(value) : "–"}
          <span className="text-sm md:text-base ml-1 text-slate-600 dark:text-slate-300">
            {unit}
          </span>
        </div>
        {label && (
          <div className="text-xs md:text-sm mt-1 text-slate-600 dark:text-slate-400">
            {label}
          </div>
        )}
      </div>
    </div>
  );
}
