import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { ZoneProvider } from "@/context/ZoneContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ZoneProvider defaultZone="SE3">
      <App />
    </ZoneProvider>
  </React.StrictMode>
);
