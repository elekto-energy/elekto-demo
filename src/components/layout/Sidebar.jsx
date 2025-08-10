// src/components/layout/Sidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Activity, BatteryFull, Plug, Coins, Settings, SendHorizontal } from "lucide-react";
import Modal from "@/components/common/Modal";
import { ensureWallet, getBalance, sendTokens } from "@/utils/elekto";
import cfg from "@/utils/elektoConfig.json";

const linkStyle = ({ isActive }) => ({
  textDecoration: "none",
  color: "var(--text-color)",
  background: isActive ? "var(--card-bg)" : "transparent",
  border: `1px solid var(--card-border)`,
  padding: "10px 12px",
  borderRadius: 14,
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontWeight: 600,
});

export default function Sidebar() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [account, setAccount] = React.useState("");
  const [balance, setBalance] = React.useState(0);
  const [to, setTo] = React.useState("");
  const [amt, setAmt] = React.useState("");
  const [tx, setTx] = React.useState("");
  const [error, setError] = React.useState("");

  const openModal = async () => {
    setOpen(true);
    setError(""); setTx("");
    try {
      const { signer, account: acc } = await ensureWallet();
      setAccount(acc || "");
      const bal = await getBalance(signer);
      setBalance(bal);
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const doSend = async () => {
    setLoading(true); setError(""); setTx("");
    try {
      const { signer } = await ensureWallet();
      const res = await sendTokens({ signer, to, amount: amt });
      setTx(res.hash || "");
      const bal = await getBalance(signer);
      setBalance(bal);
      setAmt(""); setTo("");
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ opacity: 0.7, marginBottom: 6 }}>Meny</div>
      <NavLink style={linkStyle} to="/"><Home size={16}/> Dashboard</NavLink>
      <NavLink style={linkStyle} to="/production"><Activity size={16}/> Produktion & Förbrukning</NavLink>
      <NavLink style={linkStyle} to="/battery"><BatteryFull size={16}/> Batteri</NavLink>
      <NavLink style={linkStyle} to="/ev"><Plug size={16}/> EV-laddning</NavLink>
      <NavLink style={linkStyle} to="/elekto"><Coins size={16}/> ELEKTO</NavLink>
      <NavLink style={linkStyle} to="/settings"><Settings size={16}/> Inställningar</NavLink>

      <div style={{ height: 1, background:"var(--card-border)", margin:"8px 0" }} />
      <button className="theme-toggle" onClick={openModal} style={{ display:"flex", alignItems:"center", gap:8 }}>
        <SendHorizontal size={16}/> Skicka ELEKTO
      </button>

      <Modal open={open} onClose={()=>setOpen(false)} title="Skicka ELEKTO">
        <div style={{ display:"grid", gridTemplateColumns:"1fr", gap: 8 }}>
          <div style={{ fontSize:12, opacity:.7 }}>Konto</div>
          <div style={{ fontSize:12, wordBreak:"break-all" }}>{account || (cfg.mock ? "MOCK-LÄGE" : "—")}</div>

          <div style={{ fontSize:12, opacity:.7, marginTop:6 }}>Saldo</div>
          <div style={{ fontWeight:700 }}>{Number(balance).toFixed(4)} {cfg.symbol}</div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr", gap: 8, marginTop:8 }}>
            <input placeholder="Mottagaradress" value={to} onChange={(e)=>setTo(e.target.value)}
                   style={inputStyle} />
            <input placeholder={`Belopp (${cfg.symbol})`} value={amt} onChange={(e)=>setAmt(e.target.value)}
                   style={inputStyle} />
            <button className="theme-toggle" disabled={loading} onClick={doSend}>
              {loading ? "Skickar…" : "Skicka"}
            </button>
          </div>
          {tx && <div style={{ fontSize:12, marginTop:8 }}>Tx: {tx}</div>}
          {error && <div style={{ color:"var(--accent-red)", marginTop:8 }}>{error}</div>}
          {cfg.mock && <div style={{ fontSize:12, opacity:.7, marginTop:8 }}>Mock-läge är PÅ – transaktioner sker endast lokalt.</div>}
        </div>
      </Modal>
    </aside>
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
