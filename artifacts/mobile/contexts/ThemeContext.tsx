import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type AppTheme = "midnight" | "charcoal" | "ivory" | "navy" | "forest" | "dusk";

export interface ThemePalette {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  text: string;
  tint: string;
  radius: number;
}

export const THEMES: { id: AppTheme; label: string; description: string; preview: [string, string, string] }[] = [
  { id: "charcoal", label: "Charcoal",   description: "Warm deep charcoal with copper gold",  preview: ["#1C1C1E", "#C9A439", "#F7F4EF"] },
  { id: "midnight", label: "Midnight",   description: "Lifted dark with warm copper",          preview: ["#262628", "#C9A439", "#F7F4EF"] },
  { id: "ivory",    label: "Ivory",      description: "Warm light luxury with gold accents",   preview: ["#F7F4EF", "#9A6130", "#1C1C1E"] },
  { id: "navy",     label: "Deep Navy",  description: "Ocean depth with gold",                 preview: ["#0D1B2A", "#C8A96E", "#EEE8DC"] },
  { id: "forest",   label: "Forest",     description: "Dark green sanctum with gold",          preview: ["#0E1A10", "#C4A456", "#EBE8DC"] },
  { id: "dusk",     label: "Dusk",       description: "Deep plum twilight with rose gold",     preview: ["#1A0F1E", "#C4826A", "#F0EAF4"] },
];

export const THEME_PALETTES: Record<AppTheme, ThemePalette> = {
  charcoal: {
    background: "#191919", foreground: "#F7F4EF",
    card: "#1F1F23", cardForeground: "#F7F4EF",
    primary: "#C9A439", primaryForeground: "#191919",
    secondary: "#8FA67A", secondaryForeground: "#191919",
    muted: "#2B2B30", mutedForeground: "#A9A29A",
    accent: "#C8B57C", accentForeground: "#191919",
    destructive: "#7F1D1D", destructiveForeground: "#F7F4EF",
    border: "#2B2B30", input: "#2B2B30",
    text: "#F7F4EF", tint: "#C9A439", radius: 8,
  },
  midnight: {
    background: "#262628", foreground: "#F7F4EF",
    card: "#2E2E32", cardForeground: "#F7F4EF",
    primary: "#C9A439", primaryForeground: "#1A1A1A",
    secondary: "#8FA67A", secondaryForeground: "#1A1A1A",
    muted: "#3A3A40", mutedForeground: "#A9A29A",
    accent: "#C8B57C", accentForeground: "#1A1A1A",
    destructive: "#7F1D1D", destructiveForeground: "#F7F4EF",
    border: "#3A3A40", input: "#3A3A40",
    text: "#F7F4EF", tint: "#C9A439", radius: 8,
  },
  ivory: {
    background: "#F7F4EF", foreground: "#1C1C1E",
    card: "#EEEAE3", cardForeground: "#1C1C1E",
    primary: "#9A6130", primaryForeground: "#F7F4EF",
    secondary: "#6B8F5E", secondaryForeground: "#F7F4EF",
    muted: "#E0DAD0", mutedForeground: "#7A746C",
    accent: "#B8902A", accentForeground: "#F7F4EF",
    destructive: "#DC2626", destructiveForeground: "#F7F4EF",
    border: "#D9D2C8", input: "#D9D2C8",
    text: "#1C1C1E", tint: "#9A6130", radius: 8,
  },
  navy: {
    background: "#0D1B2A", foreground: "#EEE8DC",
    card: "#152538", cardForeground: "#EEE8DC",
    primary: "#C8A96E", primaryForeground: "#0D1B2A",
    secondary: "#7A9E8A", secondaryForeground: "#0D1B2A",
    muted: "#1E3044", mutedForeground: "#9A9288",
    accent: "#C8A96E", accentForeground: "#0D1B2A",
    destructive: "#7F1D1D", destructiveForeground: "#EEE8DC",
    border: "#1E3044", input: "#1E3044",
    text: "#EEE8DC", tint: "#C8A96E", radius: 8,
  },
  forest: {
    background: "#0E1A10", foreground: "#EBE8DC",
    card: "#162018", cardForeground: "#EBE8DC",
    primary: "#C4A456", primaryForeground: "#0E1A10",
    secondary: "#6B9E78", secondaryForeground: "#0E1A10",
    muted: "#1E2E20", mutedForeground: "#8E8880",
    accent: "#C4A456", accentForeground: "#0E1A10",
    destructive: "#7F1D1D", destructiveForeground: "#EBE8DC",
    border: "#1E2E20", input: "#1E2E20",
    text: "#EBE8DC", tint: "#C4A456", radius: 8,
  },
  dusk: {
    background: "#1A0F1E", foreground: "#F0EAF4",
    card: "#22152A", cardForeground: "#F0EAF4",
    primary: "#C4826A", primaryForeground: "#1A0F1E",
    secondary: "#9A7AAE", secondaryForeground: "#1A0F1E",
    muted: "#2E1E38", mutedForeground: "#A09098",
    accent: "#C4826A", accentForeground: "#1A0F1E",
    destructive: "#7F1D1D", destructiveForeground: "#F0EAF4",
    border: "#2E1E38", input: "#2E1E38",
    text: "#F0EAF4", tint: "#C4826A", radius: 8,
  },
};

const STORAGE_KEY = "333lives-theme";

interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  palette: ThemePalette;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "charcoal",
  setTheme: () => {},
  palette: THEME_PALETTES.charcoal,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("charcoal");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (stored && THEME_PALETTES[stored as AppTheme]) {
        setThemeState(stored as AppTheme);
      }
    });
  }, []);

  const setTheme = useCallback((t: AppTheme) => {
    setThemeState(t);
    AsyncStorage.setItem(STORAGE_KEY, t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, palette: THEME_PALETTES[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
