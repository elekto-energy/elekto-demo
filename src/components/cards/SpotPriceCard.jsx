// src/components/cards/SpotPriceCard.jsx
import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

export default function SpotPriceCard({ zone = "SE3" }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/spotprice/day?zone=${zone}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        // Gör om tid + pris till format som Recharts kan läsa
        const chartData = json.data.map((row) => ({
          time: new Date(row.hourISO).toLocaleTimeString("sv-SE", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          price: Number(row.price.toFixed(3)),
        }));

        setData(chartData);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [zone]);

  if (loading) return <div className="card">Laddar spotpris...</div>;
  if (error) return <div className="card error">Fel: {error}</div>;

  return (
    <div className="card">
      <h3>Spotpris ({zone})</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
          <XAxis dataKey="time" />
          <YAxis domain={["auto", "auto"]} unit=" kr/kWh" />
          <Tooltip formatter={(value) => `${value} kr/kWh`} />
          <Line type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
