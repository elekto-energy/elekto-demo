import React, { useEffect, useState } from "react";
import { getWindNow } from "@/utils/smhi";

export default function WindGauge({ lat = 59.33, lon = 18.07 }) {
  const [speed, setSpeed] = useState(0);
  const [direction, setDirection] = useState(0);
  const [gust, setGust] = useState(null);

  useEffect(() => {
    let mounted = true;
    getWindNow(lat, lon).then(({ speed, direction, gust }) => {
      if (!mounted) return;
      setSpeed(speed);
      setDirection(direction);
      setGust(gust);
    }).catch(() => {});
    const id = setInterval(() => {
      getWindNow(lat, lon).then(v => {
        setSpeed(v.speed); setDirection(v.direction); setGust(v.gust);
      }).catch(()=>{});
    }, 5 * 60 * 1000);
    return () => { mounted = false; clearInterval(id); };
  }, [lat, lon]);

  const max = 25;
  const pct = Math.max(0, Math.min(1, speed / max));
  const angle = -90 + 180 * pct;
  const R = 50, C = Math.PI * R, half = C, active = half * pct;

  return (
    <div style={{ display:"grid", gridTemplateColumns:"140px 1fr", gap:12, alignItems:"center" }}>
      <svg width="140" height="120" viewBox="0 0 140 120" aria-label="Vindmätare">
        <defs>
          <linearGradient id="wg2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent-blue)" />
            <stop offset="100%" stopColor="var(--accent-green)" />
          </linearGradient>
        </defs>
        <g transform="translate(70,70)">
          <circle cx="0" cy="0" r={R} fill="none" stroke="rgba(0,0,0,.1)" strokeWidth="12"
                  strokeDasharray={`${half} ${half}`} strokeDashoffset={half/2} />
          <circle cx="0" cy="0" r={R} fill="none" stroke="url(#wg2)" strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={`${active} ${half - active}`} strokeDashoffset={half/2} />
        </g>
        <g transform={`rotate(${angle} 70 70)`}>
          <line x1="70" y1="70" x2="70" y2="26" stroke="var(--text-color)" strokeWidth="2" />
          <circle cx="70" cy="70" r="3" fill="var(--text-color)" />
        </g>
        <g transform={`rotate(${direction} 70 70)`}>
          <polygon points="70,18 66,26 74,26" fill="var(--accent-yellow)" />
        </g>
        <text x="70" y="12" textAnchor="middle" fontSize="10" fill="var(--text-color)">N</text>
        <text x="126" y="72" textAnchor="middle" fontSize="10" fill="var(--text-color)">E</text>
        <text x="14" y="72" textAnchor="middle" fontSize="10" fill="var(--text-color)">W</text>
      </svg>
      <div>
        <div style={{ fontSize:28, fontWeight:700 }}>{speed.toFixed(1)} <span style={{ fontSize:14, opacity:.8 }}>m/s</span></div>
        <div style={{ fontSize:12, opacity:.8, marginTop:2 }}>Riktning: {Math.round(direction)}°</div>
        {gust != null && <div style={{ fontSize:12, opacity:.8 }}>Byar: {gust.toFixed(1)} m/s</div>}
        <div style={{ fontSize:12, opacity:.8, marginTop:6 }}>Källa: SMHI</div>
      </div>
    </div>
  );
}
