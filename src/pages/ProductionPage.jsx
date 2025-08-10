// src/pages/ProductionPage.jsx
import React from "react";
import SolarProductionCard from "@/components/cards/SolarProductionCard";
import ConsumptionCard from "@/components/cards/ConsumptionCard";

export default function ProductionPage(){
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(12,1fr)", gap:16 }}>
      <div className="card-glass" style={{ gridColumn:"span 6" }}>
        <div className="section-title">Produktion</div>
        <SolarProductionCard/>
      </div>
      <div className="card-glass" style={{ gridColumn:"span 6" }}>
        <div className="section-title">Förbrukning</div>
        <ConsumptionCard/>
      </div>
    </div>
  );
}
