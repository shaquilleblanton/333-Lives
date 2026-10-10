import type { ComponentProps } from "react";
import type { Feather } from "@expo/vector-icons";

export const HABIT_CATEGORIES = [
  { value: "health", label: "Health", icon: "heart" },
  { value: "mindfulness", label: "Mindfulness", icon: "feather" },
  { value: "fitness", label: "Fitness", icon: "activity" },
  { value: "learning", label: "Learning", icon: "book-open" },
  { value: "personal", label: "Personal", icon: "user" },
  { value: "work", label: "Work", icon: "briefcase" },
] as const satisfies readonly { value: string; label: string; icon: ComponentProps<typeof Feather>["name"] }[];

export type HabitCategoryValue = (typeof HABIT_CATEGORIES)[number]["value"];
export const DEFAULT_HABIT_CATEGORY: HabitCategoryValue = "health";

/** Always resolves to a category; unknown/missing values fall back to Health. */
export function resolveHabitCategory(value: string | null | undefined) {
  return HABIT_CATEGORIES.find((c) => c.value === value) ?? HABIT_CATEGORIES[0];
}
