// src/components/layout/Sidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import {
  Home, Activity, BatteryFull, Plug, Coins, Settings, SendHorizontal
} from "lucide-react";
import Modal from "@/components/common/Modal";
import { ensureWallet, getBalance, sendTokens } from "@/utils/elekto";
import cfg from "@/utils/elektoConfig.json";

const linkClass = ({ isActive }) =>
  [
    "no-underline rounded-xl border px-3 py-2 flex items-center gap-2 font-semibold transition",
    "border-border",
    isActive
      ? "bg-card text-foreground shadow-sm"
      : "bg-transparent hover:bg-accent hover:text-accent-foreground",
  ].join(" ");

export default function Sidebar({ open = false }) {
  // modal-state döps om för att inte krocka med prop 'open'
  const [modalOpen, setModalOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [account, setAccount] = React.useState("");
  const [balance, setBalance] = React.useState(0);
  const [to, setTo] = React.useState("");
  const [amt, setAmt] = React.useState("");
  const [tx, setTx] = React.useState("");
  const [error, setError] = React.useState("");

  const openModal = async () => {
    setModalOpen(true);
    setError(""); setTx("");
    try {
      const { signer, account: acc } = await ensureWallet();
      setAccount(acc || "");
      const bal = await getBalance(signer);
      setBalance(bal);
    } catch (e) {
      setError(e?.message || String(e));
    }
  };

  const doSend = async () => {
    setLoading(true); setError(""); setTx("");
    try {
      const { signer } = await ensureWallet();
      const res = await sendTokens({ signer, to, amount: amt });
      setTx(res?.hash || "");
      const bal = await getBalance(signer);
      setBalance(bal);
      setAmt(""); setTo("");
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    // Nytt: togglar 'sidebar--open' för mobil (matchar index.css)
    <aside className={`sidebar ${open ? "sidebar--open" : ""} w-64 shrink-0 p-4 flex flex-col gap-3`}>
      <div className="text-sm text-muted-foreground mb-1">Meny</div>

      <NavLink className={linkClass} to="/">
        <Home className="w-4 h-4" /> Dashboard
      </NavLink>
      <NavLink className={linkClass} to="/production">
        <Activity className="w-4 h-4" /> Produktion &amp; Förbrukning
      </NavLink>
      <NavLink className={linkClass} to="/battery">
        <BatteryFull className="w-4 h-4" /> Batteri
      </NavLink>
      <NavLink className={linkClass} to="/ev">
        <Plug className="w-4 h-4" /> EV-laddning
      </NavLink>
      <NavLink className={linkClass} to="/elekto">
        <Coins className="w-4 h-4" /> ELEKTO
      </NavLink>
      <NavLink className={linkClass} to="/settings">
        <Settings className="w-4 h-4" /> Inställningar
      </NavLink>

      <div className="h-px bg-border my-1" />

      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 font-medium
                   bg-secondary text-secondary-foreground hover:bg-secondary/80 transition"
      >
        <SendHorizontal className="w-4 h-4" /> Skicka ELEKTO
      </button>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Skicka ELEKTO">
        <div className="grid gap-2">
          <div className="text-xs text-muted-foreground">Konto</div>
          <div className="text-xs break-all">
            {account || (cfg?.mock ? "MOCK-LÄGE" : "—")}
          </div>

          <div className="text-xs text-muted-foreground mt-2">Saldo</div>
          <div className="font-semibold">
            {Number(balance || 0).toFixed(4)} {cfg?.symbol}
          </div>

          <div className="grid gap-2 mt-2">
            <input
              placeholder="Mottagaradress"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 outline-none"
            />
            <input
              placeholder={`Belopp (${cfg?.symbol})`}
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
              className="w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 outline-none"
            />
            <button
              type="button"
              disabled={loading}
              onClick={doSend}
              className="inline-flex justify-center rounded-lg px-3 py-2
                         bg-primary text-primary-foreground hover:opacity-90 transition disabled:opacity-60"
            >
              {loading ? "Skickar…" : "Skicka"}
            </button>
          </div>

          {tx && <div className="text-xs mt-2">Tx: {tx}</div>}
          {error && <div className="text-xs mt-2 text-red-500">{error}</div>}
          {cfg?.mock && (
            <div className="text-xs text-muted-foreground mt-2">
              Mock-läge är PÅ – transaktioner sker endast lokalt.
            </div>
          )}
        </div>
      </Modal>
    </aside>
  );
}
