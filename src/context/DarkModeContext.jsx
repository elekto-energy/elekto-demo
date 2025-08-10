// src/context/DarkModeContext.jsx
import React, { createContext, useState, useContext, useEffect } from "react";

// Skapa Context
const DarkModeContext = createContext();

// Provider-komponent
export function DarkModeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);

  // Ladda sparat läge från localStorage vid start
  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode !== null) {
      setDarkMode(savedMode === "true");
    }
  }, []);

  // Spara läget när det ändras
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <DarkModeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}

// Hook för enkel användning i komponenter
export function useDarkMode() {
  return useContext(DarkModeContext);
}
