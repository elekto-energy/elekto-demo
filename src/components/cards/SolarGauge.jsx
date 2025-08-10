import React, { useEffect, useState } from "react";
import { estimateIrradiance } from "@/utils/smhi";

export default function SolarGauge({ lat = 59.33, lon = 18.07, arrayKWp = 10, eff = 0.85, maxIrr = 1000 }) {
  const [irr, setIrr] = useState(0);
  const [pvKW, setPvKW] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = () => estimateIrradiance(lat, lon).then(({ irr }) => {
      if (!mounted) return;
      setIrr(irr);
      setPvKW(arrayKWp * (irr/1000) * eff);
    }).catch(()=>{});
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => { mounted = false; clearInterval(id); };
  }, [lat, lon, arrayKWp, eff]);

  const pct = Math.max(0, Math.min(1, irr / maxIrr));
  const angle = -90 + 180 * pct;
  const R = 50, C = Math.PI * R, half = C, active = half * pct;

  return (
    <div style={{ display:"grid", gridTemplateColumns:"140px 1fr", gap:12, alignItems:"center" }}>
      <svg width="140" height="120" viewBox="0 0 140 120" aria-label="Solinstrålning">
        <defs>
          <linearGradient id="sg2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent-yellow)" />
            <stop offset="100%" stopColor="var(--accent-red)" />
          </linearGradient>
        </defs>
        <g transform="translate(70,70)">
          <circle cx="0" cy="0" r={R} fill="none" stroke="rgba(0,0,0,.1)" strokeWidth="12"
                  strokeDasharray={`${half} ${half}`} strokeDashoffset={half/2} />
          <circle cx="0" cy="0" r={R} fill="none" stroke="url(#sg2)" strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={`${active} ${half - active}`} strokeDashoffset={half/2} />
        </g>
        <g transform={`rotate(${angle} 70 70)`}>
          <line x1="70" y1="70" x2="70" y2="26" stroke="var(--text-color)" strokeWidth="2" />
          <circle cx="70" cy="70" r="3" fill="var(--text-color)" />
        </g>
        <circle cx="70" cy="18" r="5" fill="var(--accent-yellow)" />
        <line x1="70" y1="6" x2="70" y2="2" stroke="var(--accent-yellow)" />
        <line x1="58" y1="12" x2="54" y2="8" stroke="var(--accent-yellow)" />
        <line x1="82" y1="12" x2="86" y2="8" stroke="var(--accent-yellow)" />
      </svg>
      <div>
        <div style={{ fontSize:28, fontWeight:700 }}>{Math.round(irr)} <span style={{ fontSize:14, opacity:.8 }}>W/m²</span></div>
        <div style={{ fontSize:12, opacity:.8, marginTop:2 }}>Beräknad PV-effekt: <b>{pvKW.toFixed(1)} kW</b></div>
        <div style={{ fontSize:12, opacity:.8, marginTop:6 }}>Källa: SMHI (moln + solhöjd)</div>
      </div>
    </div>
  );
}
