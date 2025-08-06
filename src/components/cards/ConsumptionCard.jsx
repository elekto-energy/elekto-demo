// src/components/cards/ConsumptionCard.jsx
import React, { useEffect, useState } from "react";

export default function ConsumptionCard() {
  const [consumptionData, setConsumptionData] = useState([]);

  useEffect(() => {
    // Simulerad API-hämtning
    const fakeData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      consumption: Math.random() * 5 + 1, // kWh
    }));
    setConsumptionData(fakeData);
  }, []);

  const total = consumptionData.reduce((sum, d) => sum + d.consumption, 0).toFixed(2);

  return (
    <div className="text-blue-100">
      <p className="mb-2 text-blue-200">Visar simulerad elförbrukning för idag (kWh per timme):</p>
      <div className="grid grid-cols-4 gap-2 text-sm mb-4">
        {consumptionData.map((d, idx) => (
          <div
            key={idx}
            className="bg-gradient-to-br from-blue-700 to-blue-900 p-2 rounded shadow text-white"
          >
            <strong>{d.hour}</strong>: {d.consumption.toFixed(2)} kWh
          </div>
        ))}
      </div>
      <div className="text-lg font-bold text-blue-300">
        Total förbrukning idag: {total} kWh
      </div>
    </div>
  );
}

