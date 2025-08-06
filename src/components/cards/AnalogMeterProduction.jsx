import React from "react";

export function AnalogMeterProduction({
  value = 0,
  min = 0,
  max = 10,
  title = "Produktion",
  unit = "kWh",
  icon = "☀️", // ☀️ eller 🌬️
  color = "#16a34a" // grön
}) {
  const angle = (val) => ((val - min) / (max - min)) * 180 - 90;
  const currentAngle = Math.max(-90, Math.min(90, angle(value)));

  return (
    <div className="flex flex-col items-center">
      <svg width={160} height={100} viewBox="0 0 160 100">
        {/* Bakgrund */}
        <ellipse cx="80" cy="80" rx="70" ry="70" fill="#f8f5ec" />
        {/* Grön skala */}
        <path d="M15,80 A65,65 0 0,1 145,80" fill="none" stroke={color} strokeWidth={9} />
        {/* Skala-streck */}
        {[...Array(11)].map((_, i) => {
          const a = angle(min + ((max - min) * i) / 10);
          const x1 = 80 + 60 * Math.cos((Math.PI * a) / 180);
          const y1 = 80 + 60 * Math.sin((Math.PI * a) / 180);
          const x2 = 80 + 68 * Math.cos((Math.PI * a) / 180);
          const y2 = 80 + 68 * Math.sin((Math.PI * a) / 180);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#222" strokeWidth={2} />;
        })}
        {/* Nål */}
        <line
          x1={80}
          y1={80}
          x2={80 + 55 * Math.cos((Math.PI * currentAngle) / 180)}
          y2={80 + 55 * Math.sin((Math.PI * currentAngle) / 180)}
          stroke={color}
          strokeWidth={7}
          strokeLinecap="round"
        />
        {/* Nav */}
        <circle cx={80} cy={80} r={10} fill="#222" />
        {/* Siffror */}
        {[...Array(6)].map((_, i) => {
          const v = min + ((max - min) * i) / 5;
          const a = angle(v);
          const x = 80 + 49 * Math.cos((Math.PI * a) / 180);
          const y = 80 + 49 * Math.sin((Math.PI * a) / 180) + 7;
          return (
            <text
              key={i}
              x={x}
              y={y}
              fontSize={15}
              textAnchor="middle"
              fill="#222"
              fontFamily="Menlo, monospace"
            >
              {Math.round(v)}
            </text>
          );
        })}
        {/* Ikon i mitten */}
        <text
          x="80"
          y="70"
          textAnchor="middle"
          fontSize="30"
          fontFamily="Arial"
        >
          {icon}
        </text>
      </svg>
      <div className="mt-2 text-lg font-bold">{title}</div>
      <div className="text-base text-gray-700 font-mono">
        {value} {unit}
      </div>
    </div>
  );
}
