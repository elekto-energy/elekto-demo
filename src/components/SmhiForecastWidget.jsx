import React from "react";
import { Sun, Wind } from "lucide-react";
import useSmhiData from "../hooks/useSmhiData.js";

export function SmhiForecastWidget({ lat = 59.33, lon = 18.07 }) {
  const { forecast, loading, error } = useSmhiData(lat, lon);

  if (loading) return <div className="p-4">Laddar SMHI-prognos...</div>;
  if (error)   return <div className="p-4 text-red-500">{error}</div>;

  const fmtTime = (iso) =>
    new Date(iso).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });

  const clamp01 = (v) => Math.max(0, Math.min(1, v ?? 0));

  return (
    <div className="rounded-2xl p-4 border shadow bg-white/55 dark:bg-white/5 border-black/10 dark:border-white/10 text-slate-800 dark:text-slate-200">
      <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-200">
        🌬️☀️ SMHI Prognos (24h)
      </h3>

      {/* Desktop: Tabell */}
      <table className="hidden md:table w-full text-xs">
        <thead>
          <tr className="text-slate-600 dark:text-slate-300">
            <th className="text-left py-1">Tid</th>
            <th className="text-left py-1">
              <span className="inline-flex items-center gap-1">
                <Wind size={12}/> Vind (m/s)
              </span>
            </th>
            <th className="text-left py-1">
              <span className="inline-flex items-center gap-1">
                <Sun size={12}/> Sol (W/m²)
              </span>
            </th>
          </tr>
        </thead>
        <tbody className="text-slate-900 dark:text-slate-100">
          {forecast.map((f, i) => (
            <tr key={i} className="border-t border-black/5 dark:border-white/5">
              <td className="py-1">{fmtTime(f.time)}</td>
              <td
                className="px-2 py-1 font-semibold rounded text-slate-900 dark:text-slate-100"
                style={{ background: `rgba(56,189,248,${clamp01((f.wind_speed ?? 0) / 25)})` }}
              >
                {f.wind_speed == null ? "–" : f.wind_speed.toFixed(1)}
              </td>
              <td
                className="px-2 py-1 font-semibold rounded text-slate-900 dark:text-slate-100"
                style={{ background: `rgba(250,204,21,${clamp01((f.solar_rad ?? 0) / 1000)})` }}
              >
                {f.solar_rad == null ? "–" : Math.round(f.solar_rad)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile: Kortvy */}
      <div className="grid grid-cols-4 gap-2 md:hidden">
        {forecast.map((f, i) => (
          <div
            key={i}
            className="p-2 rounded-lg border border-black/10 dark:border-white/10 text-center text-xs bg-white/55 dark:bg-white/5"
          >
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              {fmtTime(f.time)}
            </div>
            <div className="flex flex-col items-center mt-0.5">
              <Wind size={12} className="text-cyan-400" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {f.wind_speed == null ? "–" : f.wind_speed.toFixed(1)}
              </span>
            </div>
            <div className="flex flex-col items-center mt-1">
              <Sun size={12} className="text-yellow-400" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {f.solar_rad == null ? "–" : Math.round(f.solar_rad)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
