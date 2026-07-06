/**
 * Font family names, matching the web artifact's typographic identity:
 * Playfair Display (serif headings), DM Sans (subheadings), Inter (body).
 * Loaded in app/_layout.tsx via useFonts.
 */
export const fonts = {
  serif: "PlayfairDisplay_600SemiBold",
  serifBold: "PlayfairDisplay_700Bold",
  serifMedium: "PlayfairDisplay_500Medium",
  serifItalic: "PlayfairDisplay_500Medium_Italic",

  sub: "DMSans_500Medium",
  subSemibold: "DMSans_600SemiBold",
  subRegular: "DMSans_400Regular",

  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemibold: "Inter_600SemiBold",
} as const;
