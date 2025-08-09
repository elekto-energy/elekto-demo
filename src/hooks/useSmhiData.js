// src/hooks/useSmhiData.js
// Vind + Sol med robust solindex: först från r (W/m²), annars från molnighet.
// Inkluderar 24h-prognos, localStorage-cache och försiktig fallback.
import { useEffect, useState } from "react";

const LIVE_TTL_MS = 10 * 60 * 1000; // 10 min
const FC_TTL_MS   = 60 * 60 * 1000; // 1 h
const DEBUG = typeof window !== "undefined" && localStorage.getItem("DEBUG_SMHI") === "1";

const kLive     = (lat, lon) => `smhi_live_${lat.toFixed(3)}_${lon.toFixed(3)}`;
const kForecast = (lat, lon) => `smhi_fc_${lat.toFixed(3)}_${lon.toFixed(3)}`;

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

function readCache(key, ttl) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o?.ts || Date.now() - o.ts > ttl) return null;
    return o.data;
  } catch { return null; }
}
function writeCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

function toParamMap(parameters = []) {
  const map = {};
  for (const p of parameters) {
    const name = String(p.name || "").toLowerCase();
    const v = Array.isArray(p.values) ? Number(p.values[0]) : undefined;
    map[name] = Number.isFinite(v) ? v : null;
  }
  return map;
}

// Fallback-solindex från molnighet
function sunIndexFromClouds(tccVal) {
  if (tccVal == null) return null;
  if (tccVal <= 1) return clamp(Math.round((1 - tccVal) * 100));
  if (tccVal <= 8) return clamp(Math.round(((8 - tccVal) / 8) * 100));
  return null;
}

export default function useSmhiData(lat = 59.33, lon = 18.07) {
  const [live, setLive] = useState(() => readCache(kLive(lat, lon), LIVE_TTL_MS));
  const [forecast, setForecast] = useState(() => readCache(kForecast(lat, lon), FC_TTL_MS) || []);
  const [loading, setLoading] = useState(!live);
  const [error, setError] = useState("");

  useEffect(() => {
    let stop = false;

    const pickCurrentTimeStep = (timeSeries = []) => {
      const now = new Date();
      return (
        timeSeries.find(ts => {
          const t = new Date(ts.validTime);
          const diff = t - now;
          return diff >= -15 * 60 * 1000 && diff <= 60 * 60 * 1000;
        }) || timeSeries[0]
      );
    };

    const fetchData = async () => {
      try {
        setError("");
        setLoading(true);

        const url = `https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/${lon}/lat/${lat}/data.json`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`SMHI HTTP ${res.status}`);
        const json = await res.json();

        // ---------- LIVE ----------
        const ts = pickCurrentTimeStep(json?.timeSeries);
        if (!ts) throw new Error("Ingen tidsserie från SMHI.");
        const P = toParamMap(ts.parameters);

        if (DEBUG) {
          console.groupCollapsed("[SMHI] LIVE params");
          console.log(P);
          console.groupEnd();
        }

        const windSpeed = P.ws ?? null;   // m/s
        const windDir   = P.wd ?? null;   // grader
        const solarRad  = P.r  ?? null;   // W/m² (globalstrålning i pmp3g)

        // Solindex: 1) från r (W/m²), 2) fallback från molnighet
        let sunIndex = null;
        if (solarRad != null) {
          sunIndex = clamp(Math.round((solarRad / 1000) * 100)); // 1000 W/m² ≈ full sol
        } else {
          sunIndex = sunIndexFromClouds(P.tcc_mean ?? P.tcc);
        }

        const liveData = {
          windSpeed,
          windDir,
          solarRad,
          sunIndex,
          lastUpdated: new Date().toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }),
        };
        if (!stop) {
          setLive(liveData);
          writeCache(kLive(lat, lon), liveData);
        }

        // ---------- FORECAST 24h ----------
        const now = new Date();
        const fc = (json.timeSeries || [])
          .filter(step => {
            const t = new Date(step.validTime);
            return t >= now && t <= new Date(now.getTime() + 24 * 60 * 60 * 1000);
          })
          .map(step => {
            const m = toParamMap(step.parameters);
            let solar = m.r;
            if (solar == null) {
              // estimering med molnighet + enkel dag/natt-dämpning
              const idx = sunIndexFromClouds(m.tcc_mean ?? m.tcc);
              if (idx != null) {
                const hour = new Date(step.validTime).getHours();
                const daylight = hour >= 6 && hour <= 20 ? 1 : 0;
                solar = Math.round((idx / 100) * 900 * daylight);
              }
            }
            return {
              time: step.validTime,
              wind_speed: m.ws ?? null,
              solar_rad: solar ?? null,
            };
          });

        if (!stop) {
          setForecast(fc);
          writeCache(kForecast(lat, lon), fc);
        }
      } catch (err) {
        console.error(err);
        const cLive = readCache(kLive(lat, lon), LIVE_TTL_MS);
        const cFc   = readCache(kForecast(lat, lon), FC_TTL_MS);
        if (cLive || cFc) {
          if (!stop && cLive) setLive(cLive);
          if (!stop && cFc)   setForecast(cFc);
          if (!stop) setError("Visar cache (SMHI otillgängligt).");
        } else {
          if (!stop) setError("Kunde inte hämta SMHI-data.");
        }
      } finally {
        if (!stop) setLoading(false);
      }
    };

    fetchData();
    const id = setInterval(fetchData, 5 * 60 * 1000);
    return () => { stop = true; clearInterval(id); };
  }, [lat, lon]);

  return { live, forecast, loading, error };
}
