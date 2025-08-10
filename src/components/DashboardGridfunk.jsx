import React, { useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/utils/apiBase";
import Topbar from "./layout/Topbar";
import Sidebar from "./layout/Sidebar";
import { Wallet, SendHorizontal, PlusCircle } from "lucide-react";

// Bas-kort
import SolarProductionCard from "./cards/SolarProductionCard";
import ConsumptionCard from "./cards/ConsumptionCard";
import BatteryStatusCard from "./cards/BatteryStatusCard";
import SpotPriceCard from "./cards/SpotPriceCard";
// Avancerade kort
import EnergyFlowCard from "./cards/EnergyFlowCard";
import GridLimitCard from "./cards/GridLimitCard";
import CommunitySharingCard from "./cards/CommunitySharingCard";

export default function DashboardGrid() {
  const [advanced, setAdvanced] = useState(false);
  const [elektoBalance, setElektoBalance] = useState(0);
  const [shareTo, setShareTo] = useState("");
  const [shareAmount, setShareAmount] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE}/elekto/balance`).then(async (r) => {
      try {
        const data = await r.json();
        if (mounted && typeof data?.balance === "number") setElektoBalance(data.balance);
      } catch (_) {
        if (mounted) setElektoBalance(42.5);
      }
    }).catch(() => {
      if (mounted) setElektoBalance(42.5);
    });
    return () => { mounted = false; }
  }, []);

  const simulateEarn = () => setElektoBalance((b) => +(b + 0.5).toFixed(3));

  const canShare = useMemo(() => {
    const amt = parseFloat(shareAmount || "0");
    return shareTo && amt > 0 && amt <= elektoBalance;
  }, [shareTo, shareAmount, elektoBalance]);

  const doShare = () => {
    if (!canShare) return;
    setElektoBalance((b) => +(b - parseFloat(shareAmount)).toFixed(3));
    setShareAmount("");
    setShareTo("");
    alert("Delade ELEKTO (demo).");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px" }}>
        <Topbar advanced={advanced} onToggleAdvanced={() => setAdvanced((x) => !x)} />

        {/* Översikt */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: "16px",
            alignItems: "stretch",
          }}
        >
          {/* Rad 1 */}
          <div className="card-glass card-eq" style={{ gridColumn: "span 6" }}>
            <div className="section-title">Produktion</div>
            <SolarProductionCard />
          </div>

          <div className="card-glass card-eq" style={{ gridColumn: "span 6" }}>
            <div className="section-title">Förbrukning</div>
            <ConsumptionCard />
          </div>

          {/* Rad 2 */}
          <div className="card-glass card-eq" style={{ gridColumn: "span 6" }}>
            <div className="section-title">Batteri</div>
            <BatteryStatusCard />
          </div>

          <div className="card-glass card-eq" style={{ gridColumn: "span 6" }}>
            <div className="section-title">Spotpris (24h)</div>
            <SpotPriceCard />
          </div>

          {/* ELEKTO - fullbredd */}
          <div className="card-glass" style={{ gridColumn: "span 12" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="section-title">ELEKTO — Tjäna & Dela</div>
              <button onClick={simulateEarn} className="theme-toggle" title="Simulera earn (demo)">
                <PlusCircle size={20} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="card-glass" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Wallet size={24} />
                <div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Aktuellt saldo</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{elektoBalance} <span style={{ fontSize: 14, opacity: 0.8 }}>ELEKTO</span></div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>1 ELEKTO = 1 kWh (internt)</div>
                </div>
              </div>

              <div className="card-glass">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <SendHorizontal size={18} />
                  <div style={{ fontWeight: 600 }}>Dela till medlem</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 120px auto", gap: 8 }}>
                  <input
                    placeholder="Medlemsadress / ID"
                    value={shareTo}
                    onChange={(e) => setShareTo(e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    placeholder="kWh"
                    value={shareAmount}
                    onChange={(e) => setShareAmount(e.target.value)}
                    style={inputStyle}
                  />
                  <button
                    disabled={!canShare}
                    onClick={doShare}
                    className="theme-toggle"
                    style={{ opacity: canShare ? 1 : 0.5 }}
                  >
                    Skicka
                  </button>
                </div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                  Demo. Detta kopplas till ELEKTO transfer API/blockchain senare.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Avancerat */}
        {advanced && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "16px" }}>
            <div className="card-glass" style={{ gridColumn: "span 12" }}>
              <div className="section-title">Energiflöde</div>
              <EnergyFlowCard />
            </div>

            <div className="card-glass" style={{ gridColumn: "span 6" }}>
              <div className="section-title">Nätgräns</div>
              <GridLimitCard />
            </div>

            <div className="card-glass" style={{ gridColumn: "span 12" }}>
              <div className="section-title">Communitydelning (3 hus)</div>
              <CommunitySharingCard />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--card-border)",
  background: "var(--card-bg)",
  color: "var(--text-color)",
  outline: "none"
};
