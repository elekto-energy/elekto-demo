// src/components/cards/SoldElectricityCard.jsx
import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { UploadCloud } from "lucide-react";

export default function SoldElectricityCard() {
  const [soldData, setSoldData] = useState([]);

  useEffect(() => {
    const fakeSold = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      sold: +(Math.random() * 3).toFixed(2),
    }));
    setSoldData(fakeSold);
  }, []);

  const totalSold = soldData.reduce((sum, d) => sum + d.sold, 0).toFixed(2);

  return (
    <div className="text-white bg-gradient-to-br from-blue-900 via-sky-800 to-indigo-900 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center mb-4">
        <UploadCloud className="text-sky-400 w-8 h-8 mr-2" />
        <h2 className="text-xl font-semibold tracking-wide">Såld el till nätet</h2>
      </div>
      <p className="text-sm text-blue-200 mb-2">Visar simulerad såld el till nätet (kWh per timme)</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={soldData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <XAxis dataKey="hour" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
            <YAxis tick={{ fill: '#cbd5e1', fontSize: 10 }} domain={[0, 4]} />
            <Tooltip wrapperStyle={{ backgroundColor: '#1e293b', borderColor: '#38bdf8' }} contentStyle={{ color: '#fff' }} />
            <Line type="monotone" dataKey="sold" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-lg font-bold text-sky-300 text-center">
        Totalt såld el idag: {totalSold} kWh
      </div>
    </div>
  );
}
