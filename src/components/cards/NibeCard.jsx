import React from "react";
export function NibeCard({ title, value, icon }) {
  return (
    <div className="flex flex-col items-center justify-center bg-slate-800 rounded-2xl shadow-lg p-6 min-w-[130px]">
      <div className="text-3xl mb-1">{icon}</div>
      <div className="text-lg font-semibold">{title}</div>
      <div className="text-xl text-sky-400 font-bold">{value}</div>
    </div>
  );
}
