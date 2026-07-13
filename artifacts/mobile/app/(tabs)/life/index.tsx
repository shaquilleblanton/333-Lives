import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

type FeatureItem = {
  key: string;
  label: string;
  sub: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
  accent: "primary" | "secondary" | "accent" | "rose" | "sky" | "emerald" | "violet" | "amber";
};

const FEATURES: FeatureItem[] = [
  { key: "tasks",      label: "Tasks",           sub: "What needs doing",         icon: "check-square", route: "life/tasks",          accent: "primary" },
  { key: "gratitude",  label: "Gratitude",        sub: "Count your blessings",     icon: "heart",        route: "life/gratitude",       accent: "rose" },
  { key: "people",     label: "My Circle",        sub: "People who shaped you",    icon: "users",        route: "life/people",          accent: "secondary" },
  { key: "growth",     label: "Growth Hub",       sub: "Habits, goals & journal",  icon: "trending-up",  route: "life/growth",          accent: "accent" },
  { key: "legacy",     label: "Legacy Letters",   sub: "Words that outlive today", icon: "mail",         route: "life/legacy-letters",  accent: "amber" },
  { key: "future",     label: "Future Messages",  sub: "Sealed in time",           icon: "lock",         route: "life/future",          accent: "violet" },
  { key: "vault",      label: "Secure Vault",     sub: "Your private sanctuary",   icon: "shield",       route: "life/vault",           accent: "emerald" },
  { key: "community",  label: "Community",        sub: "Events & gatherings",      icon: "globe",        route: "life/community",       accent: "sky" },
  { key: "calendar",   label: "Schedule",         sub: "Your time, arranged",      icon: "calendar",     route: "life/calendar",        accent: "primary" },
  { key: "familyTree", label: "Family Tree",      sub: "Your lineage & ancestors", icon: "git-branch",   route: "life/family-tree",     accent: "amber" },
];

const ACCENT_MAP = {
  primary:   (c: ReturnType<typeof useColors>) => c.primary,
  secondary: (c: ReturnType<typeof useColors>) => c.secondary,
  accent:    (c: ReturnType<typeof useColors>) => c.accent,
  rose:      () => "#fb7185",
  sky:       () => "#38bdf8",
  emerald:   () => "#34d399",
  violet:    () => "#a78bfa",
  amber:     () => "#fbbf24",
};

export default function LifeHub() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const topPad = insets.top + WEB_TOP_INSET + 12;
  const botPad = insets.bottom + WEB_BOTTOM_INSET + 24;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topPad, paddingBottom: botPad, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Your Life</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Everything that matters, in one place.
        </Text>
      </View>

      <View style={styles.grid}>
        {FEATURES.map((item) => {
          const accentColor = ACCENT_MAP[item.accent](colors);
          return (
            <Pressable
              key={item.key}
              onPress={() => router.push(`/(tabs)/${item.route}` as any)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: pressed ? accentColor + "66" : colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: accentColor + "1A" }]}>
                <Feather name={item.icon} size={22} color={accentColor} />
              </View>
              <Text style={[styles.cardLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]} numberOfLines={2}>
                {item.sub}
              </Text>
              <View style={styles.arrowWrap}>
                <Feather name="chevron-right" size={14} color={colors.mutedForeground + "80"} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 24 },
  title: { fontFamily: fonts.serifBold, fontSize: 32, lineHeight: 38 },
  sub: { fontFamily: fonts.sub, fontSize: 14, marginTop: 6, lineHeight: 20 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    width: "48%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    minHeight: 130,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardLabel: {
    fontFamily: fonts.serifBold,
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  cardSub: {
    fontFamily: fonts.sub,
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  arrowWrap: {
    alignSelf: "flex-end",
    marginTop: 8,
  },
});
