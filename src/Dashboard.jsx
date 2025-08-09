import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { BatteryBar } from "./BatteryBar";
import { ImpactWidget } from "../ImpactWidget";
import { SmhiForecastWidget } from "../SmhiForecastWidget";
import { NibeCard } from "./NibeCard";
import { NibeSensorMultiSelector } from "./NibeSensorMultiSelector";

// --- Token-konstanter ---
const ELEKTO_TOKEN_ADDRESS = "0x6a333Ff2233aED4faA5404c4D119Ec7628Bb33dA";
const ELEKTO_TOKEN_DECIMALS = 18;
const ELEKTO_TOKEN_SYMBOL = "ELEKTO";
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

// --- Helper för svensk tid ---
function getSEDateParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date);
  const Y = fmt.find((p) => p.type === "year")?.value;
  const M = fmt.find((p) => p.type === "month")?.value;
  const D = fmt.find((p) => p.type === "day")?.value;
  return { Y, M, D };
}

// --- Dummydata (byt mot riktiga sensorer vid behov) ---
const mockData = [
  { time: "08:00", production: 1.2, consumption: 0.8 },
  { time: "09:00", production: 1.8, consumption: 1.0 },
  { time: "10:00", production: 2.6, consumption: 1.6 },
  { time: "11:00", production: 3.4, consumption: 2.1 },
  { time: "12:00", production: 3.8, consumption: 2.9 },
  { time: "13:00", production: 3.2, consumption: 3.1 },
  { time: "14:00", production: 2.4, consumption: 3.0 },
];

// --- Batteriplan-komponent med AI/manuell toggle ---
function BatteryPlan({ priceData, aiMode }) {
  const [chargeLimit, setChargeLimit] = useState(35);
  const [dischargeLimit, setDischargeLimit] = useState(60);
  const [manualPlan, setManualPlan] = useState([]);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sentAt, setSentAt] = useState(null);

  // Aktuell timme (svensk tid)
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const currentHour = now.toLocaleTimeString("sv-SE", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Stockholm"
  });

  // AI eller manuell batteriplan
  const plan = useMemo(() => {
    if (!priceData?.length) return [];
    if (aiMode) {
      // AI: Ladda om pris < chargeLimit, urladda om pris > dischargeLimit, annars håll
      return priceData.map((p) => ({
        ...p,
        action:
          p.ore < chargeLimit
            ? "CHARGE"
            : p.ore > dischargeLimit
            ? "DISCHARGE"
            : "HOLD",
      }));
    } else {
      // Manuell: Ladda/urladda genom att klicka i tabellen
      return priceData.map((p, idx) => ({
        ...p,
        action: manualPlan[idx] || "HOLD",
      }));
    }
  }, [aiMode, priceData, chargeLimit, dischargeLimit, manualPlan]);

  // Manuell klick på rad
  const toggleAction = (idx) => {
    setManualPlan((prev) => {
      const next = [...prev];
      const curr = next[idx] || "HOLD";
      next[idx] = curr === "HOLD" ? "CHARGE" : curr === "CHARGE" ? "DISCHARGE" : "HOLD";
      return next;
    });
  };

  const sendToEMS = async () => {
    setSending(true); setSendResult(""); setSendSuccess(false); setSentAt(null);
    try {
      const res = await fetch("http://localhost:5000/api/ems/battery-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "cors",
        body: JSON.stringify({ plan, meta: { chargeLimit, dischargeLimit, aiMode } }),
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

  // Summering (AI)
  const nCharge = plan.filter(x => x.action === "CHARGE").length;
  const nHold = plan.filter(x => x.action === "HOLD").length;
  const nDischarge = plan.filter(x => x.action === "DISCHARGE").length;

  return (
    <div className="rounded-2xl bg-slate-800 p-6 shadow-lg text-white col-span-1 md:col-span-2 xl:col-span-3 mt-2">
      <h3 className="text-lg font-semibold mb-3">
        <span role="img" aria-label="battery">🔋</span> Batteriplan {aiMode ? "(AI-styrd)" : "(Manuell)"}
      </h3>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <label className="text-sm">
          Ladda om pris under:
          <input
            type="number"
            value={chargeLimit}
            onChange={e => setChargeLimit(Number(e.target.value))}
            min="0" max="100" className="ml-2 w-16 bg-slate-700 border border-slate-500 rounded px-2 py-1"
            disabled={!aiMode}
          />
          <span className="ml-1">öre/kWh</span>
        </label>
        <label className="text-sm">
          Urladda om pris över:
          <input
            type="number"
            value={dischargeLimit}
            onChange={e => setDischargeLimit(Number(e.target.value))}
            min="0" max="200" className="ml-2 w-16 bg-slate-700 border border-slate-500 rounded px-2 py-1"
            disabled={!aiMode}
          />
          <span className="ml-1">öre/kWh</span>
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
          <thead className="bg-slate-900 text-slate-300 sticky top-0">
            <tr>
              <th className="text-left p-2">Timme</th>
              <th className="text-left p-2">Pris (öre/kWh)</th>
              <th className="text-left p-2">Åtgärd</th>
            </tr>
          </thead>
          <tbody>
            {plan.map((step, idx) => (
              <tr
                key={step.hour}
                className={
                  step.hour === currentHour
                    ? "animate-pulse bg-blue-950/70"
                    : ""
                }
                onClick={!aiMode ? () => toggleAction(idx) : undefined}
                style={{ cursor: !aiMode ? "pointer" : undefined }}
              >
                <td className="p-2">{step.hour}{step.hour === currentHour && <span className="ml-1 text-blue-400 animate-pulse">⬤</span>}</td>
                <td className="p-2">{step.ore.toFixed(1)}</td>
                <td className={`
                  p-2 font-semibold rounded
                  ${step.action === "CHARGE" ? "text-green-400 bg-green-950" : ""}
                  ${step.action === "DISCHARGE" ? "text-red-400 bg-red-950" : ""}
                  ${step.action === "HOLD" ? "text-yellow-400 bg-yellow-950" : ""}
                `}>
                  {step.action}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-4 mt-2 text-sm p-2">
          <div className="text-green-400">CHARGE: {nCharge}h</div>
          <div className="text-yellow-400">HOLD: {nHold}h</div>
          <div className="text-red-400">DISCHARGE: {nDischarge}h</div>
        </div>
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
  // --- States ---
  const [smhiForecast, setSmhiForecast] = useState([]);
  const [aiMode, setAiMode] = useState(true);
  const [zone, setZone] = useState(() => localStorage.getItem("zone") || "SE3");
  const [priceData, setPriceData] = useState([]);
  const [priceMsg, setPriceMsg] = useState("");
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [walletError, setWalletError] = useState("");
  const [loadingBalance, setLoadingBalance] = useState(false);

  // --- Fetch SMHI ---
  useEffect(() => {
    fetch(`/api/smhi?lat=59.33&lon=18.07`)
      .then(res => res.json())
      .then(data => setSmhiForecast(data.forecast || []));
  }, []);

  // --- Produktion/vind/temp från SMHI ---
  const solproduktion = smhiForecast.length
    ? Math.round(Math.min(10, (smhiForecast[0]?.solar_rad || 0) / 100) * 10) / 10
    : 0;
  const vindproduktion = smhiForecast.length
    ? Math.round((smhiForecast[0]?.wind_speed || 0) * 10) / 10
    : 0;
  const temp = smhiForecast.length
    ? Math.round(smhiForecast[0]?.temp || 0)
    : 0;

  // --- Token från MetaMask ---
  const fetchTokenBalance = useCallback(async () => {
    if (!window.ethereum) {
      setWalletError("MetaMask hittas inte i denna flik.");
      return;
    }
    setWalletError(""); setLoadingBalance(true);
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

  // --- Spotpris ---
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
            hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm"
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

  // === LAYOUT ===
  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 text-white bg-gradient-to-br from-slate-900 to-slate-950 min-h-screen">
      
      {/* Produktion vs Förbrukning – bar-graf med pulserande aktuell timme */}
      <div className="col-span-1 xl:col-span-2 rounded-2xl bg-slate-800 p-4 shadow-lg">
        <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
          <span role="img" aria-label="bolt">⚡</span> Produktion vs Förbrukning
        </h2>
        <div className="flex gap-2 items-end h-36 mt-3">
          {mockData.map((d, i) => {
            // Kolla om detta är nuvarande timme (pulsera)
            const isCurrent =
              new Date().getHours() === Number(d.time.split(":")[0]);
            return (
              <div key={i} className="flex flex-col items-center w-10">
                <div
                  className={`w-4 rounded transition-all duration-300 ${
                    isCurrent
                      ? "animate-pulse outline outline-2 outline-yellow-400"
                      : ""
                  }`}
                  style={{
                    height: `${d.production * 32}px`,
                    background: "#22c55e",
                    marginBottom: "4px",
                  }}
                />
                <div
                  className={`w-4 rounded transition-all duration-300 ${
                    isCurrent
                      ? "animate-pulse outline outline-2 outline-yellow-400"
                      : ""
                  }`}
                  style={{
                    height: `${d.consumption * 32}px`,
                    background: "#ef4444",
                  }}
                />
                <span className="text-xs mt-1">{d.time}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tokenbalans */}
      <div className="rounded-2xl bg-slate-800 p-6 shadow-lg flex flex-col items-center">
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
                alert("Kunde inte lägga till token i MetaMask.");
              }
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
            disabled={!window.ethereum}
            title={!window.ethereum ? "MetaMask krävs" : "Lägg till token i MetaMask"}
          >
            Lägg till i MetaMask
          </button>
        </div>
        {walletError && <p className="mt-2 text-sm text-red-400">{walletError}</p>}
      </div>

      {/* SMHI och NIBE-data */}
      <div className="col-span-1 flex flex-col gap-4">
        <h2 className="text-lg font-bold mb-2">🌦️ Klimatdata & NIBE</h2>
        <SmhiForecastWidget forecast={smhiForecast} />
        <NibeCard />
        <NibeSensorMultiSelector />
        {/* Lägg gärna till fler kort/sensordata här */}
      </div>

      {/* Spotpris-graf */}
      <div className="col-span-1 md:col-span-2 xl:col-span-3 rounded-2xl bg-slate-800 p-6 shadow-lg">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <h3 className="text-lg font-semibold">💡 Spotpris per timme</h3>
          <select
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="bg-slate-700 text-white px-2 py-1 rounded border border-slate-600"
          >
            {["SE1", "SE2", "SE3", "SE4"].map((z) => (
              <option key={z} value={z}>{z}</option>
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
        {/* Här kan du lägga till LineChart eller annan graf för spotpris */}
      </div>

      {/* Toggle AI/manuell batteriplan */}
      <div className="col-span-1 md:col-span-2 xl:col-span-3">
        <button
          onClick={() => setAiMode((v) => !v)}
          className="mb-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded focus:outline-none"
        >
          {aiMode ? "Visa manuell batteriplan" : "Visa batteriplan (AI)"}
        </button>
        <BatteryPlan priceData={priceData} aiMode={aiMode} />
      </div>
    </div>
  );
}
