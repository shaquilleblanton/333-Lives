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

  // Destructive actions — bright red, readable on charcoal bg
  destructive: "#E5484D",
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

/**
 * Category colors for life timeline events.
 * Defined here so every screen shares one source of truth.
 */
export const categoryColors = {
  education:    "#60a5fa",
  career:       "#34d399",
  family:       "#f472b6",
  health:       "#fb7185",
  home:         "#fbbf24",
  travel:       "#38bdf8",
  loss:         "#94a3b8",
  achievement:  "#f59e0b",
  relationship: "#a78bfa",
  spiritual:    "#e879f9",
  other:        "#6b7280",
} as const;

/**
 * Mood colors for journal entries (growth screen).
 */
export const moodColors = {
  great:      "#34d399",
  good:       "#38bdf8",
  okay:       "#fbbf24",
  rough:      "#fb923c",
  struggling: "#f87171",
} as const;

/**
 * Priority colors for tasks.
 */
export const priorityColors = {
  high:   "#fb7185",
  medium: "#fbbf24",
  low:    "#38bdf8",
} as const;

/**
 * Window-status colors for community availability badges.
 */
export const statusColors = {
  open:   "#34d399",
  locked: "#fbbf24",
} as const;

/**
 * Event-type colors for the personal calendar.
 */
export const eventTypeColors = {
  event:      palette.primary, // logo gold
  medication: "#38bdf8",       // sky blue
  routine:    "#9ca3af",       // neutral gray
} as const;

/**
 * Window-type colors for community calendar availability.
 */
export const windowTypeColors = {
  open:      "#34d399", // emerald
  locked:    "#fbbf24", // amber
  private:   "#6b7280", // slate gray
  scheduled: palette.primary, // logo gold (default)
} as const;
