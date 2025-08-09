import React from "react";

export function ImpactWidget({
  ownProduction = 12.5,    // Dagens egenproduktion (kWh)
  gridCO2 = 42,            // CO₂ per kWh i gram
  spot = 38,               // Spotpris idag (öre/kWh)
  transfer = 42,           // Elöverföring (öre/kWh)
  tax = 39.2,              // Energiskatt (öre/kWh)
  surcharge = 4,           // Påslag elbolag (öre/kWh)
  vat = 0.25,              // Moms (25%)
  period = "idag",         // "idag", "månad", "år"
}) {
  const totalOres = (spot + transfer + tax + surcharge) * (1 + vat);
  const savedSEK = ownProduction * totalOres / 100; // SEK
  const savedCO2 = ownProduction * gridCO2 / 1000;  // kg

  return (
    <div className="rounded-2xl bg-slate-700/80 shadow-xl flex flex-col items-center p-6 mb-4 max-w-xs mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-green-400 text-3xl font-extrabold">{savedCO2.toFixed(2)} kg</span>
        <span className="text-lg text-slate-300">CO₂</span>
      </div>
      <div className="text-base text-slate-400 mb-4">
        sparat {period === "idag" ? "idag" : period}
      </div>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-yellow-400 text-3xl font-extrabold">{savedSEK.toFixed(2)} kr</span>
        <span className="text-lg text-slate-300">/ {period}</span>
      </div>
      <div className="text-xs text-slate-400">
        *Inkl alla avgifter, energiskatt & moms!
      </div>
      <div className="mt-4 w-full text-center text-xs text-slate-500">
        Egen produktion: <span className="font-semibold">{ownProduction} kWh</span><br/>
        Elmix: {gridCO2} g CO₂/kWh
      </div>
    </div>
  );
}
