import React from "react";

export function BatteryBar({ value = 0, title = "Batteri", status = "", min = 0, max = 100, unit = "%" }) {
  let barColor = "#22c55e";
  if (value < 10) barColor = "#ef4444";
  else if (value < 25) barColor = "#f59e42";

  return (
    <div className="flex items-center w-64 my-2">
      <span className="mr-2 font-bold text-sm">{title}</span>
      <div className="flex-1 h-8 bg-slate-200 rounded-full overflow-hidden relative">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${((value - min) / (max - min)) * 100}%`,
            background: barColor,
          }}
        ></div>
        {/* Ikon/status */}
        {status === "charging" && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-lg">🔌</span>
        )}
        {status === "discharging" && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-lg">⚡️</span>
        )}
      </div>
      <span className="ml-2 text-sm font-mono">{value}{unit}</span>
    </div>
  );
}
