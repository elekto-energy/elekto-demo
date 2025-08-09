// src/components/cards/ExportedElectricityCard.jsx
import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowUpRight } from "lucide-react"; // Mer “export”-känsla än UploadCloud

export default function ExportedElectricityCard() {
  const [exportedData, setExportedData] = useState([]);

  useEffect(() => {
    // Simulerad exportsdata, byt mot fetch mot ditt API när det finns riktig data
    const fakeExported = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      exported: +(Math.random() * 2.7).toFixed(2), // Exempel: 0–2,7 kWh/timme
    }));
    setExportedData(fakeExported);
  }, []);

  const totalExported = exportedData.reduce((sum, d) => sum + d.exported, 0).toFixed(2);

  return (
    <div className="text-white bg-gradient-to-br from-cyan-800 via-cyan-900 to-cyan-950 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center mb-4">
        <ArrowUpRight className="text-cyan-300 w-8 h-8 mr-2" />
        <h2 className="text-xl font-semibold tracking-wide">Exporterad el till nätet</h2>
      </div>
      <p className="text-sm text-cyan-200 mb-2">Visar simulerad export av el per timme (kWh)</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={exportedData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <XAxis dataKey="hour" tick={{ fill: '#a5f3fc', fontSize: 10 }} />
            <YAxis tick={{ fill: '#a5f3fc', fontSize: 10 }} domain={[0, 3]} />
            <Tooltip wrapperStyle={{ backgroundColor: '#155e75', borderColor: '#06b6d4' }} contentStyle={{ color: '#fff' }} />
            <Line type="monotone" dataKey="exported" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-lg font-bold text-cyan-300 text-center">
        Totalt exporterad el idag: {totalExported} kWh
      </div>
    </div>
  );
}
