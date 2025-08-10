import React, { useEffect, useState } from "react";
import { API_BASE } from "@/utils/apiBase";
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Area
} from "recharts";

export default function ConsumptionCard() {
  const [data, setData] = useState([]);

  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE}/consumption/day`).then(async r => {
      const js = await r.json();
      if (mounted && Array.isArray(js)) setData(js);
    }).catch(() => {
      const mock = Array.from({ length: 24 }).map((_, i) => ({
        time: `${String(i).padStart(2,"0")}:00`,
        kW: Math.round(2 + 1.5*Math.sin((Math.PI * i)/12) + (Math.random()*0.8))
      }));
      setData(mock);
    });
    return () => { mounted = false; };
  }, []);

  const dailyTotal = Math.round(data.reduce((a,b)=>a+(b.kW||0),0));
  const nowKW = data[12]?.kW ?? 0;

  return (
    <div>
      <div className="stat-row">
        <div className="stat">Nu: <b>{nowKW} kW</b></div>
        <div className="stat">Dagens total: <b>{dailyTotal} kWh</b></div>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer>
          <LineChart data={data}>
            <defs>
              <linearGradient id="gradCons" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-red)" stopOpacity={0.8} />
                <stop offset="100%" stopColor="var(--accent-yellow)" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis dataKey="time" stroke="var(--text-color)" />
            <YAxis stroke="var(--text-color)" />
            <Tooltip contentStyle={{ background:"var(--card-bg)", border:`1px solid var(--card-border)`, color:"var(--text-color)" }} />
            <Area type="monotone" dataKey="kW" stroke="var(--accent-red)" fill="url(#gradCons)" />
            <Line type="monotone" dataKey="kW" stroke="var(--accent-red)" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-legend">
        <span className="badge"><span className="badge-dot dot-red"></span> Förbrukning (kW)</span>
      </div>
    </div>
  );
}
