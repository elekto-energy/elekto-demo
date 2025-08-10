// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DarkModeProvider } from "@/context/DarkModeContext";
import Layout from "@/components/layout/Layout";
import DashboardGrid from "@/components/DashboardGrid";
import ProductionPage from "@/pages/ProductionPage";
import BatteryPage from "@/pages/BatteryPage";
import EVChargingPage from "@/pages/EVChargingPage";
import ElektoPage from "@/pages/ElektoPage";
import SettingsPage from "@/pages/SettingsPage";

import "@/styles/theme-light.css";
import "@/styles/theme-dark.css";
import "@/styles/cards.css";

export default function App() {
  return (
    <DarkModeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardGrid />} />
            <Route path="/production" element={<ProductionPage />} />
            <Route path="/battery" element={<BatteryPage />} />
            <Route path="/ev" element={<EVChargingPage />} />
            <Route path="/elekto" element={<ElektoPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DarkModeProvider>
  );
}
