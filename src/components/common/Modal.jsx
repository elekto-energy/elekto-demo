import React from "react";

export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={backdrop} onClick={onClose}>
      <div style={sheet} className="card-glass" onClick={(e)=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div style={{ fontWeight:700 }}>{title}</div>
          <button className="theme-toggle" onClick={onClose}>Stäng</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const backdrop = {
  position:"fixed", inset:0, background:"rgba(0,0,0,0.35)",
  display:"flex", alignItems:"center", justifyContent:"center", padding:16, zIndex:999
};
const sheet = { width:"min(520px, 96vw)", padding:16, borderRadius:16 };
