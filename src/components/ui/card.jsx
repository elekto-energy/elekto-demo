// src/components/ui/card.jsx
import React from "react";

export function Card({ title, icon: Icon, onClick, children, className }) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-2xl shadow-md p-6 bg-white hover:shadow-xl transition-all ${className || ""}`}
    >
      {Icon && <Icon className="w-6 h-6 mb-2 text-yellow-500" />}
      <h2 className="text-lg font-semibold mb-1">{title}</h2>
      <div className="text-sm text-gray-600">{children}</div>
    </div>
  );
}
