// src/components/DashboardGrid.jsx
import React, { useEffect, useState } from "react";
import { API_BASE } from "@/utils/apiBase";
import { useOutletContext } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import BatteryPlanProShadcn from "@/components/cards/BatteryPlanProShadcn";

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
    fetch(`${API_BASE}/elekto/balance`)
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        if (mounted && typeof data?.balance === "number") {
          setElektoBalance(data.balance);
        }
      })
      .catch(() => {})
      .finally(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const simulateEarn = () => setElektoBalance((b) => +(b + 0.5).toFixed(3));

  return (
    // Viktigt: 'dashboard-grid' ger rätt z-index enligt vår index.css patch
    <div className="dashboard-grid relative z-[1] grid grid-cols-12 gap-4">
      {/* Produktion / Förbrukning */}
      <section className="card-glass card-eq col-span-12 md:col-span-6">
        <div className="section-title">Produktion</div>
        <SolarProductionCard />
      </section>

      <section className="card-glass card-eq col-span-12 md:col-span-6">
        <div className="section-title">Förbrukning</div>
        <ConsumptionCard />
      </section>

      {/* Batteri / Spotpris */}
      <section className="card-glass card-eq col-span-12 md:col-span-6">
        <div className="section-title">Batteri</div>
        <BatteryStatusCard />
      </section>

      <section className="card-glass card-eq col-span-12 md:col-span-6">
        <div className="section-title">Spotpris (24h)</div>
        <SpotPriceCard />
      </section>

      {/* Batteriplan – läggs i egen container under menyn (z-index 1) */}
      <section className="card-glass card-eq col-span-12">
        <div className="section-title">Batteriplan (AI + Manuellt)</div>
        <div className="battery-plan-container relative z-[1]">
          <BatteryPlanProShadcn defaultZone="SE3" useSmhiWind />
        </div>
      </section>

      {/* ELEKTO balans */}
      <section className="card-glass col-span-12">
        <div className="flex items-center justify-between">
          <div className="section-title">ELEKTO — Tjäna & Dela</div>
          <button
            onClick={simulateEarn}
            className="theme-toggle inline-flex items-center gap-2"
            title="Simulera earn (demo)"
          >
            <PlusCircle size={20} />
          </button>
        </div>
        <div className="text-3xl font-extrabold">
          {elektoBalance}{" "}
          <span className="text-sm opacity-80">ELEKTO</span>
        </div>
        <div className="text-xs opacity-70">1 ELEKTO = 1 kWh (internt)</div>
      </section>

      {/* Avancerade kort */}
      {advanced && (
        <>
          <section className="card-glass col-span-12 md:col-span-6">
            <div className="section-title">Vind</div>
            <WindGauge />
          </section>

          <section className="card-glass col-span-12 md:col-span-6">
            <div className="section-title">Solinstrålning</div>
            <SolarGauge />
          </section>

          <section className="card-glass col-span-12">
            <div className="section-title">Energiflöde</div>
            <EnergyFlowCard />
          </section>

          <section className="card-glass col-span-12 md:col-span-6">
            <div className="section-title">Nätgräns</div>
            <GridLimitCard />
          </section>

          <section className="card-glass col-span-12">
            <div className="section-title">Communitydelning (3 hus)</div>
            <CommunitySharingCard />
          </section>
        </>
      )}
    </div>
  );
}
