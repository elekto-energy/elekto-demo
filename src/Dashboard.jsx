// src/dashbord.jsx
import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ethers } from "ethers";

// Byt till <div> om du saknar shadcn/ui
import { Card, CardContent } from "@/components/ui/card"; 

// --- Konstanter ---
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
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const Y = fmt.find(p => p.type === "year").value;
  const M = fmt.find(p => p.type === "month").value;
  const D = fmt.find(p => p.type === "day").value;
  return { Y, M, D };
}

// Dummydata (din befintliga)
const mockData = [
  { time: "08:00", production: 1.2, consumption: 0.8 },
  { time: "09:00", production: 1.8, consumption: 1.0 },
  { time: "10:00", production: 2.6, consumption: 1.6 },
  { time: "11:00", production: 3.4, consumption: 2.1 },
  { time: "12:00", production: 3.8, consumption: 2.9 },
  { time: "13:00", production: 3.2, consumption: 3.1 },
  { time: "14:00", production: 2.4, consumption: 3.0 },
];

export default function Dashboard() {
  const [battery] = useState(78);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [walletError, setWalletError] = useState("");

  // Spotpris-state
  const [zone, setZone] = useState(() => localStorage.getItem("zone") || "SE3");
  const [priceData, setPriceData] = useState([]);
  const [priceMsg, setPriceMsg] = useState("");
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // ---- Spotpris ----
  const fetchPrices = useCallback(async (z = zone, attempt = 0, targetDate = new Date()) => {
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
      // SEK/kWh → öre/kWh
      const formatted = data.map(p => ({ hour: p.hour, ore: Number(p.value) * 100 }));
      setPriceData(formatted);
      setPriceMsg("");
    } catch (e) {
      setPriceMsg(`Fel vid hämtning: ${e.message}`);
      setPriceData([]);
    } finally {
      setLoadingPrice(false);
    }
  }, [zone]);

  useEffect(() => { fetchPrices(); }, [fetchPrices]);
  useEffect(() => { localStorage.setItem("zone", zone); }, [zone]);

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
      if (network.chainId !== 137n) { // Polygon mainnet
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x89" }],
          });
        } catch (err) {
          if (err.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: "0x89",
                chainName: "Polygon Mainnet",
                nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
                rpcUrls: ["https://polygon-rpc.com/"],
                blockExplorerUrls: ["https://polygonscan.com/"],
              }],
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
      const formatted = ethers.formatUnits(raw, decimals);

      setTokenBalance(formatted);
    } catch (e) {
      setWalletError(e?.message || "Kunde inte läsa tokenbalans.");
      setTokenBalance(null);
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  useEffect(() => { fetchTokenBalance(); }, [fetchTokenBalance]);

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* Produktion vs Förbrukning */}
      <Card className="col-span-1 xl:col-span-2">
        <CardContent className="p-4">
          <h2 className="text-xl font-bold mb-2">⚡ Produktion vs Förbrukning</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={mockData}>
              <XAxis dataKey="time" />
              <YAxis unit=" kWh" />
              <Tooltip />
              <Line type="monotone" dataKey="production" stroke="#10b981" name="Produktion" />
              <Line type="monotone" dataKey="consumption" stroke="#ef4444" name="Förbrukning" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Batteri */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-2">🔋 Batterinivå</h3>
          <div className="text-4xl font-bold text-green-500">{battery}%</div>
        </CardContent>
      </Card>

      {/* Tokenbalans (MetaMask) */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-2">⚙️ Tokenbalans</h3>
          <div className="text-4xl font-bold text-yellow-500">
            {tokenBalance === null ? "—" :
              new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 6 })
                .format(Number(tokenBalance))}{" "}
            {ELEKTO_TOKEN_SYMBOL}
          </div>
          <button
            onClick={fetchTokenBalance}
            disabled={loadingBalance}
            className="mt-3 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
          >
            {loadingBalance ? "Laddar..." : "Uppdatera balans"}
          </button>
          {walletError && <p className="mt-2 text-sm text-red-500">{walletError}</p>}
        </CardContent>
      </Card>

      {/* Spotpris */}
      <Card className="col-span-1 md:col-span-2 xl:col-span-3">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-lg font-semibold">💡 Spotpris per timme</h3>
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-600"
            >
              {["SE1","SE2","SE3","SE4"].map(z => <option key={z} value={z}>{z}</option>)}
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

          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={priceData}>
              <XAxis dataKey="hour" />
              <YAxis unit=" öre/kWh" />
              <Tooltip formatter={(v) => `${Number(v).toFixed(0)} öre/kWh`} />
              <Line type="monotone" dataKey="ore" stroke="#60a5fa" name="Spotpris" dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
