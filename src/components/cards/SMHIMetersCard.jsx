// src/components/cards/SMHIMetersCard.jsx
import React from "react";
import { Wind, Sun, Clock, Compass, Info } from "lucide-react";
import FuturisticGauge from "./FuturisticGauge.jsx";
import useSmhiData from "../../hooks/useSmhiData.js";

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

const SMHIMetersCard = ({ lat = 59.33, lon = 18.07 }) => {
  const { live, loading, error } = useSmhiData(lat, lon);

  // Solindex med robust fallback från W/m² om tcc saknas
  const sunIndexPrimary = live?.sunIndex;
  const sunIndexFromRad =
    live?.solarRad != null ? clamp(Math.round((live.solarRad / 900) * 100)) : null;
  const sunIndexValue = sunIndexPrimary != null ? sunIndexPrimary : (sunIndexFromRad ?? 0);
  const sunIndexEstimated = sunIndexPrimary == null && sunIndexFromRad != null;

  return (
    <div
      className={[
        "relative rounded-3xl p-6 shadow-2xl border",
        // ELEKTO-tema: mörkblå glas-panel
        "text-slate-800 dark:text-slate-200",
        "bg-gradient-to-b from-slate-100/80 to-slate-200/60",
        "dark:from-slate-800/80 dark:to-slate-900/70",
        "border-black/10 dark:border-white/10",
        "supports-[backdrop-filter]:backdrop-blur-xl"
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">SMHI • Live</div>
          <div className="text-xl font-semibold tracking-tight">Vind & Sol</div>
        </div>
        <div className="text-xs flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <Clock size={16} />
          {error ? <span className="text-red-500">{error}</span> : <>Uppdaterad {live?.lastUpdated || "–"}</>}
        </div>
      </div>

      {loading ? (
        <div className="text-center text-sm opacity-80">Laddar...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Solindex */}
          <div className="rounded-2xl p-4 border bg-slate-50/70 dark:bg-slate-900/40 border-black/10 dark:border-white/10">
            <div className="flex items-center justify-center mb-3 gap-2 text-amber-500">
              <Sun size={18} />
              <span className="text-sm uppercase tracking-wide">Solindex</span>
            </div>
            <FuturisticGauge
              value={sunIndexValue}
              max={100}
              unit="%"
              label=" "
              theme="solar"
              ticks={5}
              thickness={16}
              rounded
              animate
            />
            {sunIndexEstimated && (
              <div className="mt-2 text-[11px] flex items-center justify-center gap-1 text-amber-700 dark:text-amber-400">
                <Info size={12} /> estimerad från W/m²
              </div>
            )}
          </div>

          {/* Vind */}
          <div className="rounded-2xl p-4 border bg-slate-50/70 dark:bg-slate-900/40 border-black/10 dark:border-white/10">
            <div className="flex items-center justify-center mb-3 gap-2 text-cyan-400">
              <Wind size={18} />
              <span className="text-sm uppercase tracking-wide">Vindstyrka</span>
            </div>
            <FuturisticGauge
              value={live?.windSpeed ?? 0}
              max={25}
              unit="m/s"
              label=" "
              theme="wind"
              ticks={5}
              thickness={16}
              rounded
              animate
            />
            {live?.windDir != null && (
              <div className="mt-2 flex items-center justify-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                <Compass size={14} style={{ transform: `rotate(${live.windDir}deg)` }} />
                {live.windDir}°
              </div>
            )}
          </div>

          {/* Solinstrålning */}
          <div className="rounded-2xl p-4 border bg-slate-50/70 dark:bg-slate-900/40 border-black/10 dark:border-white/10">
            <div className="flex items-center justify-center mb-3 gap-2 text-orange-500">
              <Sun size={18} />
              <span className="text-sm uppercase tracking-wide">Solinstrålning</span>
            </div>
            <FuturisticGauge
              value={live?.solarRad ?? 0}
              max={1000}
              unit="W/m²"
              label=" "
              theme="solar"
              ticks={5}
              thickness={16}
              rounded
              animate
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SMHIMetersCard;
