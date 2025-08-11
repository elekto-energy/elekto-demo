// src/context/ZoneContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export const ZONES = ["SE1", "SE2", "SE3", "SE4"];
const ZoneCtx = createContext({ zone: "SE3", setZone: () => {} });

export function ZoneProvider({ children, defaultZone = "SE3" }) {
  const getInit = () => {
    try {
      const url = new URL(window.location.href);
      const q = (url.searchParams.get("zone") || "").toUpperCase();
      if (ZONES.includes(q)) return q;

      const ls = (localStorage.getItem("elekto_zone") || "").toUpperCase();
      if (ZONES.includes(ls)) return ls;
    } catch {
      /* SSR/No window */
    }
    return ZONES.includes(defaultZone) ? defaultZone : "SE3";
  };

  const [zone, setZoneState] = useState(getInit);

  const setZone = (z) => {
    const nz = (z || "").toUpperCase();
    if (!ZONES.includes(nz)) return;
    setZoneState(nz);
    try {
      localStorage.setItem("elekto_zone", nz);
      const url = new URL(window.location.href);
      url.searchParams.set("zone", nz);
      window.history.replaceState(null, "", url.toString());
    } catch {}
  };

  // Håll URL och state i sync (back/forward + andra flikar)
  useEffect(() => {
    const onPop = () => {
      try {
        const url = new URL(window.location.href);
        const q = (url.searchParams.get("zone") || "").toUpperCase();
        if (ZONES.includes(q)) setZoneState(q);
      } catch {}
    };
    const onStorage = (e) => {
      if (e.key === "elekto_zone" && ZONES.includes((e.newValue || "").toUpperCase())) {
        setZoneState((e.newValue || "SE3").toUpperCase());
      }
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const value = useMemo(() => ({ zone, setZone, ZONES }), [zone]);
  return <ZoneCtx.Provider value={value}>{children}</ZoneCtx.Provider>;
}

export const useZone = () => useContext(ZoneCtx);
