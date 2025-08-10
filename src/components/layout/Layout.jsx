// src/components/layout/Layout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout() {
  const [advanced, setAdvanced] = React.useState(false);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 16 }}>
        <Topbar advanced={advanced} onToggleAdvanced={() => setAdvanced((x) => !x)} />
        <Outlet context={{ advanced, setAdvanced }} />
      </div>
    </div>
  );
}
