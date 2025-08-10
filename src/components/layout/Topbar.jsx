// src/components/layout/Topbar.jsx
import React from "react";
import { useDarkMode } from "@/context/DarkModeContext";
import { Moon, Sun, SlidersHorizontal } from "lucide-react";

export default function Topbar({ advanced, onToggleAdvanced }) {
  const { darkMode, setDarkMode } = useDarkMode();
  return (
    <div className="card-glass" style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <div style={{ display:"flex", alignItems:"center", gap: 12 }}>
        <div style={{ fontWeight: 800, letterSpacing: .3 }}>ELEKTO EMS</div>
        <div style={{ opacity: 0.6 }}>Översikt</div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap: 8 }}>
        <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)} title={darkMode ? "Ljust läge" : "Mörkt läge"}>
          {darkMode ? <Sun size={18}/> : <Moon size={18}/>}
        </button>
        <button className="theme-toggle" onClick={onToggleAdvanced} title="Växla avancerat läge">
          <SlidersHorizontal size={18}/>
          <span style={{ marginLeft: 6, fontSize: 12 }}>{advanced ? "Avancerat: PÅ" : "Avancerat: AV"}</span>
        </button>
      </div>
    </div>
  );
}
