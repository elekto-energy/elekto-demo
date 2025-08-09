// src/components/DashboardGrid.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import { ethers } from "ethers";
import BatteryPlan from "./BatteryPlan";
import { NibeSensorMultiSelector } from "./NibeSensorMultiSelector";
import SMHIMetersCard from "./cards/SMHIMetersCard";

<div className="rounded-2xl bg-slate-800 p-6 shadow-lg">
  <h3 className="text-lg font-semibold mb-2">🌤️ SMHI Vind & Sol</h3>
  <SMHIMetersCard lat={59.33} lon={18.07} />
</div>

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

// ==== BatteryPlan-komponent ====

// ==== SLUT på BatteryPlan-komponenten ====


export function DashboardGrid() {
  const [tokenBalance, setTokenBalance] = useState(null);
  const [walletError, setWalletError] = useState("");
  const [loadingBalance, setLoadingBalance] = useState(false);

  const [zone, setZone] = useState(() => localStorage.getItem("zone") || "SE3");
  const [priceData, setPriceData] = useState([]);
  const [priceMsg, setPriceMsg] = useState("");
  const [loadingPrice, setLoadingPrice] = useState(false);

  // ---- Spotpris ----
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
        // Formattera för nya API-fält
        const formatted = data.map((p) => {
          const ts = new Date(p.time_start);
          const hour = ts.toLocaleTimeString("sv-SE", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Stockholm",
          });
          return {
            hour,                                // "HH:mm"
            ore: Number(p.SEK_per_kWh) * 100,    // SEK → öre
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

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  useEffect(() => {
    localStorage.setItem("zone", zone);
  }, [zone]);

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

  // ---- ELEKTO-balans via MetaMask ----
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
            params: [{ chainId: "0x89" }], // Polygon mainnet
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
      try {
        decimals = await token.decimals();
      } catch {}
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

  useEffect(() => {
    fetchTokenBalance();
  }, [fetchTokenBalance]);

  return (
    <div className="col-span-full rounded-2xl bg-slate-800 p-6 shadow-lg">
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
{/* 🌤️ SMHI Vind & Sol */}
<div className="col-span-1 md:col-span-2 xl:col-span-3 rounded-2xl bg-slate-800 p-6 shadow-lg">
  <h3 className="text-lg font-semibold mb-2">🌤️ SMHI Vind & Sol</h3>
  <SMHIMetersCard lat={59.33} lon={18.07} />
</div>
      {/* ---- NibeSensorMultiSelector ---- */}
<div className="col-span-1 md:col-span-2 xl:col-span-3">
  <NibeSensorMultiSelector />
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

            {/* Medellinje */}
            {stats && (
              <ReferenceLine
                y={stats.avg}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
                label={{ value: "Medel", position: "right", fill: "#94a3b8", fontSize: 12 }}
              />
            )}

            {/* Nuvarande timme */}
            {stats && (
              <ReferenceLine
                x={stats.nowH}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                label={{ value: "Nu", position: "insideTop", fill: "#f59e0b", fontSize: 12 }}
              />
            )}

            {/* Min/Max-markeringar */}
            {stats && (
              <>
                <ReferenceDot x={stats.min.hour} y={stats.min.ore} r={5} fill="#22c55e" stroke="none" />
                <ReferenceDot x={stats.max.hour} y={stats.max.ore} r={5} fill="#ef4444" stroke="none" />
              </>
            )}

            {/* Färgkodade punkter */}
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

      {/* Batteriplan – AI/Manuell, fullbredd */}
      <BatteryPlan priceData={priceData} />
    </div>
  );
}
