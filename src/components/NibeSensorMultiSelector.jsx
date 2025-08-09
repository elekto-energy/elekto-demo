import React, { useEffect, useState } from "react";
import { NibeCard } from "./cards/NibeCard";

// === Sätt dina egna Home Assistant-uppgifter här ===
const HA_URL = "http://homeassistant.local:8123";
const HA_TOKEN = "DIN_LONG_LIVED_ACCESS_TOKEN"; // Byt till din riktiga token!

function getNibeIcon(sensor) {
  if (!sensor || !sensor.attributes) return "🔹";
  const u = sensor.attributes.unit_of_measurement || "";
  if (u === "°C") return "🌡️";
  if (u === "kWh" || u === "kW") return "⚡";
  if (u === "bar") return "🫧";
  if (u === "Hz") return "🎵";
  if (u === "%") return "💧";
  if (u === "l/min") return "🚿";
  return "🔹";
}

export function NibeSensorMultiSelector() {
  const [sensors, setSensors] = useState([]);
  const [selected, setSelected] = useState([]);
  const [sensorValues, setSensorValues] = useState({});
  const [error, setError] = useState(null);

  // Hämta urval från localStorage vid första render
  useEffect(() => {
    const prev = localStorage.getItem("nibeSelected");
    if (prev) setSelected(JSON.parse(prev));
  }, []);

  // Spara urvalet till localStorage varje gång det ändras
  useEffect(() => {
    localStorage.setItem("nibeSelected", JSON.stringify(selected));
  }, [selected]);

  // Hämta alla sensorer (endast vid start)
  useEffect(() => {
    const headers = {
      Authorization: `Bearer ${HA_TOKEN}`,
      "Content-Type": "application/json",
    };
    fetch(`${HA_URL}/api/states`, { headers })
      .then(res => {
        if (!res.ok) throw new Error("Kunde inte ansluta till Home Assistant");
        return res.json();
      })
      .then(all => {
        const nibeSensors = all.filter(e =>
          e.entity_id.startsWith("sensor.nibe_")
        );
        setSensors(nibeSensors);
        setError(null);
      })
      .catch(err => setError(err.message));
  }, []);

  // Hämta värden för alla valda sensorer (varje gång urvalet ändras)
  useEffect(() => {
    if (!selected.length) return;
    const headers = {
      Authorization: `Bearer ${HA_TOKEN}`,
      "Content-Type": "application/json",
    };
    Promise.all(
      selected.map(entity_id =>
        fetch(`${HA_URL}/api/states/${entity_id}`, { headers })
          .then(res => res.json())
          .then(data => [entity_id, data])
          .catch(() => [entity_id, null])
      )
    ).then(results => {
      const newValues = {};
      results.forEach(([entity_id, data]) => {
        newValues[entity_id] = data;
      });
      setSensorValues(newValues);
    });
  }, [selected]);

  function handleCheck(entity_id) {
    setSelected(selected =>
      selected.includes(entity_id)
        ? selected.filter(eid => eid !== entity_id)
        : [...selected, entity_id]
    );
  }

  return (
    <div className="rounded-xl bg-slate-800 p-4 shadow-lg text-white min-w-[340px]">
      <h3 className="font-bold mb-3">✅ Välj vilka Nibe-sensorer som ska visas</h3>

      {error && (
        <div className="bg-red-900 text-red-300 rounded p-2 mb-2">
          {error}
        </div>
      )}

      <div className="max-h-48 overflow-auto mb-4 grid grid-cols-1 gap-2">
        {sensors.length === 0 && !error && (
          <div className="text-slate-400">Hämtar sensorer...</div>
        )}
        {sensors.map(s => (
          <label key={s.entity_id} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(s.entity_id)}
              onChange={() => handleCheck(s.entity_id)}
            />
            <span>{s.attributes.friendly_name || s.entity_id}</span>
          </label>
        ))}
      </div>

      {/* Grid av cards för valda sensorer */}
      <div className="border-t border-slate-700 pt-3">
        {selected.length === 0 && <div className="text-slate-400">Inga sensorer valda.</div>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {selected.map(entity_id => {
            const s = sensorValues[entity_id];
            if (!s) return <div key={entity_id} className="text-slate-500">Hämtar...</div>;
            if (s === null) return <div key={entity_id} className="text-red-400">Fel att hämta sensor.</div>;
            return (
              <NibeCard
                key={entity_id}
                title={s.attributes.friendly_name || entity_id}
                value={`${s.state} ${s.attributes.unit_of_measurement || ""}`}
                icon={getNibeIcon(s)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
