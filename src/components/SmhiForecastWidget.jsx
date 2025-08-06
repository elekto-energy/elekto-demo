import React, { useEffect, useState } from "react";

export function SmhiForecastWidget({ lat = 59.33, lon = 18.07 }) {
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/smhi?lat=${lat}&lon=${lon}`)
      .then(res => res.json())
      .then(data => setForecast(data.forecast))
      .finally(() => setLoading(false));
  }, [lat, lon]);

  if (loading) return <div>Laddar SMHI-prognos...</div>;

  return (
    <div className="bg-slate-800 rounded-xl p-4 shadow text-white">
      <h3 className="font-bold mb-2">🌬️☀️ SMHI Prognos (24h)</h3>
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th>Tid</th>
            <th>Vind (m/s)</th>
            <th>Sol (W/m²)</th>
          </tr>
        </thead>
        <tbody>
          {forecast.map((f, i) => (
            <tr key={i}>
              <td>{f.time.slice(11, 16)}</td>
              <td>{f.wind_speed == null ? "–" : f.wind_speed.toFixed(1)}</td>
              <td>{f.solar_rad == null ? "–" : Math.round(f.solar_rad)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
