import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext({ isDark: true, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("pulsePM_theme");
    return saved ? saved === "dark" : true;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("pulsePM_theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = () => setIsDark(v => !v);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
