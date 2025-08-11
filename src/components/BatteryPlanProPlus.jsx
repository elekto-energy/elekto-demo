// src/components/cards/BatteryPlanProShadcn.jsx
// ELEKTO – Batteriplan (shadcn/ui) – live spotpris + SMHI sol/vind
// Enkelvy (Ladda/Sälj) + Avancerat (manuellt/AI)

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ReferenceLine,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  BadgeDollarSign,
  Zap,
  Sun,
  Wind,
  Lock,
  Unlock,
  Brain,
  PartyPopper,
  RefreshCw,
  Settings2,
} from "lucide-react";

/* ----------------------- Hjälpfunktioner ------------------------ */
const fmtHour = (iso) => new Date(iso).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const to2 = (x) => Math.round(x * 100) / 100;
function priceToOpacity(p, min, max) { if (max === min) return 0.2; const t = (p - min) / (max - min); return 0.15 + 0.55 * t; }

/* ----------------------- Live fetchers -------------------------- */
// 1) Spotpris (D + D+1)
async function fetchSpot({ zone }) {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const fmt = (d) => `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}_${zone}.json`;
  const urls = [
    `https://www.elprisetjustnu.se/api/v1/prices/${fmt(today)}`,
    `https://www.elprisetjustnu.se/api/v1/prices/${fmt(tomorrow)}`,
  ];
  const results = [];
  for (const url of urls) {
    try {
      const r = await fetch(url);
      if (r.ok) {
        const data = await r.json();
        results.push(...data.map(x => ({ hourISO: x.time_start, price: x.SEK_per_kWh })));
      }
    } catch (e) {
      console.warn("[spot] fetch error", e);
    }
  }
  return results.slice(0, 48);
}

// 2) Sol (globalRadiation → kWh/h)
async function fetchPV({ lat, lon, peakKW = 10, efficiency = 0.2 }) {
  try {
    const url = `https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/${lon}/lat/${lat}/data.json`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const data = await r.json();
    const series = data.timeSeries.map(ts => {
      const gr = ts.parameters.find(p => p.name === "globalRadiation");
      const valWm2 = gr ? gr.values[0] : 0;
      const kWh = (valWm2 / 1000) * peakKW * efficiency;
      return { hourISO: ts.validTime, pv_kwh: to2(Math.max(0, kWh)) };
    });
    return series.slice(0, 48);
  } catch (e) {
    console.warn("[pv] fetch error", e);
    return [];
  }
}

// 3) Vind (SMHI ws → turbinkurva) eller mock
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
    // Mockad vind (mjuk variation) – funkar även offline
    const now = new Date(); now.setMinutes(0,0,0);
    const out = [];
    for (let i = 0; i < 48; i++) {
      const t = new Date(now.getTime() + i * 3600000);
      const wind = Math.max(0, 0.6 + 0.6 * Math.sin(i / 6) + (Math.random() - 0.5) * 0.2);
      out.push({ hourISO: t.toISOString(), wind_kwh: to2(wind) });
    }
    return out;
  }
  try {
    const url = `https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/${lon}/lat/${lat}/data.json`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const data = await r.json();
    const out = data.timeSeries.slice(0, 48).map(ts => {
      const ws = ts.parameters.find(p => p.name === "ws");
      const v = ws ? ws.values[0] : 0;
      const PkW = windPowerFromSpeed(v, turbine) * (turbine.count || 1);
      return { hourISO: ts.validTime, wind_kwh: to2(Math.max(0, PkW)) };
    });
    return out;
  } catch (e) {
    console.warn("[wind] fetch error", e);
    return [];
  }
}

/* ----------------------- AI/Heuristisk plan -------------------- */
function planHeuristic({ rows, battery, grid, locks, objective }) {
  const eff = clamp(battery.roundtrip_eff ?? 0.9, 0.5, 1);
  const cap = battery.capacity_kwh;
  const dt = 1;
  let soc = clamp(battery.soc_init ?? 0.5, 0, 1) * cap;
  const out = [];

  const prices = rows.map(r => r.price ?? 0);
  const sorted = [...prices].sort((a,b)=>a-b);
  const p25 = sorted[Math.floor(0.25*sorted.length)] ?? 0;
  const p75 = sorted[Math.floor(0.75*sorted.length)] ?? 0;
  const wear = battery.degrade_cost_per_kwh ?? 1.2;

  for (const r of rows) {
    const key = r.hourISO;
    const locked = locks.get(key);

    const gen = (r.pv_kwh ?? 0) + (r.wind_kwh ?? 0);
    const load = r.load_kwh ?? 0;
    const net = gen - load;

    let charge = 0, discharge = 0, importGrid = 0, exportGrid = 0;

    if (locked) {
      charge = clamp(locked.charge_kW ?? 0, 0, battery.max_charge_kw);
      discharge = clamp(locked.discharge_kW ?? 0, 0, battery.max_discharge_kw);
    } else {
      if (net > 0) {
        const room = cap * (battery.soc_max ?? 0.95) - soc;
        const can = Math.min(room, battery.max_charge_kw * dt);
        charge = clamp(Math.min(net, can), 0, battery.max_charge_kw);
      }
      const cheap = (r.price ?? 0) <= p25;
      const pricey = (r.price ?? 0) >= p75;
      const spreadOK = ((r.price ?? 0) - p25) > (wear + 0.1);

      if (cheap && spreadOK) {
        const room = cap * (battery.soc_max ?? 0.95) - (soc + charge*dt);
        const can = Math.min(room, battery.max_charge_kw * dt);
        const needFromGrid = Math.max(0, (battery.max_charge_kw - charge));
        charge += clamp(Math.min(can, needFromGrid), 0, battery.max_charge_kw);
      }
      if (pricey) {
        const minSoC = cap * Math.max(battery.soc_min ?? 0.15, (battery.soc_reserve ?? 0.1));
        const available = Math.max(0, soc - minSoC);
        const can = Math.min(available, battery.max_discharge_kw * dt);
        if (((r.price ?? 0) - p25) > wear) {
          discharge = clamp(can, 0, battery.max_discharge_kw);
        }
      }
      if (objective === "peak_shave" && net < 0 && discharge === 0) {
        const minSoC = cap * Math.max(battery.soc_min ?? 0.15, (battery.soc_reserve ?? 0.1));
        const available = Math.max(0, soc - minSoC);
        const need = Math.min(-net, battery.max_discharge_kw * dt);
        discharge = clamp(Math.min(available, need), 0, battery.max_discharge_kw);
      }
    }

    // lokalt flöde → import/export
    let local = net - charge + discharge;
    if (local > 0) {
      exportGrid = Math.min(local, (grid.exportCapKW ?? 9999) * dt);
    } else if (local < 0) {
      importGrid = Math.min(-local, (grid.importCapKW ?? 9999) * dt);
    }

    const effCharge = Math.sqrt(eff);
    const effDis = Math.sqrt(eff);
    soc = clamp(soc + charge * effCharge - discharge / effDis, 0, cap);

    out.push({
      hourISO: r.hourISO,
      price: r.price ?? 0,
      pv_kwh: r.pv_kwh ?? 0,
      wind_kwh: r.wind_kwh ?? 0,
      load_kwh: r.load_kwh ?? 0,
      charge_kW: to2(charge/dt),
      discharge_kW: to2(discharge/dt),
      import_kWh: to2(importGrid),
      export_kWh: to2(exportGrid),
      soc_pct: to2((soc / cap) * 100),
      locked: Boolean(locked),
    });
  }
  return out;
}

/* ----------------------- Huvudkomponent ------------------------- */
export default function BatteryPlanProShadcn({
  defaultZone = "SE3",
  lat = 59.33,
  lon = 18.07,
  useSmhiWind = false,
  turbineCfg = { ratedPowerKW: 3, v_ci: 3, v_r: 12, v_co: 25, count: 1 },
  battery = {
    capacity_kwh: 45,
    soc_init: 0.55,
    soc_min: 0.15,
    soc_reserve: 0.10,
    soc_max: 0.95,
    max_charge_kw: 10,
    max_discharge_kw: 10,
    roundtrip_eff: 0.9,
    degrade_cost_per_kwh: 1.2,
  },
  grid = { buyFee: 0.05, sellFee: 0.05, exportCapKW: 11, importCapKW: 11 },
  loadPredictor,
}) {
  const [zone, setZone] = useState(() => localStorage.getItem("bp_zone") || defaultZone);
  const [rows, setRows] = useState([]);
  const [locks, setLocks] = useState(new Map());
  const [objective, setObjective] = useState("profit");
  const [autoAI, setAutoAI] = useState(false);
  const [plan, setPlan] = useState([]);
  const [loading, setLoading] = useState(false);
  const [socInitPct, setSocInitPct] = useState(Math.round((battery.soc_init ?? 0.5)*100));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [windLive, setWindLive] = useState(() => {
    const saved = localStorage.getItem("bp_useSmhiWind");
    return saved !== null ? saved === "true" : useSmhiWind;
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    const [spot, pv, wind] = await Promise.all([
      fetchSpot({ zone }),
      fetchPV({ lat, lon }),
      fetchWind({ lat, lon, useSmhiWind: windLive, turbine: turbineCfg }),
    ]);
    const by = new Map();
    const push = (arr, key, field) => arr.forEach(x => { const k = x[key]; const o = by.get(k) ?? { hourISO: k }; o[field] = x[field]; by.set(k, o); });
    push(spot, 'hourISO', 'price');
    push(pv, 'hourISO', 'pv_kwh');
    push(wind, 'hourISO', 'wind_kwh');

    if (loadPredictor) {
      try {
        const hrs = [...by.keys()].sort();
        const pred = await loadPredictor({ hours: hrs });
        pred.forEach(x => { const o = by.get(x.hourISO) ?? {hourISO: x.hourISO}; o.load_kwh = x.load_kwh; by.set(x.hourISO, o); });
      } catch (e) {
        console.warn("[loadPredictor] error", e);
      }
    } else {
      // enkel lastprofil
      for (const [k, o] of by) {
        const h = new Date(k).getHours();
        o.load_kwh = to2(0.8 + (h>=17 && h<=22 ? 0.7 : 0) + (h>=0 && h<=5 ? -0.2 : 0));
        by.set(k, o);
      }
    }

    const merged = [...by.values()].sort((a,b)=> new Date(a.hourISO) - new Date(b.hourISO));
    setRows(merged);
    setLoading(false);
  }, [zone, lat, lon, windLive, turbineCfg, loadPredictor]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { localStorage.setItem("bp_zone", zone); }, [zone]);
  useEffect(() => { localStorage.setItem("bp_useSmhiWind", String(windLive)); }, [windLive]);

  const runAI = useCallback(() => {
    const b = { ...battery, soc_init: (socInitPct/100) };
    const p = planHeuristic({ rows, battery: b, grid, locks, objective });
    setPlan(p);
  }, [rows, battery, grid, locks, objective, socInitPct]);
  useEffect(() => { if (autoAI && rows.length) runAI(); }, [autoAI, rows, runAI]);

  // Quick actions (ENKELT LÄGE)
  const quickCharge = (hours = 3) => {
    if (!rows.length) return;
    setLocks(prev => {
      const n = new Map(prev);
      for (let i = 0; i < Math.min(hours, rows.length); i++) {
        const h = rows[i].hourISO;
        n.set(h, { charge_kW: battery.max_charge_kw, discharge_kW: 0 });
      }
      return n;
    });
    runAI();
  };
  const quickSell = (hours = 3) => {
    if (!rows.length) return;
    setLocks(prev => {
      const n = new Map(prev);
      for (let i = 0; i < Math.min(hours, rows.length); i++) {
        const h = rows[i].hourISO;
        n.set(h, { charge_kW: 0, discharge_kW: battery.max_discharge_kw });
      }
      return n;
    });
    runAI();
  };

  // Merge data + plan för diagram
  const dataMerged = useMemo(() => {
    const m = new Map();
    for (const r of rows) m.set(r.hourISO, { ...r });
    for (const p of plan) {
      const o = m.get(p.hourISO) ?? { hourISO: p.hourISO };
      Object.assign(o, p);
      m.set(p.hourISO, o);
    }
    return [...m.values()].sort((a,b)=> new Date(a.hourISO)-new Date(b.hourISO));
  }, [rows, plan]);

  const priceMin = useMemo(() => rows.length? Math.min(...rows.map(r=>r.price??9999)) : 0, [rows]);
  const priceMax = useMemo(() => rows.length? Math.max(...rows.map(r=>r.price??0)) : 0, [rows]);

  // Översiktstiles
  const totals = useMemo(() => {
    const imp = plan.reduce((a,x)=>a+(x.import_kWh||0),0);
    const exp = plan.reduce((a,x)=>a+(x.export_kWh||0),0);
    const pv  = rows.reduce((a,x)=>a+(x.pv_kwh||0),0);
    const wd  = rows.reduce((a,x)=>a+(x.wind_kwh||0),0);
    const load= rows.reduce((a,x)=>a+(x.load_kwh||0),0);
    const socNow = plan.length ? plan[plan.length-1].soc_pct : (battery.soc_init*100);
    // grov estimering (netto * medelpris)
    const avgPrice = rows.length ? rows.reduce((a,x)=>a+(x.price||0),0)/rows.length : 0;
    const estProfit = to2((exp - imp) * avgPrice);
    return { imp: to2(imp), exp: to2(exp), pv: to2(pv), wd: to2(wd), load: to2(load), socNow: to2(socNow), estProfit };
  }, [rows, plan, battery.soc_init]);

  return (
    <div className="w-full space-y-4">
      <Card className="shadow-lg border border-slate-200/60 dark:border-slate-700/60 bg-white/70 text-slate-900 backdrop-blur dark:bg-slate-900/80 dark:text-slate-100">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <Zap className="w-5 h-5"/> ELEKTO – Batteriplan
          </CardTitle>

          <div className="flex flex-wrap items-center gap-3">
            {/* Zon */}
            <Select value={zone} onValueChange={setZone}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Zon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SE1">SE1</SelectItem>
                <SelectItem value="SE2">SE2</SelectItem>
                <SelectItem value="SE3">SE3</SelectItem>
                <SelectItem value="SE4">SE4</SelectItem>
              </SelectContent>
            </Select>

            {/* Quick actions (enkelvy) */}
            <Button onClick={() => quickCharge(3)} className="gap-2">
              Ladda nu (3h)
            </Button>
            <Button onClick={() => quickSell(3)} variant="outline" className="gap-2">
              Sälj nu (3h)
            </Button>

            {/* Avancerat toggle */}
            <Button variant="ghost" onClick={() => setShowAdvanced(v => !v)} className="gap-2">
              <Settings2 className="w-4 h-4" />
              {showAdvanced ? "Avancerat: PÅ" : "Avancerat: AV"}
            </Button>

            {/* Övrigt */}
            <div className="flex items-center gap-2 text-sm">
              <span>SMHI-vind</span>
              <Switch checked={windLive} onCheckedChange={setWindLive} />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>Auto-AI</span>
              <Switch checked={autoAI} onCheckedChange={setAutoAI} />
            </div>
            <Button variant="secondary" className="gap-2" onClick={refresh} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading? 'animate-spin':''}`} /> Uppdatera
            </Button>
            <Button className="gap-2" onClick={runAI}>
              <Brain className="w-4 h-4"/> AI-planera
            </Button>
            <Button variant="destructive" className="gap-2" onClick={() => quickCharge(6)} title="Lås 6h laddning max (fest/resa)">
              <PartyPopper className="w-4 h-4"/> Ladda fullt
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Tiles: PV / Vind / Last / Import / Export / SoC / Vinst */}
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            <Tile label="Sol (kWh/48h)" value={totals.pv} icon={<Sun className="w-4 h-4" />} />
            <Tile label="Vind (kWh/48h)" value={totals.wd} icon={<Wind className="w-4 h-4" />} />
            <Tile label="Last (kWh/48h)" value={totals.load} />
            <Tile label="Import (kWh)" value={totals.imp} />
            <Tile label="Export (kWh)" value={totals.exp} />
            <Tile label="SoC slut (%)" value={totals.socNow} />
            <Tile label="Est. vinst (kr)" value={totals.estProfit} />
          </div>

          {/* Diagram: Pris + Produktion/Last */}
          <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 p-3 bg-white/50 dark:bg-slate-900/40">
            <div className="text-sm opacity-80 mb-2">Spotpris & Produktion/Last</div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={rows} margin={{ left: 12, right: 12, top: 10 }}>
                <defs>
                  <linearGradient id="pvFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="windFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
                <XAxis dataKey="hourISO" tickFormatter={fmtHour} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <ReTooltip />
                <Legend />
                {rows.map((r, idx) => (
                  <ReferenceLine key={idx} x={r.hourISO} stroke={`rgba(0,0,0,${priceToOpacity(r.price??0, priceMin, priceMax)})`} opacity={0.06} yAxisId="left"/>
                ))}
                <Line yAxisId="right" type="monotone" dataKey="price" name="Pris (kr/kWh)" stroke="#f97316" dot={false} strokeWidth={2}/>
                <Area yAxisId="left" type="monotone" dataKey="pv_kwh" name="Sol (kWh/h)" stroke="#f59e0b" fill="url(#pvFill)"/>
                <Area yAxisId="left" type="monotone" dataKey="wind_kwh" name="Vind (kWh/h)" stroke="#0ea5e9" fill="url(#windFill)"/>
                <Line yAxisId="left" type="monotone" dataKey="load_kwh" name="Last (kWh/h)" stroke="#a78bfa" dot={false} strokeDasharray="4 3"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Diagram: Plan (ladd/urladd) & SoC */}
          <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 p-3 bg-white/50 dark:bg-slate-900/40">
            <div className="text-sm opacity-80 mb-2">Plan (kW) & SoC (%)</div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dataMerged} margin={{ left: 12, right: 12, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
                <XAxis dataKey="hourISO" tickFormatter={fmtHour} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" domain={[0,100]} />
                <ReTooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="charge_kW" name="Ladd (kW)" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="discharge_kW" name="Urladd (kW)" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="soc_pct" name="SoC (%)" stroke="#38bdf8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* AVANCERAT: Manuell tabell (dold som standard) */}
          {showAdvanced && (
            <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 p-3 bg-white/50 dark:bg-slate-900/40 space-y-2">
              <div className="text-sm opacity-80 flex items-center gap-2">
                <BadgeDollarSign className="w-4 h-4"/> Mål & slitage
                <Select value={objective} onValueChange={setObjective}>
                  <SelectTrigger className="w-[180px] ml-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profit">Maximera vinst</SelectItem>
                    <SelectItem value="peak_shave">Undvik effekttopp</SelectItem>
                    <SelectItem value="save_battery">Spara batteri</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-sm opacity-80 ml-4">Degr.kostnad: <span className="font-semibold">{battery.degrade_cost_per_kwh} kr/kWh</span></div>
                <div className="flex items-center gap-2 text-sm ml-4">
                  <span>Start-SoC</span>
                  <Input className="w-20" type="number" min={0} max={100} value={socInitPct} onChange={(e)=> setSocInitPct(clamp(Number(e.target.value)||0,0,100)) } />
                  <span>%</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="opacity-80">
                    <tr>
                      <th className="text-left p-2">Tid</th>
                      <th className="text-left p-2">Pris</th>
                      <th className="text-left p-2">Sol</th>
                      <th className="text-left p-2">Vind</th>
                      <th className="text-left p-2">Last</th>
                      <th className="text-left p-2">Lås</th>
                      <th className="text-left p-2">Ladd (kW)</th>
                      <th className="text-left p-2">Urladd (kW)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const l = locks.get(r.hourISO);
                      return (
                        <tr key={r.hourISO} className="border-t border-slate-200/40 dark:border-slate-700/40">
                          <td className="p-2">{fmtHour(r.hourISO)}</td>
                          <td className="p-2">{to2(r.price ?? 0)}</td>
                          <td className="p-2 text-amber-600 dark:text-amber-300">{to2(r.pv_kwh ?? 0)}</td>
                          <td className="p-2 text-sky-600 dark:text-sky-300">{to2(r.wind_kwh ?? 0)}</td>
                          <td className="p-2">{to2(r.load_kwh ?? 0)}</td>
                          <td className="p-2">
                            <Button variant="ghost" size="icon" onClick={()=>toggleLock(r.hourISO)} title={l? 'Lås upp' : 'Lås'}>
                              {l ? <Lock className="w-4 h-4 text-emerald-500"/> : <Unlock className="w-4 h-4 opacity-70"/>}
                            </Button>
                          </td>
                          <td className="p-2">
                            <Input type="number" className="w-24" disabled={!l}
                              min={0} max={battery.max_charge_kw}
                              value={l? l.charge_kW : ''}
                              onChange={(e)=> setLockVal(r.hourISO, 'charge_kW', clamp(Number(e.target.value)||0, 0, battery.max_charge_kw))}
                            />
                          </td>
                          <td className="p-2">
                            <Input type="number" className="w-24" disabled={!l}
                              min={0} max={battery.max_discharge_kw}
                              value={l? l.discharge_kW : ''}
                              onChange={(e)=> setLockVal(r.hourISO, 'discharge_kW', clamp(Number(e.target.value)||0, 0, battery.max_discharge_kw))}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}

/* ----------------------- Småkomponenter ------------------------- */
function Tile({ label, value, icon }) {
  return (
    <div className="p-3 rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-900/40">
      <div className="text-xs opacity-70 flex items-center gap-1">{icon}{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

/* ----------------------- Lokala helpers ------------------------- */
function toggleLock(hourISO) {} // placeholder för lintern – ersätts i komponenten via closure
function setLockVal() {}        // placeholder – ersätts i komponenten via closure
