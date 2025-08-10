// src/utils/smhi.js
export const SMHI_BASE = "https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2";

export async function getSmhiForecast(lat, lon) {
  const url = `${SMHI_BASE}/geotype/point/lon/${lon.toFixed(5)}/lat/${lat.toFixed(5)}/data.json`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("SMHI fetch failed");
  return await r.json();
}

export function pickNearest(timeseries, date = new Date()) {
  if (!Array.isArray(timeseries) || timeseries.length === 0) return null;
  const t = date.getTime();
  let best = timeseries[0], bestDiff = Math.abs(new Date(best.validTime).getTime() - t);
  for (let i = 1; i < timeseries.length; i++) {
    const d = Math.abs(new Date(timeseries[i].validTime).getTime() - t);
    if (d < bestDiff) { best = timeseries[i]; bestDiff = d; }
  }
  return best;
}

export async function getWindNow(lat, lon) {
  const fc = await getSmhiForecast(lat, lon);
  const row = pickNearest(fc.timeSeries);
  const map = Object.fromEntries(row.parameters.map(p => [p.name, p.values?.[0]]));
  return {
    speed: Number(map.ws) || 0,
    direction: Number(map.wd) || 0,
    gust: Number(map.gust) || null
  };
}

function solarPosition(date, lat, lon) {
  const rad = Math.PI/180;
  const day = Math.floor((date - new Date(date.getFullYear(),0,0)) / 86400000);
  const decl = -23.44*rad * Math.cos(2*Math.PI*(day+10)/365);
  const time = date.getUTCHours() + date.getUTCMinutes()/60;
  const lst = time + lon/15;
  const ha = (lst-12)*15*rad;
  const latr = lat*rad;
  const sinEl = Math.sin(latr)*Math.sin(decl) + Math.cos(latr)*Math.cos(decl)*Math.cos(ha);
  const elevation = Math.max(0, Math.asin(Math.max(-1, Math.min(1, sinEl))));
  return { elevation };
}

export async function estimateIrradiance(lat, lon, date = new Date()) {
  const fc = await getSmhiForecast(lat, lon);
  const row = pickNearest(fc.timeSeries, date);
  const map = Object.fromEntries(row.parameters.map(p => [p.name, p.values?.[0]]));

  const tcc = map.tcc_mean != null ? Number(map.tcc_mean) : 50;
  const clouds = Math.min(1, Math.max(0, tcc/100));

  const { elevation } = solarPosition(date, lat, lon);
  const cosZ = Math.max(0, Math.sin(elevation));
  const S0 = 1000;
  const ghi_clear = S0 * cosZ;
  const ghi = Math.max(0, 0.2*ghi_clear + 0.8*ghi_clear*(1 - clouds));
  return { irr: Math.round(ghi), tcc: Math.round(tcc) };
}
