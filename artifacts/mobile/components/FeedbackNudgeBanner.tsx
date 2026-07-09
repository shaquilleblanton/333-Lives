import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

/**
 * Shown during the last few days of each month to nudge members to submit
 * feedback before the owner's end-of-month update pass. Dismissal is
 * remembered per calendar month.
 */
export function FeedbackNudgeBanner() {
  const colors = useColors();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  const now = new Date();
  const monthKey = `feedback-nudge-dismissed-${now.getFullYear()}-${now.getMonth() + 1}`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const isMonthEnd = now.getDate() > lastDay - 4;

  useEffect(() => {
    if (!isMonthEnd) return;
    let cancelled = false;
    AsyncStorage.getItem(monthKey)
      .then((v) => {
        if (!cancelled && v !== "1") setVisible(true);
      })
      .catch(() => {
        // Storage failures just mean the banner stays hidden.
      });
    return () => {
      cancelled = true;
    };
  }, [isMonthEnd, monthKey]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    AsyncStorage.setItem(monthKey, "1").catch(() => {});
  };

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: colors.primary + "14", borderColor: colors.primary + "33" },
      ]}
    >
      <Feather name="message-square" size={15} color={colors.primary} />
      <Pressable style={{ flex: 1 }} onPress={() => router.push("/(tabs)/feedback")}>
        <Text style={[styles.text, { color: colors.foreground }]}>
          Monthly updates are coming —{" "}
          <Text style={{ color: colors.primary, fontFamily: fonts.subSemibold }}>
            send feedback
          </Text>{" "}
          before the end of the month.
        </Text>
      </Pressable>
      <Pressable onPress={dismiss} hitSlop={10} accessibilityLabel="Dismiss">
        <Feather name="x" size={16} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  text: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18 },
});
