import React, { useEffect, useState } from "react";
import { API_BASE } from "@/utils/apiBase";

export default function BatteryStatusCard() {
  const [soc, setSoc] = useState(62);
  const [status, setStatus] = useState("idle"); // charging|discharging|idle

  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE}/battery/status`).then(async r => {
      const js = await r.json();
      if (!mounted) return;
      if (typeof js?.soc === "number") setSoc(js.soc);
      if (js?.status) setStatus(js.status);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const color =
    status === "charging" ? "var(--accent-green)" :
    status === "discharging" ? "var(--accent-red)" :
    "var(--accent-blue)";

  const label =
    status === "charging" ? "laddar" :
    status === "discharging" ? "urladdar" :
    "vilar";

  return (
    <div style={{ display:"grid", gap: 10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>Laddningsnivå</div>
        <div style={{ fontWeight: 700 }}>{soc}%</div>
      </div>
      <div style={{
        width:"100%",
        height: 14,
        background:"rgba(0,0,0,0.08)",
        borderRadius: 999,
        position:"relative",
        overflow:"hidden",
        border: "1px solid var(--card-border)",
      }}>
        <div style={{
          width:`${soc}%`,
          height:"100%",
          background: color,
          transition:"width .4s ease"
        }} />
      </div>
      <div style={{ fontSize:12, opacity:0.8, display:"flex", gap:8 }}>
        <span>Status:</span>
        <b style={{ color }}>{label}</b>
      </div>
    </div>
  );
}
