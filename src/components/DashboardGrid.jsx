import React, { useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/utils/apiBase";
import { useOutletContext } from "react-router-dom";
import { PlusCircle } from "lucide-react";

import SolarProductionCard from "./cards/SolarProductionCard";
import ConsumptionCard from "./cards/ConsumptionCard";
import BatteryStatusCard from "./cards/BatteryStatusCard";
import SpotPriceCard from "./cards/SpotPriceCard";
import EnergyFlowCard from "./cards/EnergyFlowCard";
import GridLimitCard from "./cards/GridLimitCard";
import CommunitySharingCard from "./cards/CommunitySharingCard";
import WindGauge from "./cards/WindGauge";
import SolarGauge from "./cards/SolarGauge";

export default function DashboardGrid() {
  const { advanced } = useOutletContext();
  const [elektoBalance, setElektoBalance] = useState(42.5);

  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE}/elekto/balance`).then(async (r) => {
      try {
        const data = await r.json();
        if (mounted && typeof data?.balance === "number") setElektoBalance(data.balance);
      } catch (_) {}
    }).catch(() => {});
    return () => { mounted = false; }
  }, []);

  const simulateEarn = () => setElektoBalance((b) => +(b + 0.5).toFixed(3));

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(12,1fr)", gap:16 }}>
      <div className="card-glass card-eq" style={{ gridColumn:"span 6" }}>
        <div className="section-title">Produktion</div>
        <SolarProductionCard />
      </div>
      <div className="card-glass card-eq" style={{ gridColumn:"span 6" }}>
        <div className="section-title">Förbrukning</div>
        <ConsumptionCard />
      </div>
      <div className="card-glass card-eq" style={{ gridColumn:"span 6" }}>
        <div className="section-title">Batteri</div>
        <BatteryStatusCard />
      </div>
      <div className="card-glass card-eq" style={{ gridColumn:"span 6" }}>
        <div className="section-title">Spotpris (24h)</div>
        <SpotPriceCard />
      </div>
      <div className="card-glass" style={{ gridColumn:"span 12" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div className="section-title">ELEKTO — Tjäna & Dela</div>
          <button onClick={simulateEarn} className="theme-toggle" title="Simulera earn (demo)">
            <PlusCircle size={20}/>
          </button>
        </div>
        <div style={{ fontSize:28, fontWeight:800 }}>{elektoBalance} <span style={{ fontSize:14, opacity:.8 }}>ELEKTO</span></div>
        <div style={{ fontSize:12, opacity:.7 }}>1 ELEKTO = 1 kWh (internt)</div>
      </div>

      {advanced && (
        <>
          <div className="card-glass" style={{ gridColumn:"span 6" }}>
            <div className="section-title">Vind</div>
            <WindGauge />
          </div>
          <div className="card-glass" style={{ gridColumn:"span 6" }}>
            <div className="section-title">Solinstrålning</div>
            <SolarGauge />
          </div>
          <div className="card-glass" style={{ gridColumn:"span 12" }}>
            <div className="section-title">Energiflöde</div>
            <EnergyFlowCard />
          </div>
          <div className="card-glass" style={{ gridColumn:"span 6" }}>
            <div className="section-title">Nätgräns</div>
            <GridLimitCard />
          </div>
          <div className="card-glass" style={{ gridColumn:"span 12" }}>
            <div className="section-title">Communitydelning (3 hus)</div>
            <CommunitySharingCard />
          </div>
        </>
      )}
    </div>
  );
}
