/**
 * Semantic design tokens for the 333 Lives mobile app.
 *
 * Synced from the sibling web artifact's index.css (charcoal theme) so both
 * artifacts share one visual identity: warm deep charcoal, logo gold accent,
 * ivory text, sage + clay secondaries.
 */

const palette = {
  // Legacy aliases (kept for backward compatibility)
  text: "#F7F4EF",
  tint: "#C9A439",

  // Core surfaces
  background: "#191919", // 240 5% 10% — lifted charcoal
  foreground: "#F7F4EF", // Ivory

  // Cards / elevated surfaces
  card: "#1F1F23", // 240 5% 13%
  cardForeground: "#F7F4EF",

  // Primary action color (buttons, active states)
  primary: "#C9A439", // Logo gold — matches the 333 LIVES mark
  primaryForeground: "#191919",

  // Secondary — sage
  secondary: "#8FA67A",
  secondaryForeground: "#191919",

  // Muted / subdued elements (dividers, placeholders)
  muted: "#2B2B30", // 240 5% 18%
  mutedForeground: "#A9A29A", // 40 10% 65%

  // Accent — clay
  accent: "#C8B57C",
  accentForeground: "#191919",

  // Destructive actions
  destructive: "#7F1D1D",
  destructiveForeground: "#F7F4EF",

  // Borders and input outlines
  border: "#2B2B30",
  input: "#2B2B30",
};

const colors = {
  // The app is dark by design; expose the same charcoal palette for both
  // light and dark scheme keys so the appearance setting never breaks it.
  light: palette,
  dark: palette,

  // Border radius (in px). Synced from the web --radius (0.5rem = 8px).
  radius: 8,
};

export default colors;
