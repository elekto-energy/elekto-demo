// src/components/cards/BatteryPlanProShadcn.jsx
// ELEKTO – Batteriplan (enkel timlista med cykel: ingen → köp → sälj, AI-val av N timmar, stabila tider, save/print)

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ReferenceArea,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Zap, RefreshCw, Brain, Printer } from "lucide-react";
import { useZone } from "@/context/ZoneContext";

const to2 = (x) => Math.round((x ?? 0) * 100) / 100;
const HOUR = 3600 * 1000;

// Normalisera till hel timme (stabilt mellan fetchar/SMHI-vind on/off)
function normalizeHour(ts) {
  const d = new Date(ts);
  d.setMinutes(0, 0, 0);
  return d.getTime();
}

/* ---------------- Datafetchers ---------------- */
let __loggedSpotOnce = false;
async function fetchSpot({ zone }) {
  const urls = [
    `/api/spotprice/day?zone=${zone}`,
    `/spotprice/day?zone=${zone}`,
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) continue;
      const j = await r.json();
      const arr = Array.isArray(j) ? j : (j.data || j.prices || j.hours || j.today);
      if (!Array.isArray(arr) || !arr.length) continue;
      const out = arr.slice(0, 48).map((x) => {
        const iso = x.hourISO ?? x.ts ?? x.time ?? x.start ?? x.startTime ?? x.start_at;
        const t = Number.isFinite(new Date(iso).getTime()) ? new Date(iso).getTime() : Date.now();
        const ts = normalizeHour(t);
        const price = Number(x.price ?? x.price_SEK_per_kWh ?? x.sek_per_kwh ?? x.value ?? x.sek) || 0;
        return { hourISO: new Date(ts).toISOString(), ts, price };
      });
      if (out.length && !__loggedSpotOnce) { console.info("[BatteryPlan] spotpris OK:", url, out[0]); __loggedSpotOnce = true; }
      return out;
    } catch {}
  }
  // fallback 24h
  const now = new Date(); now.setMinutes(0,0,0);
  return Array.from({ length: 24 }, (_, i) => {
    const t = new Date(now.getTime() + i * HOUR);
    const ts = normalizeHour(t.getTime());
    const v = 0.4 + 0.25 * Math.sin((i+2)/3) + 0.05 * Math.random();
    return { hourISO: new Date(ts).toISOString(), ts, price: +Math.max(0.05, v).toFixed(3) };
  });
}
async function fetchPV({ lat, lon, peakKW = 10, efficiency = 0.2 }) {
  try {
    const r = await fetch(`/api/smhi?lat=${lat}&lon=${lon}`);
    if (!r.ok) return [];
    const { forecast } = await r.json();
    return (forecast || []).slice(0, 48).map((x) => {
      const iso = x.time ?? x.hourISO ?? x.ts;
      const ts = normalizeHour(iso ? new Date(iso).getTime() : Date.now());
      const valWm2 = Number(x.globalRadiation ?? x.gsr ?? 0);
      const kWh = (valWm2 / 1000) * peakKW * efficiency;
      return { hourISO: new Date(ts).toISOString(), ts, pv_kwh: to2(Math.max(0, kWh)) };
    });
  } catch { return []; }
}
function windPowerFromSpeed(v, cfg) {
  const { v_ci, v_r, v_co, ratedPowerKW } = cfg;
  if (v < v_ci || v >= v_co) return 0;
  if (v >= v_r) return ratedPowerKW;
  const num = Math.pow(v, 3) - Math.pow(v_ci, 3);
  const den = Math.pow(v_r, 3) - Math.pow(v_ci, 3);
  return ratedPowerKW * (num / den);
}
async function fetchWind({ lat, lon, useSmhiWind, turbine = { ratedPowerKW: 3, v_ci: 3, v_r: 12, v_co: 25, count: 1 } }) {
  if (!useSmhiWind) {
    // Mock med STABILA timstämplar
    const now = new Date(); now.setMinutes(0,0,0);
    return Array.from({ length: 48 }).map((_, i) => {
      const ts = normalizeHour(new Date(now.getTime() + i * HOUR).getTime());
      const wind = Math.max(0, 0.7 + 0.6 * Math.sin(i / 6) + (Math.random() - 0.5) * 0.2);
      return { hourISO: new Date(ts).toISOString(), ts, wind_kwh: to2(wind) };
    });
  }
  try {
    const r = await fetch(`/api/smhi?lat=${lat}&lon=${lon}`);
    if (!r.ok) return [];
    const { forecast } = await r.json();
    return (forecast || []).slice(0, 48).map((x) => {
      const iso = x.time ?? x.hourISO ?? x.ts;
      const ts = normalizeHour(iso ? new Date(iso).getTime() : Date.now());
      const v = Number(x.wind_speed || x.ws || 0);
      const PkW = windPowerFromSpeed(v, turbine) * (turbine.count || 1);
      return { hourISO: new Date(ts).toISOString(), ts, wind_kwh: to2(Math.max(0, PkW)) };
    });
  } catch { return []; }
}

/* ---------------- Huvudkomponent ---------------- */
export default function BatteryPlanProShadcn({
  lat = 59.33,
  lon = 18.07,
  useSmhiWind = false,
  turbineCfg = { ratedPowerKW: 3, v_ci: 3, v_r: 12, v_co: 25, count: 1 },
  battery = {
    capacity_kwh: 45,
    soc_init: 0.55,
    soc_min: 0.15,
    soc_max: 0.95,
    max_charge_kw: 10,
    max_discharge_kw: 10,
    roundtrip_eff: 0.9,
  },
}) {
  const { zone, setZone } = useZone();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [windLive, setWindLive] = useState(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("bp_useSmhiWind") : null;
    return saved !== null ? saved === "true" : useSmhiWind;
  });

  // Val per timme: Map<ts, "none" | "buy" | "sell">
  const [selMap, setSelMap] = useState(() => new Map());
  const setAction = (ts, action) => setSelMap(prev => {
    const n = new Map(prev);
    if (action === "none") n.delete(ts); else n.set(ts, action);
    return n;
  });
  const cycleAction = (ts) => setSelMap(prev => {
    const n = new Map(prev);
    const cur = n.get(ts) || "none";
    const next = cur === "none" ? "buy" : cur === "buy" ? "sell" : "none";
    if (next === "none") n.delete(ts); else n.set(ts, next);
    return n;
  });
  const clearAll = () => setSelMap(new Map());

  // stabil refresh
  const inFlight = useRef(false);
  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    const race = (p, ms=10000) => Promise.race([p, new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")), ms))]);
    try {
      const [spot, pv, wind] = await Promise.all([
        race(fetchSpot({ zone })), race(fetchPV({ lat, lon })), race(fetchWind({ lat, lon, useSmhiWind: windLive, turbine: turbineCfg }))
      ]);
      // merge by ts
      const by = new Map();
      const push = (arr) => arr.forEach(x => {
        const ts = x.ts ?? normalizeHour(x.hourISO ? new Date(x.hourISO).getTime() : Date.now());
        const o = by.get(ts) ?? { hourISO: new Date(ts).toISOString(), ts };
        Object.assign(o, x, { ts, hourISO: new Date(ts).toISOString() });
        by.set(ts, o);
      });
      push(spot); push(pv); push(wind);
      let merged = [...by.values()].sort((a,b)=>a.ts-b.ts);
      // default lastprofil
      merged.forEach(m => {
        const h = new Date(m.ts).getHours();
        m.load_kwh = m.load_kwh ?? to2(0.8 + (h>=17&&h<=22?0.7:0) + (h>=0&&h<=5?-0.2:0));
      });
      // trim efter sista pris
      const lastPriceTs = Math.max(...(spot||[]).map(s=>s.ts).filter(Number.isFinite));
      if (Number.isFinite(lastPriceTs)) merged = merged.filter(m=>m.ts<=lastPriceTs);
      setRows(merged);
    } catch(e) {
      console.warn("[BatteryPlan] refresh error:", e);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [zone, lat, lon, windLive, turbineCfg]);

  useEffect(()=>{ refresh(); }, [zone, lat, lon, windLive]);
  useEffect(()=>{ localStorage.setItem("bp_useSmhiWind", String(windLive)); }, [windLive]);

  // Derivera sets
  const buyTs = useMemo(() => new Set([...selMap.entries()].filter(([,a])=>a==="buy").map(([k])=>k)), [selMap]);
  const sellTs = useMemo(() => new Set([...selMap.entries()].filter(([,a])=>a==="sell").map(([k])=>k)), [selMap]);

  // x-axel ticks var 3:e timme
  const ticks3h = useMemo(() => {
    if (!rows.length) return [];
    const start = rows[0].ts, end = rows[rows.length-1].ts;
    const out = []; for (let t=start; t<=end + 1; t+=3*HOUR) out.push(t); return out;
  }, [rows]);

  // prod vs cons dataset
  const dataProdCons = useMemo(() => rows.map(r => ({
    ts: r.ts,
    production: to2((r.pv_kwh || 0) + (r.wind_kwh || 0)),
    consumption: to2(r.load_kwh || 0),
  })), [rows]);

  // min/max pris för prickar
  const minMax = useMemo(() => {
    if (!rows.length) return {};
    let min = rows[0], max = rows[0];
    for (const r of rows) {
      if ((r.price ?? Infinity) < (min.price ?? Infinity)) min = r;
      if ((r.price ?? -Infinity) > (max.price ?? -Infinity)) max = r;
    }
    return { min, max };
  }, [rows]);

  // dataset till prisgraf med planstaplar
  const dataPrice = useMemo(() => rows.map(r => ({
    ...r,
    plan_buy: buyTs.has(r.ts) ? 1 : 0,
    plan_sell: sellTs.has(r.ts) ? -1 : 0,
  })), [rows, buyTs, sellTs]);

  /* ---------------- Batteri-simulering för energi, SoC, summering ---------------- */
  const simulateEnergy = (rowsArr, buySet, sellSet, batt) => {
    const dt = 1; // tim
    const cap = batt.capacity_kwh;
    const effIn = Math.sqrt(batt.roundtrip_eff ?? 0.9);
    const effOut = Math.sqrt(batt.roundtrip_eff ?? 0.9);
    let soc = (batt.soc_init ?? 0.5) * cap; // kWh
    const socMin = (batt.soc_min ?? 0.15) * cap;
    const socMax = (batt.soc_max ?? 0.95) * cap;

    let peakChargeKW = 0;
    let peakDischargeKW = 0;

    const out = [];
    for (const r of rowsArr) {
      const wantBuy = buySet.has(r.ts);
      const wantSell = sellSet.has(r.ts);

      let e = 0; // +kWh (ladd), -kWh (sälj)

      if (wantBuy && !wantSell) {
        const room = Math.max(0, socMax - soc); // kWh
        const can = Math.min(room, (batt.max_charge_kw ?? 0) * dt);
        e = can; // kWh in (före förluster)
        soc = Math.min(socMax, soc + e * effIn);
        peakChargeKW = Math.max(peakChargeKW, can / dt);
      } else if (wantSell && !wantBuy) {
        const available = Math.max(0, soc - socMin);
        const can = Math.min(available, (batt.max_discharge_kw ?? 0) * dt);
        e = -can; // kWh ut (före förluster)
        soc = Math.max(socMin, soc + e / effOut);
        peakDischargeKW = Math.max(peakDischargeKW, can / dt);
      } else {
        e = 0;
      }

      out.push({
        ts: r.ts,
        hourISO: r.hourISO || new Date(r.ts).toISOString(),
        price: r.price ?? 0,
        energy_kWh: Math.round(e * 100) / 100,
        soc_after_pct: Math.round((soc / cap) * 10000) / 100,
        action: e > 0 ? "buy" : e < 0 ? "sell" : "none",
      });
    }
    return { perHour: out, peakChargeKW: to2(peakChargeKW), peakDischargeKW: to2(peakDischargeKW) };
  };

  const sim = useMemo(() => simulateEnergy(rows, buyTs, sellTs, battery), [rows, buyTs, sellTs, battery]);

  const totals = useMemo(() => {
    const arr = sim.perHour?.filter(x => x.energy_kWh !== 0) || [];
    const totalBuyKWh  = arr.filter(x => x.energy_kWh > 0).reduce((a,x)=>a+x.energy_kWh, 0);
    const totalSellKWh = arr.filter(x => x.energy_kWh < 0).reduce((a,x)=>a+(-x.energy_kWh), 0);
    const cost  = arr.filter(x => x.energy_kWh > 0).reduce((a,x)=>a + x.energy_kWh * (x.price||0), 0);
    const rev   = arr.filter(x => x.energy_kWh < 0).reduce((a,x)=>a + (-x.energy_kWh) * (x.price||0), 0);
    const profit = to2(rev - cost);
    return {
      totalBuyKWh: to2(totalBuyKWh),
      totalSellKWh: to2(totalSellKWh),
      cost: to2(cost),
      rev: to2(rev),
      profit,
      peakChargeKW: sim.peakChargeKW || 0,
      peakDischargeKW: sim.peakDischargeKW || 0,
    };
  }, [sim]);

  /* ---------------- AI-val: välj N bästa timmar ---------------- */
  const [buyCount, setBuyCount] = useState(3);
  const [sellCount, setSellCount] = useState(3);

  // Heuristik: köp = lågt pris + underskott, sälj = högt pris + överskott
  const pickBestHours = () => {
    const scored = rows.map(r => {
      const gen = (r.pv_kwh || 0) + (r.wind_kwh || 0);
      const deficit = Math.max(0, (r.load_kwh || 0) - gen);
      const surplus = Math.max(0, gen - (r.load_kwh || 0));
      return {
        ts: r.ts,
        price: r.price || 0,
        buyScore: (r.price || 0) - 0.25 * deficit,   // lägre bättre
        sellScore: (r.price || 0) + 0.25 * surplus,  // högre bättre
      };
    });

    const buyBest  = scored.slice().sort((a,b)=>a.buyScore - b.buyScore).slice(0, Math.max(0, buyCount));
    const sellBest = scored.slice().sort((a,b)=>b.sellScore - a.sellScore).slice(0, Math.max(0, sellCount));

    // Sätt val: exklusivt per timme, sälj vinner om kollision (kan växlas vid behov)
    const newMap = new Map();
    for (const b of buyBest) newMap.set(b.ts, "buy");
    for (const s of sellBest) newMap.set(s.ts, "sell");
    setSelMap(newMap);
  };

  /* ---------------- Save & Print ---------------- */
  const [saving, setSaving] = useState(false);

  const savePlan = async () => {
    try {
      setSaving(true);
      const per = (sim.perHour || []).filter(h => h.action !== "none").map(h => ({
        hourISO: h.hourISO,
        action: h.action,                       // "buy" | "sell"
        energy_kWh: Math.abs(h.energy_kWh),     // positivt tal i payload
        price: h.price,
        soc_after_pct: h.soc_after_pct,
      }));

      const body = {
        zone,
        source: "batteryplan-ui",
        battery: {
          capacity_kwh: battery.capacity_kwh,
          soc_init_pct: (battery.soc_init ?? 0.5) * 100,
          soc_min_pct: (battery.soc_min ?? 0.15) * 100,
          soc_max_pct: (battery.soc_max ?? 0.95) * 100,
          max_charge_kw: battery.max_charge_kw,
          max_discharge_kw: battery.max_discharge_kw,
          roundtrip_eff: battery.roundtrip_eff,
        },
        hours: per,
        summary: {
          total_buy_kWh: totals.totalBuyKWh,
          total_sell_kWh: totals.totalSellKWh,
          cost_kr: totals.cost,
          revenue_kr: totals.rev,
          profit_kr: totals.profit,
          peak_charge_kW: totals.peakChargeKW,
          peak_discharge_kW: totals.peakDischargeKW,
        },
      };

      const res = await fetch("/api/charge-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.info("Plan sparad ✔");
    } catch (e) {
      console.warn("Kunde inte spara plan:", e);
    } finally {
      setSaving(false);
    }
  };

  const printPlan = () => {
    const arr = sim.perHour?.filter(x => x.action !== "none") || [];

    const html = `
<!doctype html><html>
<head>
<meta charset="utf-8"/>
<title>Batteriplan – ${zone}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color:#0f172a; }
  h1 { margin:0 0 4mm; font-size:18pt; }
  .meta { margin:0 0 6mm; font-size:10pt; color:#475569; }
  table { width:100%; border-collapse: collapse; font-size:11pt; }
  th, td { border-bottom:1px solid #e2e8f0; padding:6px 4px; text-align:left; }
  th { background:#f8fafc; }
  .buy { color:#16a34a; font-weight:600; }
  .sell { color:#ef4444; font-weight:600; }
  .right { text-align:right; }
  .muted { color:#64748b; }
</style>
</head>
<body>
  <h1>ELEKTO – Dagens batteriplan (${zone})</h1>
  <div class="meta">
    Genererad: ${new Date().toLocaleString("sv-SE")}
    • Total laddning: ${totals.totalBuyKWh.toFixed(2)} kWh
    • Total försäljning: ${totals.totalSellKWh.toFixed(2)} kWh
    • Kostnad: ${totals.cost.toFixed(2)} kr
    • Intäkt: ${totals.rev.toFixed(2)} kr
    • Nettovinst: ${totals.profit.toFixed(2)} kr
    • Peak ladd: ${totals.peakChargeKW.toFixed(1)} kW
    • Peak sälj: ${totals.peakDischargeKW.toFixed(1)} kW
  </div>
  <table>
    <thead><tr>
      <th>Tid</th><th>Pris (kr/kWh)</th><th>Åtgärd</th><th class="right">Energi (kWh)</th><th class="right">Rad-summa (kr)</th><th class="right muted">SoC efter (%)</th>
    </tr></thead>
    <tbody>
      ${arr.map(r => {
        const kr = (Math.abs(r.energy_kWh) * (r.price||0)) * (r.action === "buy" ? -1 : 1);
        return `
          <tr>
            <td>${new Date(r.hourISO).toLocaleTimeString("sv-SE",{hour:"2-digit",minute:"2-digit"})}</td>
            <td class="right">${(r.price||0).toFixed(2)}</td>
            <td class="${r.action === "buy" ? "buy" : "sell"}">${r.action === "buy" ? "Ladda" : "Sälj"}</td>
            <td class="right">${Math.abs(r.energy_kWh).toFixed(2)}</td>
            <td class="right">${kr.toFixed(2)}</td>
            <td class="right muted">${(r.soc_after_pct||0).toFixed(1)}</td>
          </tr>`;
      }).join("")}
    </tbody>
  </table>
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open(); w.document.write(html); w.document.close();
    w.focus(); // användaren väljer “Skriv ut” → PDF om så önskas
    w.print();
  };

  // pulserande punkter CSS
  const pulseCss = `
  @keyframes pulseHilo { 0%{transform:scale(1);opacity:.9} 50%{transform:scale(1.6);opacity:.6} 100%{transform:scale(1);opacity:.9} }
  .dot-min { animation:pulseHilo 1.8s ease-in-out infinite; }
  .dot-max { animation:pulseHilo 1.8s ease-in-out infinite; animation-delay:.9s; }
  `;

  // medelpriser för val
  const avgBuy = useMemo(() => {
    const arr = rows.filter(r => buyTs.has(r.ts));
    return arr.length ? to2(arr.reduce((a,x)=>a+(x.price||0),0)/arr.length) : 0;
  }, [rows, buyTs]);
  const avgSell = useMemo(() => {
    const arr = rows.filter(r => sellTs.has(r.ts));
    return arr.length ? to2(arr.reduce((a,x)=>a+(x.price||0),0)/arr.length) : 0;
  }, [rows, sellTs]);

  return (
    <div className="w-full space-y-4">
      <style>{pulseCss}</style>

      <Card className="shadow-lg border border-slate-200/60 dark:border-slate-700/60 bg-white/70 text-slate-900 backdrop-blur dark:bg-slate-900/80 dark:text-slate-100">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <Zap className="w-5 h-5" /> ELEKTO – Batteriplan
          </CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            {/* Zon */}
            <Select value={zone} onValueChange={setZone}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="Zon" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SE1">SE1</SelectItem>
                <SelectItem value="SE2">SE2</SelectItem>
                <SelectItem value="SE3">SE3</SelectItem>
                <SelectItem value="SE4">SE4</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 text-sm">
              <span>SMHI-vind</span>
              <Switch checked={windLive} onCheckedChange={setWindLive} />
            </div>

            <Button variant="secondary" className="gap-2" onClick={refresh} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Uppdatera data
            </Button>

            <Button variant="outline" className="gap-2" onClick={clearAll}>
              Rensa val
            </Button>

            <Button variant="outline" className="gap-2" onClick={printPlan} title="Öppna ny flik och skriv ut (PDF i dialogen)">
              <Printer className="w-4 h-4" /> Skriv ut plan (A4)
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* PRODUKTION vs FÖRBRUKNING */}
          <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 p-3 bg-white/50 dark:bg-slate-900/40">
            <div className="text-sm opacity-80 mb-2">Produktion vs Förbrukning</div>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={dataProdCons} margin={{ left: 12, right: 12, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
                <XAxis
                  type="number" dataKey="ts" scale="time" domain={["dataMin","dataMax"]}
                  ticks={ticks3h} tickFormatter={(t)=>new Date(t).toLocaleTimeString("sv-SE",{hour:"2-digit"})}
                  tickLine={false} axisLine={false} tickMargin={10} minTickGap={24}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={6} />
                <ReTooltip labelFormatter={(v)=>new Date(v).toLocaleString("sv-SE")} />
                <Legend />
                <Line type="monotone" dataKey="consumption" name="Förbrukning (kWh)" stroke="#a78bfa" dot />
                <Line type="monotone" dataKey="production"  name="Produktion (kWh)"  stroke="#0ea5e9" dot />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* VÄLJ TIMMAR: enkel lista som cyklar Ingen → Köp → Sälj + AI-val av antal timmar */}
          <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 p-3 bg-white/50 dark:bg-slate-900/40">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="text-sm opacity-80">Välj timmar (klick = växla färg): Grön = Köp • Röd = Sälj</div>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span>Köp timmar</span>
                  <Input className="w-16" type="number" min={0} value={buyCount} onChange={(e)=>setBuyCount(Math.max(0, Number(e.target.value)||0))}/>
                </div>
                <div className="flex items-center gap-2">
                  <span>Sälj timmar</span>
                  <Input className="w-16" type="number" min={0} value={sellCount} onChange={(e)=>setSellCount(Math.max(0, Number(e.target.value)||0))}/>
                </div>
                <Button size="sm" onClick={pickBestHours}>
                  <Brain className="w-4 h-4 mr-1" /> AI välj bästa
                </Button>
              </div>
            </div>

            <HourPickerTri rows={rows} selMap={selMap} onCycle={cycleAction} />

            {/* live-KPI */}
            <div className="text-sm opacity-80 mt-3">
              Medelpris Köp: <b>{avgBuy}</b> kr/kWh •
              Medelpris Sälj: <b>{avgSell}</b> kr/kWh •
              Ladda: <b>{totals.totalBuyKWh.toFixed(1)} kWh</b> •
              Sälj: <b>{totals.totalSellKWh.toFixed(1)} kWh</b> •
              Nettovinst: <b>{totals.profit.toFixed(0)} kr</b> •
              Peak: <b>{totals.peakChargeKW.toFixed(1)} kW</b> ladd / <b>{totals.peakDischargeKW.toFixed(1)} kW</b> sälj
              <Button size="sm" className="ml-3" onClick={savePlan} disabled={saving}>
                <Brain className="w-4 h-4 mr-1" /> {saving ? "Sparar..." : "AI-planera"}
              </Button>
            </div>
          </div>

          {/* SPOTPRIS + STAPLAR (KÖP/SÄLJ) + PULS MIN/MAX */}
          <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 p-3 bg-white/50 dark:bg-slate-900/40">
            <div className="text-sm opacity-80 mb-2">Spotpris per timme</div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={dataPrice} margin={{ left: 12, right: 12, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
                <XAxis
                  type="number" dataKey="ts" scale="time" domain={["dataMin","dataMax"]}
                  ticks={ticks3h} tickFormatter={(t)=>new Date(t).toLocaleTimeString("sv-SE",{hour:"2-digit"})}
                  tickLine={false} axisLine={false} tickMargin={10} minTickGap={24}
                />
                {/* Vänster axel för staplar (-1..1), göm skalan */}
                <YAxis yAxisId="plan" domain={[-1.2,1.2]} hide />
                {/* Höger axel för pris */}
                <YAxis yAxisId="price" orientation="right" tickLine={false} axisLine={false} tickMargin={6} />
                <ReTooltip
                  labelFormatter={(v)=>new Date(v).toLocaleString("sv-SE")}
                  formatter={(val, name)=>[to2(val), name]}
                />
                <Legend />

                {/* Bakgrundsband */}
                {rows.map((r, idx) =>
                  buyTs.has(r.ts) ? (
                    <ReferenceArea key={`buy-${idx}`} x1={r.ts} x2={r.ts+HOUR-1} yAxisId="plan" y1={-1.2} y2={1.2} fill="rgba(34,197,94,.12)" strokeOpacity={0} />
                  ) : sellTs.has(r.ts) ? (
                    <ReferenceArea key={`sell-${idx}`} x1={r.ts} x2={r.ts+HOUR-1} yAxisId="plan" y1={-1.2} y2={1.2} fill="rgba(239,68,68,.12)" strokeOpacity={0} />
                  ) : null
                )}

                {/* Staplar: Köp (grön, +1) och Sälj (röd, -1) */}
                <Bar yAxisId="plan" dataKey="plan_buy" name="Köp (valda)" barSize={8} fill="#22c55e" />
                <Bar yAxisId="plan" dataKey="plan_sell" name="Sälj (valda)" barSize={8} fill="#ef4444" />

                {/* Prislinje */}
                <Line
                  yAxisId="price" type="monotone" dataKey="price" name="Pris (kr/kWh)" stroke="#f97316" strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={(props)=>{
                    const { cx, cy, payload } = props;
                    const isMin = payload.ts === minMax.min?.ts;
                    const isMax = payload.ts === minMax.max?.ts;
                    const cls = isMin ? "dot-min" : isMax ? "dot-max" : "";
                    const fill = isMin ? "#10b981" : isMax ? "#ef4444" : "#f97316";
                    return <circle cx={cx} cy={cy} r={isMin||isMax ? 5 : 4} className={cls} fill={fill} stroke="white" strokeWidth="1" />;
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="text-xs mt-1 opacity-70">
              Grön stapel = Köp • Röd stapel = Sälj • Pulserande grön/röd punkt = lägsta/högsta pris
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- Timlista med cykel Ingen → Köp → Sälj ---------------- */
function HourPickerTri({ rows, selMap, onCycle }) {
  if (!rows?.length) return null;
  const hours = rows.map(r => ({ ts: r.ts, label: new Date(r.ts).toLocaleTimeString("sv-SE",{hour:"2-digit"}) }));
  return (
    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
      {hours.map(h => {
        const a = selMap.get(h.ts) || "none";
        const cls =
          a === "buy"  ? "bg-emerald-500 text-white border-emerald-500" :
          a === "sell" ? "bg-red-500 text-white border-red-500" :
          "bg-transparent border-slate-300/60 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800/60";
        return (
          <button
            key={h.ts}
            onClick={()=>onCycle(h.ts)}
            className={`text-sm px-2 py-1 rounded-md border transition ${cls}`}
            title={new Date(h.ts).toLocaleString("sv-SE")}
          >
            {h.label}
          </button>
        );
      })}
    </div>
  );
}
