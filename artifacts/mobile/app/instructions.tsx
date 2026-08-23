import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

const GUIDE_ITEMS: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  accent: "primary" | "secondary" | "accent";
}[] = [
  {
    icon: "sun",
    title: "Today · The 333 Method",
    description:
      "Begin with three intentions, three gratitudes, and three reflections. Today is your calm starting point for living on purpose.",
    accent: "primary",
  },
  {
    icon: "award",
    title: "Streak",
    description:
      "Return each day and complete your intentions to build a record of consistency. Your Streak screen shows the days you have kept going.",
    accent: "accent",
  },
  {
    icon: "mic",
    title: "Memos",
    description:
      "Capture a quick voice note when typing is not the right fit. Memos help you save thoughts, moments, and ideas as they happen.",
    accent: "secondary",
  },
  {
    icon: "lock",
    title: "Vault",
    description:
      "Keep important documents and details in one private place. You decide whether anything is shared with accepted family members.",
    accent: "primary",
  },
  {
    icon: "zap",
    title: "Pulse",
    description:
      "Share a thought, photo, or voice note with your circle. Posts expire after 24 hours unless you choose to keep them forever.",
    accent: "accent",
  },
  {
    icon: "users",
    title: "Family",
    description:
      "Build your circle, preserve meaningful memories, and choose what to share. Your personal reflections stay private by default.",
    accent: "secondary",
  },
];

export default function InstructionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const contentTop = insets.top + WEB_TOP_INSET + 12;
  const contentBottom = insets.bottom + WEB_BOTTOM_INSET + 40;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: contentTop,
          paddingBottom: contentBottom,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityLabel="Go back"
          testID="instructions-back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.6 : 1 }]}
          hitSlop={12}
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
          <Text style={[styles.backText, { color: colors.foreground }]}>Back</Text>
        </Pressable>

        <View style={styles.hero}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>WELCOME TO 333 LIVES</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>How 333 Lives works.</Text>
          <Text style={[styles.intro, { color: colors.mutedForeground }]}>
            A simple daily practice for living intentionally, remembering what matters, and staying connected to the people you love.
          </Text>
        </View>

        <View style={styles.guideList}>
          {GUIDE_ITEMS.map((item) => {
            const accent = colors[item.accent];
            return (
              <View
                key={item.title}
                style={[styles.guideCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.iconWrap, { backgroundColor: accent + "1A" }]}>
                  <Feather name={item.icon} size={19} color={accent} />
                </View>
                <View style={styles.guideCopy}>
                  <Text style={[styles.guideTitle, { color: colors.foreground }]}>{item.title}</Text>
                  <Text style={[styles.guideDescription, { color: colors.mutedForeground }]}>
                    {item.description}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={[styles.footerCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "35" }]}>
          <Feather name="heart" size={18} color={colors.primary} />
          <Text style={[styles.footerText, { color: colors.foreground }]}>
            Start small. Come back tomorrow. Your story grows one intentional day at a time.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backButton: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", paddingVertical: 6 },
  backText: { fontFamily: fonts.sub, fontSize: 14 },
  hero: { marginTop: 28, marginBottom: 28 },
  eyebrow: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 1.7, marginBottom: 10 },
  title: { fontFamily: fonts.serif, fontSize: 31, lineHeight: 38, marginBottom: 12 },
  intro: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, maxWidth: 520 },
  guideList: { gap: 12 },
  guideCard: { flexDirection: "row", alignItems: "flex-start", gap: 14, borderRadius: 17, borderWidth: 1, padding: 16 },
  iconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  guideCopy: { flex: 1 },
  guideTitle: { fontFamily: fonts.bodySemibold, fontSize: 15, marginBottom: 5 },
  guideDescription: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20 },
  footerCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 17, borderWidth: 1, padding: 16, marginTop: 20 },
  footerText: { flex: 1, fontFamily: fonts.sub, fontSize: 13, lineHeight: 19 },
});