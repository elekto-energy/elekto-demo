// src/components/BatteryPlan.jsx
// BatteryPlan.jsx — v3.6 Futuristic (v3.5 + extern SMHI-props + egen planned-axel)
// Kräver: recharts, lucide-react
// npm i recharts lucide-react

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import { Cpu, Sun, Send, Zap, MapPin, BadgeDollarSign, RefreshCw } from "lucide-react";
import "./BatteryPlan.css";

const DEFAULT_ZONE = "SE3";
const LS_PREFS = "batteryplan_v35_prefs";
const LS_LOC   = "batteryplan_location";
const API_URL  = (import.meta?.env?.VITE_ELEKTO_API_URL) ?? "http://localhost:3001/api/battery/plan";

/* ---------- Helpers ---------- */
const clamp01 = (x) => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
function getSEDateParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const Y = fmt.find((p) => p.type === "year")?.value;
  const M = fmt.find((p) => p.type === "month")?.value;
  const D = fmt.find((p) => p.type === "day")?.value;
  return { Y, M, D };
}

/* NOAA-ish approx för solhöjd – duger som fallback */
function solarElevationDeg(date, lat, lon) {
  const rad = Math.PI / 180;
  const jd = (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()) / 86400000) - 10957.5;
  const L = (280.46 + 0.9856474 * jd) % 360;
  const g = (357.528 + 0.9856003 * jd) % 360;
  const lambda = L + 1.915 * Math.sin(g * rad) + 0.020 * Math.sin(2 * g * rad);
  const epsilon = 23.439 - 0.0000004 * jd;
  const RA = Math.atan2(Math.cos(epsilon * rad) * Math.sin(lambda * rad), Math.cos(lambda * rad)) / rad;
  const dec = Math.asin(Math.sin(epsilon * rad) * Math.sin(lambda * rad)) / rad;
  const GMST = (6.697375 + 0.0657098242 * jd + date.getUTCHours() + date.getUTCMinutes() / 60) % 24;
  const LST = (GMST + lon / 15 + 24) % 24;
  const H = ((LST * 15 - RA + 360 + 180) % 360) - 180; // [-180,180]
  const sinAlt = Math.sin(lat * rad) * Math.sin(dec * rad) + Math.cos(lat * rad) * Math.cos(dec * rad) * Math.cos(H * rad);
  return Math.asin(sinAlt) / rad;
}
function computeFallbackSolIndex(date, lat, lon, cloudFrac /* 0..1 eller null */) {
  const elev = solarElevationDeg(date, lat, lon); // grader
  const clearSky = clamp01(Math.sin(Math.max(0, elev) * Math.PI / 180)); // 0 vid horisont, 1 nära zenit
  const clouds = cloudFrac == null ? 0.3 : clamp01(cloudFrac);
  return clamp01(clearSky * (1 - clouds));
}

export default function BatteryPlan({
  zone = DEFAULT_ZONE,
  siteId = "SE-001",
  socNowProp,
  battery = { capKwh: 20, maxC: 5, maxD: 5 }, // kW
  /* NYTT: extern SMHI via props (från dina SMHI-cards) */
  sunPctProp,              // Array(24) med 0..100, alignad per timme
  sunSourceProp,           // t.ex. "cards"
}) {
  /* ---------- PREFERENSER ---------- */
  const [prefs, setPrefs] = useState({
    aiMode: "charge",
    considerSolar: true,
    optPrice: true,
    optSolar: true,
    eventMode: false,
    reserveSOC: 20,
    limitHours: true,
    maxChargeHours: 4,
  });
  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(LS_PREFS) || "{}"); setPrefs((p) => ({ ...p, ...s })); } catch {}
  }, []);
  const setPref = (k, v) => setPrefs((p) => { const n = { ...p, [k]: v }; try { localStorage.setItem(LS_PREFS, JSON.stringify(n)); } catch {} return n; });
  const { aiMode, considerSolar, optPrice, optSolar, eventMode, reserveSOC, limitHours, maxChargeHours } = prefs;

  /* ---------- PLATS ---------- */
  const [lat, setLat] = useState(() => { try { const saved = JSON.parse(localStorage.getItem(LS_LOC) || "{}"); return typeof saved.lat === "number" ? saved.lat : 59.33; } catch { return 59.33; } });
  const [lon, setLon] = useState(() => { try { const saved = JSON.parse(localStorage.getItem(LS_LOC) || "{}"); return typeof saved.lon === "number" ? saved.lon : 18.07; } catch { return 18.07; } });
  const [needsLocation, setNeedsLocation] = useState(() => { try { const saved = JSON.parse(localStorage.getItem(LS_LOC) || "{}"); return !(typeof saved.lat === "number" && typeof saved.lon === "number"); } catch { return true; } });
  const [locMsg, setLocMsg] = useState("");

  useEffect(() => {
    if (!needsLocation) return;
    if (!("geolocation" in navigator)) { setLocMsg("Geolocation saknas. Ange plats manuellt nedan."); return; }
    setLocMsg("Försöker hämta din plats …");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = Number(pos.coords.latitude.toFixed(4));
        const lo = Number(pos.coords.longitude.toFixed(4));
        setLat(la); setLon(lo);
        try { localStorage.setItem(LS_LOC, JSON.stringify({ lat: la, lon: lo })); } catch {}
        setNeedsLocation(false); setLocMsg("Plats sparad ✅");
      },
      (err) => { console.warn("Geolocation error:", err); setLocMsg("Kunde inte hämta plats. Ange lat/lon nedan."); setNeedsLocation(true); },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, [needsLocation]);

  /* ---------- DATA ---------- */
  const [spot, setSpot] = useState([]);                 // [{h, ore}]
  const [sunPct, setSunPct] = useState(Array(24).fill(0)); // 0..100
  const [sunSource, setSunSource] = useState("none");   // "live" | "fallback" | "cache" | "props"
  const [chargingHours, setChargingHours] = useState(Array(24).fill(false));
  const [socNow, setSocNow] = useState(socNowProp ?? 54);
  const [sending, setSending] = useState(false);
  const [sunSourceLabel, setSunSourceLabel] = useState("");
  const [sendMsg, setSendMsg] = useState("");
  const [warnMsg, setWarnMsg] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  /* “Nu”-timme, uppdatera varje minut */
  const [currentHour, setCurrentHour] = useState(() =>
    Number(new Date().toLocaleTimeString("sv-SE", { hour: "2-digit", timeZone: "Europe/Stockholm" }).slice(0, 2))
  );
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentHour(Number(new Date().toLocaleTimeString("sv-SE", { hour: "2-digit", timeZone: "Europe/Stockholm" }).slice(0, 2)));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  /* Spotpris idag -> fallback igår */
  const loadPrices = useCallback(async (date = new Date(), attempt = 0) => {
    const { Y, M, D } = getSEDateParts(date);
    const url = `https://www.elprisetjustnu.se/api/v1/prices/${Y}/${M}-${D}_${zone}.json`;
    const res = await fetch(url);
    if (!res.ok) {
      if (attempt === 0) {
        const y = new Date(date); y.setDate(y.getDate() - 1);
        return loadPrices(y, 1);
      }
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.map((p) => {
      const h = new Date(p.time_start).toLocaleTimeString("sv-SE", { hour: "2-digit", timeZone: "Europe/Stockholm" });
      return { h: Number(h), ore: Number(p.SEK_per_kWh) * 100 };
    });
  }, [zone]);

  /* SMHI sol – robust + fallback + cache (används endast om props saknas) */
  const loadSMHI = useCallback(async () => {
    const cacheKey = "bp_last_sun_good";
    try {
      const url = `https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/${lon}/lat/${lat}/data.json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`SMHI HTTP ${res.status}`);
      const j = await res.json();
      const ts = Array.isArray(j?.timeSeries) ? j.timeSeries : [];
      if (!ts.length) throw new Error("SMHI: tom timeSeries");

      const now = new Date();
      let window = ts.filter((p) => new Date(p.validTime) >= now).slice(0, 24);
      if (window.length === 0) window = ts.slice(0, 24);

      // Mappa till 0..100, försök nyttja moln-data om finns
      let arr = window.map((p) => {
        const tccMean = p.parameters?.find((x) => x.name === "tcc_mean");
        const tcc8    = p.parameters?.find((x) => x.name === "tcc");
        // tcc_mean: 0..1 (0 = klart), tcc: 0..8
        if (tccMean?.values?.length) return Math.round((1 - Number(tccMean.values[0])) * 100);
        if (tcc8?.values?.length)    return Math.round(((8 - Number(tcc8.values[0])) / 8) * 100);
        return 0;
      });

      // Om allt blev 0 → fallback baserat på solhöjd + ev. moln
      const allZero = !arr.some(v => v > 0);
      if (allZero) {
        const hours = Array.from({ length: 24 }, (_, i) => {
          const d = new Date(now); d.setHours(d.getHours() + i, 0, 0, 0);
          // försök läsa moln från samma fönster:
          const p = window[i];
          let cloudFrac = null;
          const tccMean = p?.parameters?.find(x => x.name === "tcc_mean");
          const tcc8    = p?.parameters?.find(x => x.name === "tcc");
          if (tccMean?.values?.length) cloudFrac = clamp01(Number(tccMean.values[0]));
          else if (tcc8?.values?.length) cloudFrac = clamp01(Number(tcc8.values[0]) / 8);
          return Math.round(computeFallbackSolIndex(d, lat, lon, cloudFrac) * 100);
        });
        arr = hours;
        setSunSource("fallback");
      } else {
        setSunSource("live");
      }

      // Pad/trim till exakt 24 och align mot aktuell timme
      if (arr.length < 24) arr = [...arr, ...Array(24 - arr.length).fill(arr[arr.length - 1] ?? 0)];
      if (arr.length > 24) arr = arr.slice(0, 24);

      const aligned = Array(24).fill(0);
      for (let i = 0; i < 24; i++) aligned[(currentHour + i) % 24] = arr[i];

      try { localStorage.setItem(cacheKey, JSON.stringify(aligned)); } catch {}
      return aligned;
    } catch (e) {
      console.error("SMHI-fel:", e);
      // Cache-fallback om finns
      try {
        const cached = JSON.parse(localStorage.getItem("bp_last_sun_good") || "[]");
        if (Array.isArray(cached) && cached.length === 24) { setSunSource("cache"); return cached; }
      } catch {}
      setSunSource("fallback");
      // Sista utväg: beräkna av solhöjd utan molninfo
      const now = new Date();
      const hours = Array.from({ length: 24 }, (_, i) => {
        const d = new Date(now); d.setHours(d.getHours() + i, 0, 0, 0);
        return Math.round(computeFallbackSolIndex(d, lat, lon, null) * 100);
      });
      return hours;
    }
  }, [lat, lon, currentHour]);

  /* Hämta allt + auto-refresh — nu med stöd för props */
  const fetchAll = useCallback(async () => {
    try {
      const [prices, solarMaybe] = await Promise.all([
        loadPrices(),
        (Array.isArray(sunPctProp) && sunPctProp.length === 24) ? Promise.resolve(null) : loadSMHI()
      ]);
      setSpot(prices);

      if (Array.isArray(sunPctProp) && sunPctProp.length === 24) {
        setSunPct(sunPctProp);
        setSunSource(sunSourceProp || "props");
      } else if (Array.isArray(solarMaybe)) {
        setSunPct(solarMaybe);
      }

      try {
        localStorage.setItem("bp_last_spot", JSON.stringify(prices));
        if (Array.isArray(sunPctProp) && sunPctProp.length === 24) {
          localStorage.setItem("bp_last_sun", JSON.stringify(sunPctProp));
        } else if (Array.isArray(solarMaybe)) {
          localStorage.setItem("bp_last_sun", JSON.stringify(solarMaybe));
        }
      } catch {}

      setLastUpdated(new Date().toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      console.error("Fel vid hämtning:", e);
      try {
        const cachedSpot = localStorage.getItem("bp_last_spot");
        const cachedSun = localStorage.getItem("bp_last_sun");
        if (cachedSpot) setSpot(JSON.parse(cachedSpot));
        if (cachedSun)  setSunPct(JSON.parse(cachedSun));
      } catch {}
    }
  }, [loadPrices, loadSMHI, sunPctProp, sunSourceProp]);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchAll]);

  /* ---------- AI: välj timmar ---------- */
  useEffect(() => {
    setWarnMsg("");
    if (spot.length !== 24) return;

    if (aiMode === "discharge" && (socNowProp ?? socNow) < reserveSOC) {
      setChargingHours(Array(24).fill(false));
      setWarnMsg("Urladdning stoppad: SOC under reservnivå.");
      return;
    }
    if (aiMode === "off") return;

    const limit = limitHours ? Math.max(1, Math.min(24, maxChargeHours)) : 24;
    const priceW = optPrice ? 1.0 : 0.0;
    const solarBias = (optSolar || considerSolar) ? 0.10 : 0.0; // lägre score när solen väntas
    const eventBonus = eventMode ? -15 : 0;

    let selectedIdx = [];
    if (aiMode === "charge") {
      const scored = spot.map((p, i) => ({ i, score: priceW * p.ore + (0 - sunPct[i]) * solarBias + eventBonus }));
      selectedIdx = scored.sort((a, b) => a.score - b.score).slice(0, limit).map((x) => x.i);
    } else {
      const scored = spot.map((p, i) => ({ i, score: (optPrice ? p.ore : 0) + (optSolar ? (100 - sunPct[i]) * 0.05 : 0) }));
      selectedIdx = scored.sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.i);
    }

    const next = Array(24).fill(false);
    selectedIdx.forEach((i) => (next[i] = true));
    setChargingHours(next);
  }, [aiMode, optPrice, optSolar, considerSolar, eventMode, limitHours, maxChargeHours, spot, sunPct, reserveSOC, socNowProp, socNow]);

  /* Grafdata */
  const data = useMemo(() => {
    const rows = [];
    for (let h = 0; h < 24; h++) {
      const sp = spot.find((x) => x.h === h)?.ore ?? null;
      rows.push({ hour: h, label: `${String(h).padStart(2, "0")}:00`, ore: sp, planned: chargingHours[h] ? 1 : 0, sun: sunPct[h] ?? 0 });
    }
    return rows;
  }, [spot, chargingHours, sunPct]);

  /* KPI */
  const selected = useMemo(() => data.filter((d) => d.planned && Number.isFinite(d.ore)), [data]);
  const avgOre = useMemo(() => (selected.length ? selected.reduce((s, d) => s + d.ore, 0) / selected.length : 0), [selected]);
  const elektoPlanned = selected.length;

  /* Manuell override */
  const toggleHour = (h) => setChargingHours((prev) => prev.map((v, i) => (i === h ? !v : v)));

  /* Simulerad SOC om ingen prop */
  useEffect(() => {
    if (socNowProp != null) return;
    const id = setInterval(() => {
      setSocNow((s) => {
        const dir = data[currentHour]?.planned ? +1 : -0.4;
        return Math.max(5, Math.min(100, Number((s + dir * 0.2).toFixed(1))));
      });
    }, 5000);
    return () => clearInterval(id);
  }, [data, currentHour, socNowProp]);

  /* Export (REST) */
  function buildPlan({ maxC = 4, maxD = 4 }) {
    return data.map((d) => {
      let action = "hold";
      if (aiMode === "charge") action = d.planned ? "charge" : "hold";
      if (aiMode === "discharge") action = d.planned ? "discharge" : "hold";

      let power_kW = 0;
      const soc = (socNowProp ?? socNow);
      if (action === "charge") {
        const roomUp = 100 - soc;
        power_kW = roomUp <= 0 ? 0 : (battery?.maxC ?? maxC) * Math.min(1, roomUp / 20);
      } else if (action === "discharge") {
        const roomDown = soc - reserveSOC;
        power_kW = roomDown <= 0 ? 0 : (battery?.maxD ?? maxD) * Math.min(1, roomDown / 20);
      }
      return { hour: d.hour, action, power_kW: Number(power_kW.toFixed(2)) };
    });
  }

  async function sendPlanREST() {
    try {
      setSending(true); setSendMsg("");
      const body = {
        version: 1, site_id: siteId, timezone: "Europe/Stockholm",
        effective_from: new Date().toISOString(),
        reserve_soc_pct: reserveSOC,
        location: { lat, lon },
        plan: buildPlan({ maxC: battery?.maxC ?? 4, maxD: battery?.maxD ?? 4 }),
        flags: { optPrice, optSolar, eventMode },
      };
      const res = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSendMsg("Plan skickad ✅");
    } catch (e) {
      console.error(e); setSendMsg(`Misslyckades: ${e.message}`);
    } finally {
      setSending(false); setTimeout(() => setSendMsg(""), 4000);
    }
  }

  return (
    <div className="battery-plan battery-plan--full">
      {/* Header */}
      <div className="bp-header">
        <div className="bp-title">
          <Zap size={18} className="bp-title-icon" />
          <h2>Battery AI Plan</h2>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <label className="bp-control" style={{padding:'.2rem .5rem'}}>
            Priszon
            <select value={zone} onChange={(e)=>onZoneChange && onZoneChange(e.target.value)} className="bg-white text-black px-2 py-1 rounded border border-slate-600">
              {["SE1","SE2","SE3","SE4"].map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </label>
        </div>
        <div className="bp-stats">
          <div className="bp-stat"><span className="bp-label">SOC</span><span className="bp-value">{Math.round(socNowProp ?? socNow)}%</span></div>
          <div className="bp-stat"><span className="bp-label">Elekto</span><span className="bp-value">{elektoPlanned}</span></div>
          <div className="bp-stat"><span className="bp-label">Medelpris</span><span className="bp-value">{avgOre.toFixed(1)} öre</span></div>
        </div>
      </div>

      {/* Platsinställning (visas om GPS nekats/saknas) */}
      {needsLocation && (
        <div className="bp-loc">
          <div className="bp-loc-row">
            <div className="flex items-center gap-2">
              <MapPin size={16} />
              <h4>Ange plats för solprognos</h4>
            </div>
            <button className="bp-loc-btn" onClick={() => setNeedsLocation(true) || setLocMsg("Försöker igen …")} title="Försök hämta via GPS igen">
              Använd min plats
            </button>
          </div>
          <div className="bp-loc-grid">
            <label>Lat<input type="number" step="0.0001" value={lat} onChange={(e) => setLat(Number(e.target.value))} /></label>
            <label>Lon<input type="number" step="0.0001" value={lon} onChange={(e) => setLon(Number(e.target.value))} /></label>
            <button className="bp-loc-btn" onClick={() => { try { localStorage.setItem(LS_LOC, JSON.stringify({ lat, lon })); } catch {} setNeedsLocation(false); setLocMsg("Plats sparad ✅"); }}>
              Spara plats
            </button>
          </div>
          {locMsg && <div className="bp-msg">{locMsg}</div>}
        </div>
      )}

      {/* Controls */}
      <div className="bp-controls">
        <label className="bp-control">
          <Cpu size={16} />
          AI-läge
          <select className="bp-select" value={aiMode} onChange={(e) => setPref("aiMode", e.target.value)}>
            <option value="off">Av (manuell)</option>
            <option value="charge">Ladda billigast</option>
            <option value="discharge">Sälj dyrast</option>
          </select>
        </label>

        <label className="bp-control">
          <BadgeDollarSign size={16} />
          Optimera efter pris
          <input type="checkbox" checked={optPrice} onChange={(e) => setPref("optPrice", e.target.checked)} />
        </label>

        <label className="bp-control">
          <Sun size={16} />
          Optimera med solprognos
          <input type="checkbox" checked={optSolar} onChange={(e) => setPref("optSolar", e.target.checked)} />
        </label>

        <label className="bp-control">
          Event-läge
          <input type="checkbox" checked={eventMode} onChange={(e) => setPref("eventMode", e.target.checked)} />
        </label>

        <label className="bp-control">
          Reservnivå
          <input type="number" min={0} max={100} value={reserveSOC} onChange={(e) => setPref("reserveSOC", Number(e.target.value))} />%
        </label>

        <label className="bp-control">
          Begränsa timmar
          <input type="checkbox" checked={limitHours} onChange={(e) => setPref("limitHours", e.target.checked)} />
        </label>

        {limitHours && (
          <label className="bp-control">
            Max timmar
            <input type="number" min={1} max={24} value={maxChargeHours} onChange={(e) => setPref("maxChargeHours", Number(e.target.value))} />
          </label>
        )}

        <button className="bp-btn" onClick={fetchAll} title="Hämta spotpris + SMHI på nytt">
          <RefreshCw size={16} /> Uppdatera data
        </button>
      </div>

      {/* Timrutor – manuell override */}
      <div className="hour-selector">
        <p>Välj timmar (klick för override):</p>
        <div className="hour-grid">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} onClick={() => toggleHour(h)} className={`hour-box ${chargingHours[h] ? "selected" : ""}`}>
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
      </div>

      {/* Graf */}
      <div className="chart-card">
        <div className="chart-header">
          <span>Spotpris (öre/kWh) • Solprognos (%) • Planerad laddning</span>
          <span className="now-tag">
            Nu: {String(currentHour).padStart(2, "0")}:00
            {lastUpdated ? ` • Uppdaterad ${lastUpdated}` : ""}
          </span>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#1b2338" />
            <XAxis dataKey="hour" tickFormatter={(v) => String(v).padStart(2, "0") + ":00"} tick={{ fill: '#9fb3c8' }} axisLine={{ stroke: '#2a3550' }} tickLine={{ stroke: '#2a3550' }} />
            <YAxis yAxisId="ore" domain={["auto", "auto"]} unit=" öre/kWh" tick={{ fill: '#9fb3c8' }} axisLine={{ stroke: '#2a3550' }} tickLine={{ stroke: '#2a3550' }} />
            <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} hide />
            {/* NYTT: separat axel för planerat 0..1 */}
            <YAxis yAxisId="planned" orientation="right" domain={[0, 1]} hide />

            <Tooltip
              labelFormatter={(v) => `${String(v).padStart(2, "0")}:00`}
              formatter={(v, n) => {
                if (n === "Sol (%)") return [`${Number(v).toFixed(0)} %`, n];
                if (n === "Planerat") return [v ? "Ja" : "Nej", n];
                return [`${Number(v).toFixed(1)} öre/kWh`, n];
              }}
              contentStyle={{ background: "#0b1220", border: "1px solid #1e293b", color: "#e2e8f0" }}
            />

            {(optSolar || considerSolar) && (
              <Area yAxisId="pct" type="monotone" dataKey="sun" name="Sol (%)" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.12} dot={false} isAnimationActive={false} />
            )}

            <Line yAxisId="ore" type="monotone" dataKey="ore" name="Spotpris" stroke="#facc15" strokeWidth={2} dot={false} isAnimationActive={false} />
            {/* ÄNDRAD: planerat på egen axel och använder 0/1 direkt */}
            <Line yAxisId="planned" type="stepAfter" dataKey="planned" name="Planerat" stroke="#00ffff" strokeWidth={2} dot={false} isAnimationActive={false} />

            <ReferenceLine x={currentHour} stroke="#f87171" strokeWidth={2} ifOverflow="extendDomain" className="pulse-marker" />
            {Number.isFinite(data[currentHour]?.ore) && (
              <ReferenceDot x={currentHour} y={data[currentHour].ore} r={6} fill="#f87171" stroke="none" isFront className="pulse-dot" />
            )}
          </LineChart>
        </ResponsiveContainer>

        <div className="kpis">
          <div>💡 Valda timmar: <b>{selected.length}</b></div>
          <div>💸 Medelpris valda: <b>{avgOre.toFixed(1)} öre/kWh</b></div>
          <div>⚡ ELEKTO (plan): <b>{elektoPlanned}</b></div>
          <div>☀️ Solprognos: <b>{sunSource === "live" ? "Live" : sunSource === "cache" ? "Cache" : sunSource === "props" ? "Cards" : "Fallback"}</b></div>
        </div>

        {warnMsg && <div className="bp-msg" style={{ color: "#fca5a5" }}>{warnMsg}</div>}

        <div className="mt-3 flex gap-2">
          <button onClick={sendPlanREST} disabled={sending} className="bp-btn">
            <Send size={16} /> {sending ? "Skickar..." : "Skicka plan"}
          </button>
          {sendMsg && <span className="bp-msg">{sendMsg}</span>}
        </div>
      </div>
    </div>
  );
}
