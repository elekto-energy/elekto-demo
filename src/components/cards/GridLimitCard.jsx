import React, { useEffect, useState } from "react";
import { API_BASE } from "@/utils/apiBase";

export default function GridLimitCard() {
  const [limitKW, setLimitKW] = useState(17);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE}/settings/grid-limit`).then(async r => {
      const js = await r.json();
      if (mounted && typeof js?.limitKW === "number") setLimitKW(js.limitKW);
    }).catch(()=>{});
    return () => { mounted = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/settings/grid-limit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limitKW })
      });
      setSavedAt(new Date().toLocaleTimeString());
    } catch(e) {
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 8, display:"flex", justifyContent:"space-between" }}>
        <div><b>Nätets import/export-gräns</b></div>
        <div style={{ opacity:0.7, fontSize:12 }}>{savedAt ? `Sparad ${savedAt}` : "Ej sparad"}</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 100px", gap: 12, alignItems:"center" }}>
        <input
          type="range"
          min={5} max={25} step={1}
          value={limitKW}
          onChange={(e)=>setLimitKW(parseInt(e.target.value))}
          className="slider"
        />
        <div className="stat"><b>{limitKW} kW</b></div>
      </div>
      <div style={{ marginTop: 10 }}>
        <button className="theme-toggle" onClick={save} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>
          {saving ? "Sparar…" : "Spara gräns"}
        </button>
      </div>
      <div style={{ fontSize:12, opacity:0.8, marginTop:8 }}>
        Matchar din huvudsäkring (t.ex. 25A ≈ 17 kW 3-fas). Kan ökas till 35A (~24 kW) senare.
      </div>
    </div>
  );
}
