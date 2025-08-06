import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, ReferenceDot
} from "recharts";
import { ethers } from "ethers";
import { AnalogMeterProduction } from "./cards/AnalogMeterProduction";
import { BatteryBar } from "./cards/BatteryBar";
import { SmhiForecastWidget } from "./SmhiForecastWidget";

// --- ELEKTO-konstanter ---
const ELEKTO_TOKEN_ADDRESS = "0x6a333Ff2233aED4faA5404c4D119Ec7628Bb33dA";
const ELEKTO_TOKEN_DECIMALS = 18;
const ELEKTO_TOKEN_SYMBOL = "ELEKTO";
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

// Hjälpare: datumdelar i svensk tidszon
function getSEDateParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const Y = fmt.find((p) => p.type === "year")?.value;
  const M = fmt.find((p) => p.type === "month")?.value;
  const D = fmt.find((p) => p.type === "day")?.value;
  return { Y, M, D };
}

// Dummydata för produktion/förbrukning (placeholder)
const mockData = [
  { time: "08:00", production: 1.2, consumption: 0.8 },
  { time: "09:00", production: 1.8, consumption: 1.0 },
  { time: "10:00", production: 2.6, consumption: 1.6 },
  { time: "11:00", production: 3.4, consumption: 2.1 },
  { time: "12:00", production: 3.8, consumption: 2.9 },
  { time: "13:00", production: 3.2, consumption: 3.1 },
  { time: "14:00", production: 2.4, consumption: 3.0 },
];

// ===== Inbyggd Batteriplan-komponent =====
function BatteryPlan({ priceData }) {
  const [chargeHours, setChargeHours] = useState(4);
  const [dischargeHours, setDischargeHours] = useState(4);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sentAt, setSentAt] = useState(null);

  const plan = useMemo(() => {
    if (!priceData?.length) return [];
    const sortedAsc = [...priceData].sort((a, b) => a.ore - b.ore);
    const sortedDesc = [...priceData].sort((a, b) => b.ore - a.ore);
    const chargeSet = new Set(sortedAsc.slice(0, chargeHours).map((p) => p.hour));
    const dischargeSet = new Set(sortedDesc.slice(0, dischargeHours).map((p) => p.hour));
    return priceData.map((p) => ({
      hour: p.hour,
      action: chargeSet.has(p.hour)
        ? "CHARGE"
        : dischargeSet.has(p.hour)
        ? "DISCHARGE"
        : "HOLD",
      price: p.ore,
      ts: p._t,
    }));
  }, [priceData, chargeHours, dischargeHours]);

  const sendToEMS = async () => {
    setSending(true);
    setSendResult("");
    setSendSuccess(false);
    setSentAt(null);
    try {
      const res = await fetch("http://localhost:5000/api/ems/battery-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "cors",
        body: JSON.stringify({ plan, meta: { chargeHours, dischargeHours } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`EMS svarade ${res.status}`);
      if (data.ok) {
        setSendSuccess(true);
        setSendResult(data.message || "Plan mottagen i backend");
        setSentAt(new Date());
      } else {
        setSendSuccess(false);
        setSendResult("Mottog svar från backend men ok=false");
      }
    } catch (err) {
      setSendSuccess(false);
      setSendResult(`Fel vid sändning: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-800 p-6 shadow-lg text-white">
      <h3 className="text-lg font-semibold mb-3">🔋 Batteriplan</h3>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <label className="text-sm">
          Charge-timmar:
          <input
            type="number"
            value={chargeHours}
            onChange={(e) => setChargeHours(Math.max(0, Math.min(12, Number(e.target.value))))}
            min="0"
            max="12"
            className="ml-2 w-16 bg-slate-700 border border-slate-500 rounded px-2 py-1"
          />
        </label>
        <label className="text-sm">
          Discharge-timmar:
          <input
            type="number"
            value={dischargeHours}
            onChange={(e) => setDischargeHours(Math.max(0, Math.min(12, Number(e.target.value))))}
            min="0"
            max="12"
            className="ml-2 w-16 bg-slate-700 border border-slate-500 rounded px-2 py-1"
          />
        </label>
        <button
          onClick={sendToEMS}
          disabled={sending || !plan.length}
          className="ml-auto bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          {sending ? "Skickar..." : "Skicka till EMS"}
        </button>
      </div>
      <div className="overflow-auto rounded border border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th className="text-left p-2">Timme</th>
              <th className="text-left p-2">Pris (öre/kWh)</th>
              <th className="text-left p-2">Åtgärd</th>
            </tr>
          </thead>
          <tbody>
            {plan.map((step) => (
              <tr
                key={step.hour}
                className={
                  step.action === "CHARGE"
                    ? "text-green-400"
                    : step.action === "DISCHARGE"
                    ? "text-red-400"
                    : "text-slate-200"
                }
              >
                <td className="p-2">{step.hour}</td>
                <td className="p-2">{step.price.toFixed(1)}</td>
                <td className="p-2">{step.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sendResult && (
        <p
          className={`mt-3 text-sm ${
            sendSuccess ? "text-green-400" : "text-red-400"
          }`}
        >
          {sendResult}
          {sendSuccess && sentAt && (
            <> — {sentAt.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</>
          )}
        </p>
      )}
    </div>
  );
}

export function DashboardGrid() {
  // SMHI forecast och demo-solproduktion
  const [smhiForecast, setSmhiForecast] = useState([]);
  useEffect(() => {
    fetch(`/api/smhi?lat=59.33&lon=18.07`)
      .then(res => res.json())
      .then(data => setSmhiForecast(data.forecast || []));
  }, []);

  const avgSolar = smhiForecast.length
    ? smhiForecast.reduce((s, f) => s + (f.solar_rad || 0), 0) / smhiForecast.length
    : 0;
  const solproduktion = Math.round(Math.min(10, (avgSolar / 800) * 10) * 10) / 10;

  // Vind kan också synkas, men här sätter vi ett demo-värde:
  const vindproduktion = 3.4;
  const batterier = [
    { value: 73, title: "Batteri 1", status: "charging" },
    { value: 9, title: "Batteri 2", status: "discharging" }
  ];

  // Token och spotpris
  const [tokenBalance, setTokenBalance] = useState(null);
  const [walletError, setWalletError] = useState("");
  const [loadingBalance, setLoadingBalance] = useState(false);

  const [zone, setZone] = useState(() => localStorage.getItem("zone") || "SE3");
  const [priceData, setPriceData] = useState([]);
  const [priceMsg, setPriceMsg] = useState("");
  const [loadingPrice, setLoadingPrice] = useState(false);

  const [showBatteryPlan, setShowBatteryPlan] = useState(false);

  // Spotpris-funktioner
  const fetchPrices = useCallback(
    async (z = zone, attempt = 0, targetDate = new Date()) => {
      setLoadingPrice(true);
      try {
        const { Y, M, D } = getSEDateParts(targetDate);
        const url = `https://www.elprisetjustnu.se/api/v1/prices/${Y}/${M}-${D}_${z}.json`;
        const res = await fetch(url);
        if (!res.ok) {
          if (attempt === 0) {
            setPriceMsg("Ingen data för idag – visar gårdagens priser.");
            const y = new Date(targetDate);
            y.setDate(y.getDate() - 1);
            return fetchPrices(z, 1, y);
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
          setPriceData([]);
          setPriceMsg(`Ingen data tillgänglig för ${z}.`);
          return;
        }
        const formatted = data.map((p) => {
          const ts = new Date(p.time_start);
          const hour = ts.toLocaleTimeString("sv-SE", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Stockholm",
          });
          return {
            hour,
            ore: Number(p.SEK_per_kWh) * 100,
            _t: ts.getTime(),
          };
        });
        setPriceData(formatted);
        setPriceMsg("");
      } catch (e) {
        setPriceMsg(`Fel vid hämtning: ${e.message}`);
        setPriceData([]);
      } finally {
        setLoadingPrice(false);
      }
    },
    [zone]
  );

  useEffect(() => { fetchPrices(); }, [fetchPrices]);
  useEffect(() => { localStorage.setItem("zone", zone); }, [zone]);

  // Stats för spotpris
  const stats = useMemo(() => {
    if (!priceData.length) return null;
    const min = priceData.reduce((a, b) => (b.ore < a.ore ? b : a), priceData[0]);
    const max = priceData.reduce((a, b) => (b.ore > a.ore ? b : a), priceData[0]);
    const avg = priceData.reduce((s, p) => s + p.ore, 0) / priceData.length;
    const nowH = new Date().toLocaleTimeString("sv-SE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Stockholm",
    });
    return { min, max, avg, nowH };
  }, [priceData]);

  // ELEKTO-token
  const fetchTokenBalance = useCallback(async () => {
    if (!window.ethereum) {
      setWalletError("MetaMask hittas inte i denna flik.");
      return;
    }
    setWalletError("");
    setLoadingBalance(true);
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      if (network.chainId !== 137n) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x89" }],
          });
        } catch (err) {
          if (err.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0x89",
                  chainName: "Polygon Mainnet",
                  nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
                  rpcUrls: ["https://polygon-rpc.com/"],
                  blockExplorerUrls: ["https://polygonscan.com/"],
                },
              ],
            });
          } else {
            throw err;
          }
        }
      }
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const token = new ethers.Contract(ELEKTO_TOKEN_ADDRESS, ERC20_ABI, provider);
      let decimals = ELEKTO_TOKEN_DECIMALS;
      try { decimals = await token.decimals(); } catch {}
      const raw = await token.balanceOf(userAddress);
      const formatted = Number(ethers.formatUnits(raw, decimals));
      setTokenBalance(formatted);
    } catch (e) {
      setWalletError(e?.message || "Kunde inte läsa tokenbalans.");
      setTokenBalance(null);
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  useEffect(() => { fetchTokenBalance(); }, [fetchTokenBalance]);

  // === LAYOUT ===
  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 text-white bg-gradient-to-br from-slate-900 to-slate-950 min-h-screen">
      {/* Mätare överst */}
      <div className="col-span-1 md:col-span-2 xl:col-span-3 flex flex-row gap-10 justify-center mb-4">
        <AnalogMeterProduction
          value={solproduktion}
          min={0}
          max={10}
          title="Solproduktion"
          unit="kW"
          icon="☀️"
          color="#16a34a"
        />
        <AnalogMeterProduction
          value={vindproduktion}
          min={0}
          max={10}
          title="Vindproduktion"
          unit="kW"
          icon="🌬️"
          color="#38bdf8"
        />
      </div>

      {/* SMHI Soltimmar */}
      <div className="col-span-1 md:col-span-2 xl:col-span-3 rounded-2xl bg-slate-800 p-4 shadow-lg">
        <h2 className="text-xl font-bold mb-2">☀️ SMHI Soltimmar</h2>
        <SmhiForecastWidget forecast={smhiForecast} />
      </div>

      {/* Batterier – horisontell rad */}
      <div className="col-span-1 md:col-span-2 xl:col-span-3 bg-white/10 rounded-2xl shadow-xl p-4">
        <h2 className="text-lg font-semibold mb-3 text-white">Batterier</h2>
        <div className="flex flex-row gap-8">
          {batterier.map((batt, i) => (
            <BatteryBar key={i} {...batt} />
          ))}
        </div>
      </div>

      {/* Produktion vs Förbrukning */}
      <div className="col-span-1 xl:col-span-2 rounded-2xl bg-slate-800 p-4 shadow-lg">
        <h2 className="text-xl font-bold mb-2">⚡ Produktion vs Förbrukning</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={mockData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" />
            <YAxis unit=" kWh" stroke="#94a3b8" />
            <Tooltip />
            <Line type="monotone" dataKey="production" stroke="#10b981" name="Produktion" />
            <Line type="monotone" dataKey="consumption" stroke="#ef4444" name="Förbrukning" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tokenbalans (MetaMask) */}
      <div className="rounded-2xl bg-slate-800 p-6 shadow-lg">
        <h3 className="text-lg font-semibold mb-2">⚙️ Tokenbalans</h3>
        <div className="text-4xl font-bold text-yellow-500">
          {tokenBalance == null
            ? "—"
            : new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 6 }).format(tokenBalance)}{" "}
          {ELEKTO_TOKEN_SYMBOL}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={fetchTokenBalance}
            disabled={loadingBalance}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
          >
            {loadingBalance ? "Laddar..." : "Uppdatera balans"}
          </button>
          <button
            onClick={async () => {
              if (!window.ethereum) {
                alert("Installera MetaMask för att lägga till token.");
                return;
              }
              try {
                const wasAdded = await window.ethereum.request({
                  method: "wallet_watchAsset",
                  params: {
                    type: "ERC20",
                    options: {
                      address: ELEKTO_TOKEN_ADDRESS,
                      symbol: ELEKTO_TOKEN_SYMBOL,
                      decimals: ELEKTO_TOKEN_DECIMALS,
                      image: "https://example.com/elekto-token.png",
                    },
                  },
                });
                if (wasAdded) alert("ELEKTO-token tillagd i MetaMask!");
              } catch (e) {
                console.error("Kunde inte lägga till token:", e);
                alert("Kunde inte lägga till token i MetaMask.");
              }
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
            disabled={!window.ethereum}
            title={!window.ethereum ? "MetaMask krävs" : "Lägg till token i MetaMask"}
          >
            Lägg till i MetaMask
          </button>
        </div>
        {walletError && <p className="mt-2 text-sm text-red-400">{walletError}</p>}
      </div>

      {/* Spotpris */}
      <div className="col-span-1 md:col-span-2 xl:col-span-3 rounded-2xl bg-slate-800 p-6 shadow-lg">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <h3 className="text-lg font-semibold">💡 Spotpris per timme</h3>
          <select
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="bg-slate-700 text-white px-2 py-1 rounded border border-slate-600"
          >
            {["SE1", "SE2", "SE3", "SE4"].map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
          <button
            onClick={() => fetchPrices(zone)}
            disabled={loadingPrice}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
          >
            {loadingPrice ? "Laddar..." : "Uppdatera priser"}
          </button>
        </div>
        {priceMsg && <p className="text-sm text-red-400 mb-2">{priceMsg}</p>}
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={priceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="hour" stroke="#94a3b8" />
            <YAxis domain={["auto", "auto"]} unit=" öre/kWh" stroke="#94a3b8" />
            <Tooltip formatter={(v) => `${Number(v).toFixed(1)} öre/kWh`} />
            {stats && (
              <ReferenceLine
                y={stats.avg}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
                label={{ value: "Medel", position: "right", fill: "#94a3b8", fontSize: 12 }}
              />
            )}
            {stats && (
              <ReferenceLine
                x={stats.nowH}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                label={{ value: "Nu", position: "insideTop", fill: "#f59e0b", fontSize: 12 }}
              />
            )}
            {stats && (
              <>
                <ReferenceDot x={stats.min.hour} y={stats.min.ore} r={5} fill="#22c55e" stroke="none" />
                <ReferenceDot x={stats.max.hour} y={stats.max.ore} r={5} fill="#ef4444" stroke="none" />
              </>
            )}
            <Line
              type="monotone"
              dataKey="ore"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={({ cx, cy, payload }) => {
                const color = payload.ore < 0 ? "#22c55e" : payload.ore > 50 ? "#ef4444" : "#60a5fa";
                return <circle cx={cx} cy={cy} r={3} fill={color} />;
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Batteriplan – gömd som standard */}
      <div className="col-span-1 md:col-span-2 xl:col-span-3">
        <button
          onClick={() => setShowBatteryPlan((v) => !v)}
          className="mb-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded focus:outline-none"
        >
          {showBatteryPlan ? "Dölj batteriplan" : "Visa batteriplan"}
        </button>
        {showBatteryPlan && <BatteryPlan priceData={priceData} />}
      </div>
    </div>
  );
}