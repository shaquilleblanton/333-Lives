import { createContext, useContext, useEffect, useState } from "react";

export type AppTheme = "midnight" | "charcoal" | "ivory" | "navy" | "forest" | "dusk";

export const THEMES: { id: AppTheme; label: string; description: string; preview: [string, string, string] }[] = [
  { id: "charcoal", label: "Charcoal", description: "Warm deep charcoal with copper gold", preview: ["#1C1C1E", "#BB734A", "#F7F4EF"] },
  { id: "midnight", label: "Midnight", description: "Lifted dark with warm copper", preview: ["#262628", "#BB734A", "#F7F4EF"] },
  { id: "ivory", label: "Ivory", description: "Warm light luxury with gold accents", preview: ["#F7F4EF", "#9A6130", "#1C1C1E"] },
  { id: "navy", label: "Deep Navy", description: "Ocean depth with gold", preview: ["#0D1B2A", "#C8A96E", "#EEE8DC"] },
  { id: "forest", label: "Forest", description: "Dark green sanctum with gold", preview: ["#0E1A10", "#C4A456", "#EBE8DC"] },
  { id: "dusk", label: "Dusk", description: "Deep plum twilight with rose gold", preview: ["#1A0F1E", "#C4826A", "#F0EAF4"] },
];

interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "charcoal", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    return (localStorage.getItem("333lives-theme") as AppTheme) || "charcoal";
  });

  function setTheme(t: AppTheme) {
    setThemeState(t);
    localStorage.setItem("333lives-theme", t);
  }

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div data-theme={theme} className="contents">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
