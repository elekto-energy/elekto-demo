// src/components/cards/BatteryCard.jsx
import React, { useEffect, useState } from "react";

export default function BatteryCard() {
  const [batteryLevel, setBatteryLevel] = useState(68); // Simulerad nivå i procent
  const [charging, setCharging] = useState(true);       // Laddar eller inte

  useEffect(() => {
    const interval = setInterval(() => {
      setBatteryLevel((prev) => {
        const delta = charging ? 0.5 : -0.3;
        let newLevel = prev + delta;
        if (newLevel >= 100) {
          setCharging(false);
          newLevel = 100;
        } else if (newLevel <= 20) {
          setCharging(true);
          newLevel = 20;
        }
        return parseFloat(newLevel.toFixed(1));
      });
    }, 3000); // Uppdatera var 3:e sekund
    return () => clearInterval(interval);
  }, [charging]);

  const statusColor =
    batteryLevel >= 80
      ? "bg-green-500"
      : batteryLevel >= 40
      ? "bg-yellow-400"
      : "bg-red-500";

  return (
    <div className="text-blue-100">
      <p className="mb-2 text-blue-200">Batterinivå och laddstatus:</p>
      <div className="flex items-center gap-4">
        <div className="w-full bg-gray-700 rounded-full h-6 overflow-hidden shadow-inner">
          <div
            className={`h-full ${statusColor} transition-all duration-500`}
            style={{ width: `${batteryLevel}%` }}
          ></div>
        </div>
        <span className="text-blue-300 font-semibold">{batteryLevel}%</span>
      </div>
      <div className="mt-2 text-sm text-blue-400">
        Status: {charging ? "🔌 Laddar" : "🔋 Utskrift"}
      </div>
    </div>
  );
}
