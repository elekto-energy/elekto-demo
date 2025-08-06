// src/components/DashboardGrid.jsx
import React, { useState, useEffect } from "react";
import { Sun, Bolt, PlugZap, UploadCloud } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import SolarProductionCard from "./cards/SolarProductionCard";
import ConsumptionCard from "./cards/ConsumptionCard";
import BatteryStatusCard from "./cards/BatteryStatusCard";
import ExportedElectricityCard from "./cards/ExportedElectricityCard";

export function DashboardGrid() {
  const [selected, setSelected] = useState(null);
  const [spotPrices, setSpotPrices] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [selectedZone, setSelectedZone] = useState("SE3");

  useEffect(() => {
    async function fetchPrices() {
      try {
        const response = await fetch("https://www.elprisetjustnu.se/api/v1/prices.json");
        const data = await response.json();
        const today = new Date().toISOString().slice(0, 10);
        const todayPrices = data.filter((p) => p.date.includes(today));
        setSpotPrices(todayPrices);
      } catch (error) {
        console.error("Kunde inte hämta elpriser:", error);
      }
    }
    fetchPrices();
  }, []);

  useEffect(() => {
    if (spotPrices) {
      const filtered = spotPrices.filter((p) => p.area === selectedZone);
      const chart = filtered.map((p) => ({
        hour: `${new Date(p.date).getHours()}:00`,
        price: p.value,
      }));
      setChartData(chart);
    }
  }, [spotPrices, selectedZone]);

  const items = [
    {
      title: "Producerad energi från solceller",
      icon: Sun,
      component: <SolarProductionCard />,
    },
    {
      title: "Total elförbrukning i fastigheten",
      icon: Bolt,
      component: <ConsumptionCard />,
    },
    {
      title: "Aktuell batterinivå och status",
      icon: PlugZap,
      component: <BatteryStatusCard />,
    },
    {
      title: "Såld el till nätet",
      icon: UploadCloud,
      component: <ExportedElectricityCard />,
    },
  ];

  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 text-white">
      <h1 className="text-4xl font-bold mb-8 text-center text-blue-300 drop-shadow-lg">ELEKTO Dashboard</h1>

      {spotPrices && (
        <div className="mb-10 p-6 bg-slate-800 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-blue-400">Spotpriser idag (öre/kWh)</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
            {["SE1", "SE2", "SE3", "SE4"].map((zone) => {
              const zonePrices = spotPrices.filter((p) => p.area === zone);
              const avg = (
                zonePrices.reduce((sum, p) => sum + p.value, 0) / zonePrices.length
              ).toFixed(2);
              return (
                <div key={zone} className="bg-slate-700 text-blue-200 p-3 rounded-lg shadow-md">
                  <strong>{zone}</strong>: {avg} öre
                </div>
              );
            })}
          </div>

          <div className="flex items-center mb-4">
            <label htmlFor="zone-select" className="mr-2 text-blue-200">
              Välj zon:
            </label>
            <select
              id="zone-select"
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="bg-slate-700 text-blue-100 px-3 py-1 rounded border border-blue-400"
            >
              {['SE1', 'SE2', 'SE3', 'SE4'].map(zone => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
          </div>

          <div className="bg-slate-700 p-4 rounded-xl">
            <h3 className="font-semibold mb-2 text-blue-300">Pris per timme ({selectedZone})</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="hour" stroke="#94a3b8" />
                <YAxis domain={["auto", "auto"]} unit=" öre" stroke="#94a3b8" />
                <Tooltip
                  wrapperStyle={{ backgroundColor: '#1e293b', borderColor: '#60a5fa' }}
                  contentStyle={{ color: '#fff' }}
                  formatter={(value) => `${value.toFixed(2)} öre`}
                />
                <Line type="monotone" dataKey="price" stroke="#60a5fa" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((item, index) => (
          <div
            key={index}
            onClick={() => setSelected(item)}
            className="rounded-2xl shadow-lg p-6 bg-slate-800 cursor-pointer hover:shadow-xl hover:bg-slate-700 transition-all"
          >
            <item.icon className="w-7 h-7 text-blue-400 mb-3" />
            <h2 className="text-lg font-semibold text-blue-100 mb-1">{item.title}</h2>
            <p className="text-sm text-slate-400">Klicka för mer info</p>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 p-6 rounded-2xl max-w-3xl w-full shadow-2xl border border-blue-800">
            <h2 className="text-xl font-bold mb-4 text-blue-300">{selected.title}</h2>
            <div className="mb-4 max-h-[60vh] overflow-y-auto">{selected.component}</div>
            <button
              onClick={() => setSelected(null)}
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Stäng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
