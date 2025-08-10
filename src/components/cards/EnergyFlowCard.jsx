import React, { useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/utils/apiBase";

/**
 * EnergyFlowCard – skalar staplar proportionerligt mot maxvärdet.
 */
export default function EnergyFlowCard() {
  const [data, setData] = useState(null);
  const [sankey, setSankey] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE}/energy/flow`).then(async r => {
      const js = await r.json();
      if (mounted) setData(js);
    }).catch(() => {
      if (!mounted) return;
      setData({
        solar_to_house: 3.2,
        solar_to_batt: 1.0,
        solar_to_grid: 0.5,
        grid_to_house: 0.6,
      });
    });
    return () => { mounted = false; };
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Sol → Hus",     value: +data.solar_to_house || 0, color: "var(--accent-green)" },
      { label: "Sol → Batteri", value: +data.solar_to_batt  || 0, color: "var(--accent-blue)"  },
      { label: "Sol → Nät",     value: +data.solar_to_grid  || 0, color: "var(--accent-yellow)" },
      { label: "Nät → Hus",     value: +data.grid_to_house  || 0, color: "var(--accent-red)"   },
    ];
  }, [data]);

  const maxKW = useMemo(() => {
    const m = Math.max(0, ...rows.map(r => r.value));
    return m > 0 ? m : 1;
  }, [rows]);

  if (!data) return <div>Laddar…</div>;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 6 }}>
        <div className="section-title" style={{ margin: 0 }}>Energiflöde</div>
        <button className="theme-toggle" onClick={()=>setSankey(s=>!s)}>{sankey ? "Enkel vy" : "Sankey-vy"}</button>
      </div>

      {!sankey ? (
        <div style={{ display:"grid", gap: 12, marginTop: 6 }}>
          {rows.map((r, i) => (
            <BarRow key={i} label={r.label} value={r.value} max={maxKW} color={r.color} />
          ))}
        </div>
      ) : (
        <SankeyBars rows={rows} max={maxKW} />
      )}
    </div>
  );
}

function BarRow({ label, value, max, color }) {
  const pct = Math.max(0, Math.min(1, value / max));
  const w = `${Math.max(6, pct*100)}%`; // minst lite synlig
  return (
    <div style={{ display:"grid", gridTemplateColumns:"160px 1fr 60px", alignItems:"center", gap: 12 }}>
      <div style={{ opacity:0.9 }}>{label}</div>
      <div style={{ height: 12, borderRadius: 999, background: "rgba(0,0,0,.15)", overflow:"hidden" }}>
        <div style={{ width: w, height: "100%", background: color, borderRadius: 999 }} />
      </div>
      <div style={{ textAlign:"right", fontWeight:700 }}>{value.toFixed(1)} kW</div>
    </div>
  );
}

function SankeyBars({ rows, max }) {
  return (
    <div style={{ display:"grid", gap: 16 }}>
      {rows.map((r, i) => {
        const pct = Math.max(0, Math.min(1, r.value / max));
        const w = `${Math.max(6, pct*100)}%`;
        return (
          <div key={i} style={{ display:"grid", gridTemplateColumns:"160px 1fr 60px", alignItems:"center", gap: 12 }}>
            <div style={{ opacity:0.9 }}>{r.label}</div>
            <div style={{ height: 14, borderRadius: 999, background: "rgba(0,0,0,.15)", overflow:"hidden" }}>
              <div style={{ width: w, height: "100%", background: r.color, borderRadius: 999 }} />
            </div>
            <div style={{ textAlign:"right", fontWeight:800 }}>{r.value.toFixed(1)} kW</div>
          </div>
        );
      })}
    </div>
  );
}
