import React from "react";
import { ethers } from "ethers";
import cfgJson from "@/utils/elektoConfig.json";

const cfg = cfgJson;

export default function ElektoPage(){
  const [provider, setProvider] = React.useState(null);
  const [signer, setSigner] = React.useState(null);
  const [account, setAccount] = React.useState("");
  const [balance, setBalance] = React.useState("0");
  const [to, setTo] = React.useState("");
  const [amt, setAmt] = React.useState("");
  const [txHash, setTxHash] = React.useState("");
  const [error, setError] = React.useState("");

  const connect = async () => {
    try{
      if(!window.ethereum){
        setError("Installera MetaMask för att använda ELEKTO.");
        return;
      }
      const prov = new ethers.BrowserProvider(window.ethereum);
      const accounts = await prov.send("eth_requestAccounts", []);
      const sig = await prov.getSigner();
      setProvider(prov);
      setSigner(sig);
      setAccount(accounts[0]);
      setError("");
    }catch(e){
      setError(e.message || "Kunde inte ansluta wallet.");
    }
  };

  const loadBalance = React.useCallback(async () => {
    try{
      if(!signer) return;
      const contract = new ethers.Contract(cfg.contractAddress, cfg.abi, signer);
      const user = await signer.getAddress();
      const raw = await contract.balanceOf(user);
      const dec = cfg.decimals ?? 18;
      const human = ethers.formatUnits(raw, dec);
      setBalance(human);
    }catch(e){
      setError("Kunde inte läsa saldo: " + (e.message||e));
    }
  }, [signer]);

  React.useEffect(()=>{ if(signer) loadBalance(); }, [signer, loadBalance]);

  const send = async () => {
    setError(""); setTxHash("");
    try{
      if(!signer) return setError("Anslut din wallet först.");
      const dec = cfg.decimals ?? 18;
      const contract = new ethers.Contract(cfg.contractAddress, cfg.abi, signer);
      const value = ethers.parseUnits(String(amt || "0"), dec);
      const tx = await contract.transfer(to, value);
      setTxHash(tx.hash);
      await tx.wait();
      await loadBalance();
    }catch(e){
      setError("Misslyckades att skicka: " + (e?.shortMessage || e?.message || String(e)));
    }
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(12,1fr)", gap:16 }}>
      <div className="card-glass" style={{ gridColumn:"span 12" }}>
        <div className="section-title">ELEKTO Wallet</div>
        {!account ? (
          <button className="theme-toggle" onClick={connect}>Anslut plånbok</button>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 12 }}>
            <div className="card-glass">
              <div style={{ fontSize:12, opacity:.7 }}>Adress</div>
              <div style={{ fontWeight:700, wordBreak:"break-all" }}>{account}</div>
              <div style={{ marginTop:8, fontSize:12, opacity:.7 }}>Saldo</div>
              <div style={{ fontSize:28, fontWeight:800 }}>{Number(balance).toFixed(4)} <span style={{ fontSize:14, opacity:.8 }}>{cfg.symbol || "ELEKTO"}</span></div>
              <button className="theme-toggle" style={{ marginTop:8 }} onClick={loadBalance}>Uppdatera saldo</button>
            </div>
            <div className="card-glass">
              <div style={{ fontWeight:600, marginBottom:8 }}>Skicka tokens</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:8 }}>
                <input placeholder="Mottagaradress" value={to} onChange={(e)=>setTo(e.target.value)} style={inputStyle} />
                <input placeholder={`Belopp (${cfg.symbol||"ELEKTO"})`} value={amt} onChange={(e)=>setAmt(e.target.value)} style={inputStyle} />
                <button className="theme-toggle" onClick={send}>Skicka</button>
              </div>
              {txHash && <div style={{ fontSize:12, marginTop:8 }}>Tx: <a href={`https://polygonscan.com/tx/${txHash}`} target="_blank" rel="noreferrer">{txHash.slice(0,10)}…</a></div>}
            </div>
          </div>
        )}
        {error && <div style={{ color:"var(--accent-red)", marginTop:8 }}>{error}</div>}
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
