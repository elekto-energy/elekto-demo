// File: src/utils/analyzeForecast.js
export function analyzeForecast(forecast) {
  if (!forecast || forecast.length === 0) return null;
  const values = forecast.map(f => ({
    solar: f.solar_rad,
    wind: f.wind_speed
  }));
  const total = values.reduce((acc, cur) => ({
    solar: acc.solar + cur.solar,
    wind: acc.wind + cur.wind
  }), { solar: 0, wind: 0 });
  const avgSolar = total.solar / values.length;
  const avgWind = total.wind / values.length;
  const maxSolar = Math.max(...values.map(v => v.solar));
  const maxWind = Math.max(...values.map(v => v.wind));
  return {
    averageSolar: avgSolar,
    averageWind: avgWind,
    peakSolar: maxSolar,
    peakWind: maxWind,
    dataPoints: values.length
  };
}
