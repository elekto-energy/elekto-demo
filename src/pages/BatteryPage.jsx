// src/pages/BatteryPage.jsx
import React from "react";
import BatteryStatusCard from "@/components/cards/BatteryStatusCard";
import GridLimitCard from "@/components/cards/GridLimitCard";

export default function BatteryPage(){
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(12,1fr)", gap:16 }}>
      <div className="card-glass" style={{ gridColumn:"span 6" }}>
        <div className="section-title">Batteri</div>
        <BatteryStatusCard/>
      </div>
      <div className="card-glass" style={{ gridColumn:"span 6" }}>
        <div className="section-title">Nätgräns</div>
        <GridLimitCard/>
      </div>
    </div>
  );
}
