import { useTheme } from "@/contexts/ThemeContext";

/**
 * Returns the design tokens for the currently selected app theme.
 *
 * Reads from ThemeContext (AsyncStorage-persisted, 6 themes mirroring the web
 * ThemeProvider). Falls back to "charcoal" on first launch.
 */
export function useColors() {
  const { palette } = useTheme();
  return palette;
}
