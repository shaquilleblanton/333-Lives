import { useColorScheme } from "react-native";

import colors from "@/constants/colors";

/**
 * Returns the design tokens for the current color scheme.
 *
 * The returned object contains all color tokens for the active palette
 * plus scheme-independent values like `radius`.
 *
 * constants/colors.ts defines both `light` and `dark` keys (synced from the
 * web artifact's charcoal theme). This hook switches between them based on the
 * device's appearance setting; both keys are identical here since 333 Lives is
 * dark by design.
 */
export function useColors() {
  const scheme = useColorScheme();
  const palette = scheme === "dark" ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
