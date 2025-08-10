import React, { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE } from "@/utils/apiBase";

export default function CommunitySharingCard() {
  const [houses, setHouses] = useState([
    mkHouse("Hus A"),
    mkHouse("Hus B"),
    mkHouse("Hus C"),
  ]);
  const [history, setHistory] = useState([]);
  const [autoShare, setAutoShare] = useState(true);
  const [advanced, setAdvanced] = useState(true);
  const [refreshSec, setRefreshSec] = useState(10);
  const timerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE}/community/house-stats`).then(async (r) => {
      const js = await r.json();
      if (!mounted) return;
      if (Array.isArray(js) && js.length >= 3) {
        setHouses(js.map((h, i) => ({
          name: h.name || ["Hus A","Hus B","Hus C"][i],
          prodKW: num(h.prodKW, 2), consKW: num(h.consKW, 2),
          soc: clamp(num(h.soc, 60), 0, 100),
          balance: num(h.balance, 10),
        })));
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setHouses(prev => {
        const upd = prev.map(h => randomDrift(h));
        if (autoShare) {
          return runAutoShare(upd, appendHistory);
        }
        return upd;
      });
    }, refreshSec * 1000);
    return () => clearInterval(timerRef.current);
  }, [autoShare, refreshSec]);

  const totals = useMemo(() => {
    const p = houses.reduce((a,b)=>a+b.prodKW,0);
    const c = houses.reduce((a,b)=>a+b.consKW,0);
    const bal = houses.reduce((a,b)=>a+b.balance,0);
    return { p: round1(p), c: round1(c), bal: round1(bal) };
  }, [houses]);

  function appendHistory(item) {
    setHistory(h => [item, ...h].slice(0, 50));
  }

  const [fromIdx, setFromIdx] = useState(0);
  const [toIdx, setToIdx] = useState(1);
  const [amt, setAmt] = useState("1");

  const canSend = useMemo(() => {
    if (fromIdx === toIdx) return false;
    const a = parseFloat(amt || "0");
    return a > 0 && a <= (houses[fromIdx]?.balance ?? 0);
  }, [fromIdx, toIdx, amt, houses]);

  const doManualSend = async () => {
    if (!canSend) return;
    const amount = parseFloat(amt);
    try {
      await fetch(`${API_BASE}/elekto/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: houses[fromIdx].name,
          to: houses[toIdx].name,
          amount
        })
      });
    } catch(e) {}
    setHouses(prev => {
      const h = prev.map(x => ({...x}));
      h[fromIdx].balance = round3(h[fromIdx].balance - amount);
      h[toIdx].balance = round3(h[toIdx].balance + amount);
      return h;
    });
    appendHistory({ ts: new Date().toISOString(), from: houses[fromIdx].name, to: houses[toIdx].name, amount });
    setAmt("");
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 8 }}>
        <div style={{ fontWeight: 600 }}>Energidelning i community</div>
        <div style={{ display:"flex", gap: 10, alignItems:"center" }}>
          <label style={{ fontSize: 12, opacity: 0.8 }}>
            Auto-dela
            <input type="checkbox" checked={autoShare} onChange={(e)=>setAutoShare(e.target.checked)} style={{ marginLeft: 6 }} />
          </label>
          <label style={{ fontSize: 12, opacity: 0.8 }}>
            Uppdatering
            <select value={refreshSec} onChange={(e)=>setRefreshSec(parseInt(e.target.value))} style={ddStyle}>
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={15}>15s</option>
            </select>
          </label>
          <button className="theme-toggle" onClick={()=>setAdvanced(a=>!a)}>{advanced ? "Enkel" : "Avancerad"}</button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap: 12 }}>
        {houses.map((h, i) => (
          <div key={i} className="card-glass" style={{ padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{h.name}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 8 }}>
              <MiniStat label="Produktion" value={`${h.prodKW.toFixed(1)} kW`} dot="dot-green" />
              <MiniStat label="Förbrukning" value={`${h.consKW.toFixed(1)} kW`} dot="dot-red" />
              <MiniSOC soc={h.soc} />
              <MiniStat label="ELEKTO" value={`${h.balance.toFixed(2)} kWh`} dot="dot-blue" />
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        {advanced ? <ArrowsView houses={houses} /> : <SimpleHint />}
      </div>

      <div className="card-glass" style={{ marginTop: 12, padding: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Manuell delning</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 140px auto", gap: 8 }}>
          <select value={fromIdx} onChange={(e)=>setFromIdx(parseInt(e.target.value))} style={ddStyle}>
            {houses.map((h,i)=>(<option key={i} value={i}>{h.name}</option>))}
          </select>
          <select value={toIdx} onChange={(e)=>setToIdx(parseInt(e.target.value))} style={ddStyle}>
            {houses.map((h,i)=>(<option key={i} value={i}>{h.name}</option>))}
          </select>
          <input
            placeholder="kWh"
            value={amt}
            onChange={(e)=>setAmt(e.target.value)}
            style={inputStyle}
          />
          <button className="theme-toggle" onClick={doManualSend} disabled={!canSend} style={{ opacity: canSend ? 1 : 0.5 }}>Skicka</button>
        </div>
      </div>

      <div className="card-glass" style={{ marginTop: 12, padding: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Delningshistorik</div>
        <div style={{ maxHeight: 180, overflowY: "auto" }}>
          {history.length == 0 ? (
            <div style={{ opacity: 0.7, fontSize: 12 }}>Inga transaktioner ännu.</div>
          ) : (
            <table style={{ width:"100%", fontSize: 12 }}>
              <thead>
                <tr style={{ textAlign:"left", opacity:0.7 }}>
                  <th>Tid</th><th>Från</th><th>Till</th><th>kWh</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row, idx)=>(
                  <tr key={idx}>
                    <td>{fmtTime(row.ts)}</td>
                    <td>{row.from}</td>
                    <td>{row.to}</td>
                    <td style={{ textAlign:"right" }}>{row.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, dot }) {
  return (
    <div className="stat" style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <span style={{ display:"inline-flex", alignItems:"center", gap:8 }}>
        <span className={`badge-dot ${dot}`} />
        <span style={{ opacity: 0.8 }}>{label}</span>
      </span>
      <b>{value}</b>
    </div>
  );
}

function MiniSOC({ soc }) {
  return (
    <div className="stat" style={{ padding: 10 }}>
      <div style={{ opacity:0.8, marginBottom:6 }}>Batteri</div>
      <div style={{ position:"relative", height:10, background:"rgba(0,0,0,0.08)", borderRadius:999, overflow:"hidden", border:"1px solid var(--card-border)" }}>
        <div style={{
          position:"absolute", left:0, top:0, bottom:0, width:`${clamp(soc,0,100)}%`,
          background: socColor(soc), transition:"width .4s ease"
        }} />
      </div>
      <div style={{ textAlign:"right", fontWeight:700, marginTop: 6 }}>{Math.round(soc)}%</div>
    </div>
  );
}

function SimpleHint() {
  return (
    <div className="card-glass" style={{ padding: 12, fontSize: 12, opacity: 0.8 }}>
      Avancerad vy visar energiflöden mellan husen med proportionella pilar.
    </div>
  );
}

function ArrowsView({ houses }) {
  const surplus = houses.map(h => ({ name: h.name, val: round1(h.prodKW - h.consKW) }));
  const givers = surplus.filter(s => s.val > 0);
  const takers = surplus.filter(s => s.val < 0);

  const rows = [];
  givers.forEach(g => {
    takers.forEach(t => {
      if (g.val <= 0) return;
      const share = Math.min(g.val, Math.abs(t.val));
      if (share > 0) {
        rows.push({ from: g.name, to: t.name, kW: round1(share) });
        g.val -= share;
        t.val += share;
      }
    });
  });

  if (rows.length === 0) {
    return <div className="card-glass" style={{ padding: 12, fontSize: 12, opacity: 0.8 }}>Inga flöden mellan husen just nu.</div>;
  }

  return (
    <div className="card-glass" style={{ padding: 12 }}>
      {rows.map((r, i)=>(
        <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 80px 1fr 60px", alignItems:"center", gap: 8, margin: "6px 0" }}>
          <div style={{ textAlign:"right" }}>{r.from}</div>
          <Arrow />
          <div>{r.to}</div>
          <div style={{ textAlign:"right", fontWeight:700 }}>{r.kW.toFixed(1)} kW</div>
        </div>
      ))}
    </div>
  );
}

function Arrow() {
  return (
    <svg width="80" height="10" viewBox="0 0 80 10">
      <line x1="0" y1="5" x2="70" y2="5" stroke="var(--text-color)" strokeWidth="2" />
      <polygon points="70,0 80,5 70,10" fill="var(--text-color)" />
    </svg>
  );
}

function mkHouse(name) {
  return {
    name,
    prodKW: round1(2 + Math.random()*4),
    consKW: round1(2 + Math.random()*3),
    soc: clamp(40 + Math.random()*40, 0, 100),
    balance: round3(10 + Math.random()*10)
  };
}
function randomDrift(h) {
  const prod = clamp(h.prodKW + (Math.random()*0.6 - 0.3), 0, 8);
  const cons = clamp(h.consKW + (Math.random()*0.6 - 0.3), 0, 8);
  const net = prod - cons;
  const soc = clamp(h.soc + net * 0.4, 0, 100);
  return { ...h, prodKW: round1(prod), consKW: round1(cons), soc: Math.round(soc) };
}
function runAutoShare(arr, onTx) {
  const givers = arr.filter(h => h.prodKW > h.consKW);
  const takers = arr.filter(h => h.prodKW < h.consKW);
  givers.forEach(g => {
    let surplusKW = g.prodKW - g.consKW;
    let alloc = surplusKW * 0.1;
    takers.forEach(t => {
      if (alloc <= 0) return;
      const need = (t.consKW - t.prodKW) * 0.1;
      const send = Math.max(0, Math.min(alloc, need));
      if (send > 0) {
        g.balance = round3(g.balance - send);
        t.balance = round3(t.balance + send);
        alloc -= send;
        onTx?.({ ts: new Date().toISOString(), from: g.name, to: t.name, amount: send });
      }
    });
  });
  return arr.map(x => ({...x}));
}
function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }
function num(x, d=2){ const n = Number(x); return Number.isFinite(n) ? +n.toFixed(d) : 0; }
function round1(x){ return Math.round(x*10)/10; }
function round3(x){ return Math.round(x*1000)/1000; }
function socColor(s){
  if (s >= 66) return "var(--accent-green)";
  if (s >= 33) return "var(--accent-yellow)";
  return "var(--accent-red)";
}
function fmtTime(ts){
  try { return new Date(ts).toLocaleTimeString(); } catch(e){ return ts; }
}
const inputStyle = {
  width:"100%",
  padding:"10px 12px",
  borderRadius:10,
  border:"1px solid var(--card-border)",
  background:"var(--card-bg)",
  color:"var(--text-color)",
  outline:"none"
};
const ddStyle = {
  ...inputStyle,
  padding: "8px 10px"
};
