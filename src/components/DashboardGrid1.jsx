import React, { useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/utils/apiBase";
import Topbar from "./layout/Topbar";
import Sidebar from "./layout/Sidebar";
import { Wallet, SendHorizontal, PlusCircle } from "lucide-react";


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
    alert("Shared ELEKTO successfully (demo).");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px" }}>
        <Topbar advanced={advanced} onToggleAdvanced={() => setAdvanced((x) => !x)} />

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "16px",
          alignItems: "stretch"
        }}>
          <div className="card-glass" style={{ gridColumn: "span 6" }}>
            <div className="section-title">Production</div>
            <SolarProductionCard />
          </div>

          <div className="card-glass" style={{ gridColumn: "span 6" }}>
            <div className="section-title">Consumption</div>
            <ConsumptionCard />
          </div>

          <div className="card-glass" style={{ gridColumn: "span 4" }}>
            <div className="section-title">Battery</div>
            <BatteryStatusCard />
          </div>

          <div className="card-glass" style={{ gridColumn: "span 8" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="section-title">ELEKTO — Earn & Share</div>
              <button onClick={simulateEarn} className="theme-toggle" title="Simulate earn (demo)">
                <PlusCircle size={20} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="card-glass" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Wallet size={24} />
                <div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Current Balance</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{elektoBalance} <span style={{ fontSize: 14, opacity: 0.8 }}>ELEKTO</span></div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>1 ELEKTO = 1 kWh (internal)</div>
                </div>
              </div>

              <div className="card-glass">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <SendHorizontal size={18} />
                  <div style={{ fontWeight: 600 }}>Share with member</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 120px auto", gap: 8 }}>
                  <input
                    placeholder="Member address / ID"
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
                    Send
                  </button>
                </div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                  Demo only. This will connect to ELEKTO transfer API / chain later.
                </div>
              </div>
            </div>
          </div>
        </div>

        {advanced && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "16px" }}>
            <div className="card-glass" style={{ gridColumn: "span 6" }}>
              <div className="section-title">Spot Price (24h)</div>
              <SpotPriceCard />
            </div>

            <div className="card-glass" style={{ gridColumn: "span 6" }}>
              <div className="section-title">Solar & Weather Forecast</div>
              <SmhiForecastWidget lat={59.33} lon={18.07} />
            </div>

            <div className="card-glass" style={{ gridColumn: "span 12" }}>
              <div className="section-title">Battery Plan</div>
              <BatteryPlan />
            </div>

            <div className="card-glass" style={{ gridColumn: "span 12" }}>
              <div className="section-title">Energy Flow</div>
              <EnergyFlowCard />
            </div>

            <div className="card-glass" style={{ gridColumn: "span 6" }}>
              <div className="section-title">Grid Limit</div>
              <GridLimitCard />
            </div>

            <div className="card-glass" style={{ gridColumn: "span 12" }}>
              <div className="section-title">Community Sharing (3 houses)</div>
              <CommunitySharingCard />
            </div>

            <div className="card-glass" style={{ gridColumn: "span 12" }}>
              <div className="section-title">Impact & Insights</div>
              <ImpactWidgetV3 />
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
