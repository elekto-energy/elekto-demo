import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function SolarProductionCard() {
  const [data, setData] = useState([]);

  useEffect(() => {
    // Simulera produktionsdata timme för timme
    const now = new Date();
    const hours = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), i);
      return {
        time: `${hour.getHours()}:00`,
        production: Math.max(0, Math.sin((i - 6) / 12 * Math.PI) * 4 + Math.random() * 0.5)
      };
    });
    setData(hours);
  }, []);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Simulerad solproduktion (kWh)</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis domain={[0, "auto"]} unit=" kWh" />
          <Tooltip formatter={(value) => `${value.toFixed(2)} kWh`} />
          <Line type="monotone" dataKey="production" stroke="#22c55e" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-3 text-gray-600 text-sm">
        Denna simulering visar uppskattad solelproduktion under dygnet baserat på normal solinstrålning.
      </p>
    </div>
  );
}
