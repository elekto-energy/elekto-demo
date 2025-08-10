import React, { useEffect, useState } from "react";
import { API_BASE } from "@/utils/apiBase";
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";

export default function SpotPriceCard() {
  const [data, setData] = useState([]);

  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE}/prices/day`).then(async r => {
      const js = await r.json();
      if (mounted && Array.isArray(js)) setData(js);
    }).catch(() => {
      const mock = Array.from({ length: 24 }).map((_, i) => ({
        time: `${String(i).padStart(2,"0")}:00`,
        price: 80 + Math.round(40*Math.sin((Math.PI*i)/12) + Math.random()*10)
      }));
      setData(mock);
    });
    return () => { mounted = false; };
  }, []);

  const now = data[12]?.price ?? 0;
  const min = data.length ? Math.min(...data.map(d=>d.price||0)) : 0;
  const max = data.length ? Math.max(...data.map(d=>d.price||0)) : 0;

  return (
    <div>
      <div className="stat-row">
        <div className="stat">Nu: <b>{now} öre/kWh</b></div>
        <div className="stat">Lägsta/Högsta: <b>{min} / {max} öre/kWh</b></div>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis dataKey="time" stroke="var(--text-color)" />
            <YAxis stroke="var(--text-color)" />
            <Tooltip contentStyle={{ background:"var(--card-bg)", border:`1px solid var(--card-border)`, color:"var(--text-color)" }} />
            <Line type="monotone" dataKey="price" stroke="var(--accent-blue)" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
