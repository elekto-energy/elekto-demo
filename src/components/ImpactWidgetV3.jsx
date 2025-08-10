// src/components/ImpactWidgetV3.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  AreaChart, Area,
  PieChart, Pie, Cell
} from "recharts";
import useSmhiData from "../hooks/useSmhiData.js";
import "./ImpactWidgetV3.css";

/**
 * ImpactWidget V3 — Futuristic, full-width, live-first
 * ----------------------------------------------------
 * Livekällor:
 *  - SMHI (useSmhiData): solar_rad (W/m²), wind_speed (m/s)
 *  - Spotpris: BatteryPlan cache "bp_last_spot" ( [{h, ore}] )
 *  - Förbrukning: valfritt via props; annars fallback till enkel modell (ingen mockhistorik)
 *
 * Kräver inga props — funkar direkt om BatteryPlan + SMHI-hook finns.
 * Har tabs: Timme, Dag (övriga tabs visas men kräver historik som ej finns ännu).
 */

const LS_LOC   = "batteryplan_location";
const LS_KWP   = "impact_v3_kwp";
const LS_WINDK = "impact_v3_windk";
const ELEKTO_PER_KWH = 1;

// ---------- Utils ----------
const clamp01 = (x) => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
const toSEKfromOre = (ore) => (Number(ore) || 0) / 100;

function nowHourSE() {
  return Number(new Date().toLocaleTimeString("sv-SE", { hour: "2-digit", timeZone: "Europe/Stockholm" }).slice(0,2));
}

// Simplified wind turbine curve (cut-in 3 m/s, rated 12 m/s)
function windCapacityFrac(v) {
  const cutIn = 3, rated = 12, cutOut = 25;
  if (!Number.isFinite(v) || v < cutIn) return 0;
  if (v >= cutOut) return 0;
  if (v >= rated) return 1;
  const f = Math.pow((v - cutIn) / (rated - cutIn), 3); // cubic ramp
  return clamp01(f);
}

function sum(arr) { return (arr || []).reduce((s,x)=>s+(Number(x)||0),0); }

export default function ImpactWidgetV3({
  // optional injections if you have them already
  loadKWh24,            // kWh per timme förbrukning (24)
  spotSEK24,            // SEK/kWh (24) — alternativ till bp_last_spot
  zone = "SE3",
  co2Grid_g_per_kWh = 40, // svensk elmix default
}) {
  // ---------- Location ----------
  const loc = useMemo(() => {
    try { const s = JSON.parse(localStorage.getItem(LS_LOC) || "{}");
      return { lat: (typeof s.lat === "number" ? s.lat : 59.33), lon: (typeof s.lon === "number" ? s.lon : 18.07) };
    } catch { return { lat: 59.33, lon: 18.07 }; }
  }, []);

  // ---------- Capacity settings ----------
  const [kWp, setKWp] = useState(() => {
    const n = Number(localStorage.getItem(LS_KWP)); return Number.isFinite(n) && n > 0 ? n : 10;
  });
  const [windKW, setWindKW] = useState(() => {
    const n = Number(localStorage.getItem(LS_WINDK)); return Number.isFinite(n) && n >= 0 ? n : 5;
  });
  useEffect(()=>{ try{ localStorage.setItem(LS_KWP, String(kWp)); }catch{} }, [kWp]);
  useEffect(()=>{ try{ localStorage.setItem(LS_WINDK, String(windKW)); }catch{} }, [windKW]);

  // ---------- Live data ----------
  const { forecast: smhi, loading: smhiLoading, error: smhiError } = useSmhiData(loc.lat, loc.lon);
  const currentHour = nowHourSE();

  // Spot from BP cache if not passed
  const spotSEK = useMemo(() => {
    if (Array.isArray(spotSEK24) && spotSEK24.length === 24) return spotSEK24;
    try {
      const cached = JSON.parse(localStorage.getItem("bp_last_spot") || "[]");
      if (!Array.isArray(cached) || cached.length === 0) return null;
      const arr = Array(24).fill(null);
      cached.forEach(p => { if (Number.isFinite(p.h)) arr[p.h] = toSEKfromOre(p.ore); });
      return arr.every(v => v === null) ? null : arr.map(v => Number.isFinite(v) ? +v.toFixed(3) : 0);
    } catch { return null; }
  }, [spotSEK24]);

  // Solar kWh/h from SMHI W/m²
  const solarKWh24 = useMemo(() => {
    if (!Array.isArray(smhi) || smhi.length === 0) return null;
    const derate = 0.85;
    const win = smhi.slice(0, 24);
    const kw = win.map(p => {
      const G = Number(p.solar_rad ?? 0); // W/m²
      const frac = clamp01(G / 1000);
      return +(kWp * derate * frac).toFixed(2);
    });
    const aligned = Array(24).fill(0);
    for (let i=0;i<24;i++) aligned[(currentHour + i) % 24] = kw[i];
    return aligned;
  }, [smhi, kWp, currentHour]);

  // Wind kWh/h from SMHI wind_speed
  const windKWh24 = useMemo(() => {
    if (!Array.isArray(smhi) || smhi.length === 0) return null;
    const win = smhi.slice(0, 24);
    const kw = win.map(p => {
      const v = Number(p.wind_speed ?? 0);
      return +(windKW * windCapacityFrac(v)).toFixed(2);
    });
    const aligned = Array(24).fill(0);
    for (let i=0;i<24;i++) aligned[(currentHour + i) % 24] = kw[i];
    return aligned;
  }, [smhi, windKW, currentHour]);

  // Load (fallback simple shape if not provided)
  const load24 = useMemo(() => {
    if (Array.isArray(loadKWh24) && loadKWh24.length === 24) return loadKWh24.map(x=>+Number(x).toFixed(2));
    // simple household curve (no mock history)
    return Array.from({ length: 24 }, (_, i) => {
      const base = 0.5 + (i>=7 && i<=22 ? 0.4 : 0.1);
      const eve  = (i>=17 && i<=21) ? 0.9 : 0;
      return +(base + eve).toFixed(2);
    });
  }, [loadKWh24]);

  // Hours labels
  const hours = useMemo(()=> Array.from({length:24},(_,h)=>`${String(h).padStart(2,"0")}:00`), []);

  // Rows (hour tab baseline)
  const hourRows = useMemo(() => {
    const solar = solarKWh24 ?? Array(24).fill(0);
    const wind  = windKWh24 ?? Array(24).fill(0);
    const spot  = spotSEK ?? Array(24).fill(1.0);
    const r = [];
    for (let i=0;i<24;i++) {
      const prod = solar[i] + wind[i];
      const cons = load24[i];
      const self = Math.min(prod, cons);
      const surp = Math.max(0, prod - cons);
      const def  = Math.max(0, cons - prod);
      // fees (approx): Köpt el = spot + ~0.42 + moms, Såld el ≈ spot - 0.08
      const buyCost   = def  * (spot[i] + 0.42 * 1.25);
      const sellIncome= surp * Math.max(0, spot[i] - 0.08);
      const fees      = def * (0.42 * 1.25) + surp * 0.08;
      r.push({
        hour: hours[i],
        Solar: +solar[i].toFixed(2),
        Vind: +wind[i].toFixed(2),
        Förbrukning: +cons.toFixed(2),
        Spot: +spot[i].toFixed(3),
        Köpt: +buyCost.toFixed(2),
        Sålt: +sellIncome.toFixed(2),
        Avgifter: +fees.toFixed(2),
        Egen: +self.toFixed(2),
        Överskott: +surp.toFixed(2),
        Underskott: +def.toFixed(2),
      });
    }
    return r;
  }, [solarKWh24, windKWh24, spotSEK, load24, hours]);

  // ---------- Tabs ----------
  const [tab, setTab] = useState("hour"); // hour | day | week | month | year

  // Aggregation helpers (we only have "today" live set; other periods need history)
  const dayTotals = useMemo(() => {
    const p = sum(hourRows.map(x=>x.Solar + x.Vind));
    const c = sum(hourRows.map(x=>x.Förbrukning));
    const income = sum(hourRows.map(x=>x.Sålt));
    const cost   = sum(hourRows.map(x=>x.Köpt));
    const fees   = sum(hourRows.map(x=>x.Avgifter));
    const self   = sum(hourRows.map(x=>x.Egen));
    const surp   = Math.max(0, p - c);
    const def    = Math.max(0, c - p);
    const net    = income - cost;
    const elektoMinted = p * ELEKTO_PER_KWH;
    const elektoShared = surp * ELEKTO_PER_KWH * 1.0; // assume share surplus
    const elektoKept   = elektoMinted - elektoShared;
    const co2SavedKg   = +(self * co2Grid_g_per_kWh / 1000).toFixed(2);
    return { p, c, self, surp, def, income, cost, fees, net, elektoMinted, elektoShared, elektoKept, co2SavedKg };
  }, [hourRows, co2Grid_g_per_kWh]);

  // ---------- Charts data per tab ----------
  const chartData = useMemo(() => {
    if (tab === "hour") return hourRows;
    // For other tabs we need history; show a single-point fallback with message
    return [{ label: "Idag", Produktion: dayTotals.p, Förbrukning: dayTotals.c, Intäkt: dayTotals.income, Kostnad: dayTotals.cost, Avgifter: dayTotals.fees }];
  }, [tab, hourRows, dayTotals]);

  // ---------- UI ----------
  const elektoPie = useMemo(() => [
    { name: "Behållna ELEKTO", value: dayTotals.elektoKept },
    { name: "Delade ELEKTO", value: dayTotals.elektoShared },
  ], [dayTotals]);

  return (
    <div className="impactv3 card-glass w-full col-span-full">
      {/* Header */}
      <div className="impactv3-header">
        <div className="impactv3-title">
          <span className="icon-spark">⚡</span>
          <h3>Impact & Ekonomi • {zone}</h3>
        </div>
        <div className="impactv3-controls">
          <div className="kvp">
            <label>Sol (kWp)</label>
            <input type="number" min="0.5" step="0.1" value={kWp} onChange={(e)=>setKWp(Math.max(0.1, Number(e.target.value)||0))} />
          </div>
          <div className="kvp">
            <label>Vind (kW)</label>
            <input type="number" min="0" step="0.1" value={windKW} onChange={(e)=>setWindKW(Math.max(0, Number(e.target.value)||0))} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="impactv3-tabs">
        {["hour","day","week","month","year"].map((t) => (
          <button key={t} className={`tab ${tab===t?"active":""}`} onClick={()=>setTab(t)}>
            {t==="hour" && "⏱ Timme"}
            {t==="day" && "📅 Dag"}
            {t==="week" && "📆 Vecka"}
            {t==="month" && "📈 Månad"}
            {t==="year" && "🗓 År"}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">Producerat {tab==="hour"?"(idag)":""}</div>
          <div className="kpi-value">{dayTotals.p.toFixed(1)}<span className="unit"> kWh</span></div>
          <div className="kpi-sub">Sol + vind</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Förbrukning</div>
          <div className="kpi-value">{dayTotals.c.toFixed(1)}<span className="unit"> kWh</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Netto</div>
          <div className={`kpi-value ${dayTotals.net>=0?"pos":"neg"}`}>{dayTotals.net.toFixed(2)}<span className="unit"> kr</span></div>
          <div className="kpi-sub">Avgifter {dayTotals.fees.toFixed(2)} kr</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">ELEKTO mintad</div>
          <div className="kpi-value">{dayTotals.elektoMinted.toFixed(1)}<span className="unit"> tok</span></div>
          <div className="kpi-sub">🟡 Delad {dayTotals.elektoShared.toFixed(1)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">CO₂ sparat</div>
          <div className="kpi-value">{dayTotals.co2SavedKg.toFixed(2)}<span className="unit"> kg</span></div>
        </div>
      </div>

      {/* Charts row */}
      <div className="charts-row">
        <div className="chart-card">
          <div className="chart-title">Produktion vs Förbrukning</div>
          <ResponsiveContainer width="100%" height={260}>
            {tab==="hour" ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gradSolar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopOpacity="0.65" />
                    <stop offset="100%" stopOpacity="0.05" />
                  </linearGradient>
                  <linearGradient id="gradWind" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopOpacity="0.6" />
                    <stop offset="100%" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="grid" />
                <XAxis dataKey="hour" />
                <YAxis unit=" kWh" />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="Solar" strokeWidth={2} fill="url(#gradSolar)" />
                <Area type="monotone" dataKey="Vind" strokeWidth={2} fill="url(#gradWind)" />
                <Line type="monotone" dataKey="Förbrukning" strokeWidth={2} dot={false} />
              </AreaChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="grid" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Produktion" />
                <Bar dataKey="Förbrukning" />
              </BarChart>
            )}
          </ResponsiveContainer>
          {tab!=="hour" && (
            <div className="muted">Behöver historik för vald period – visar dagens total som jämförelse.</div>
          )}
        </div>

        <div className="chart-card">
          <div className="chart-title">Ekonomi</div>
          <ResponsiveContainer width="100%" height={260}>
            {tab==="hour" ? (
              <LineChart data={hourRows}>
                <CartesianGrid strokeDasharray="3 3" className="grid" />
                <XAxis dataKey="hour" />
                <YAxis unit=" kr" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Sålt" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Köpt" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Avgifter" strokeWidth={2} dot={false} />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="grid" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Intäkt" />
                <Bar dataKey="Kostnad" />
                <Bar dataKey="Avgifter" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* ELEKTO / CO2 row */}
      <div className="charts-row">
        <div className="chart-card">
          <div className="chart-title">ELEKTO – behållna vs delade</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie dataKey="value" data={[
                { name: "Behållna", value: dayTotals.elektoKept },
                { name: "Delade", value: dayTotals.elektoShared },
              ]} outerRadius={84} label>
                <Cell />
                <Cell />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-title">CO₂-besparing</div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={[{x:"Idag", y: dayTotals.co2SavedKg}]}>
              <CartesianGrid strokeDasharray="3 3" className="grid" />
              <XAxis dataKey="x" />
              <YAxis unit=" kg" />
              <Tooltip />
              <Area type="monotone" dataKey="y" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="muted">Beräknat på egenanvänd produktion och elmix {co2Grid_g_per_kWh} g CO₂/kWh.</div>
        </div>
      </div>

      {(smhiLoading || smhiError) && (
        <div className="loading-note">
          {smhiLoading ? "Hämtar SMHI…" : `SMHI-fel: ${smhiError}`}
        </div>
      )}
    </div>
  );
}
