// src/components/layout/Layout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { ZoneProvider } from "@/context/ZoneContext";

export default function Layout() {
  const [advanced, setAdvanced] = React.useState(false);

  return (
    <ZoneProvider defaultZone="SE3">
      {/* Fast vänstermeny (klass "sidebar" styrs i index.css) */}
      <Sidebar />

      {/* Allt innehåll offsettas av .content-with-fixed-sidebar (margin-left: 16rem) */}
      <main className="content-with-fixed-sidebar min-h-screen">
        {/* Topbar ligger över innehållet men under menyn */}
        <div className="sticky top-0 z-[2] bg-background/80 backdrop-blur p-4">
          <Topbar
            advanced={advanced}
            onToggleAdvanced={() => setAdvanced((x) => !x)}
          />
        </div>

        {/* Sida/innehåll */}
        <div className="p-4">
          <Outlet context={{ advanced, setAdvanced }} />
        </div>
      </main>
    </ZoneProvider>
  );
}
