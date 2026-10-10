import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetHabitsQueryKey,
  useCheckInHabit,
  useGetHabits,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

/** Compact habits strip for Today: one-tap check-in, streaks, link to Habits. */
export function TodayHabitsStrip() {
  const colors = useColors();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useGetHabits();
  const checkIn = useCheckInHabit();
  const habits = (data ?? []).filter((h) => !!h?.id);
  const done = habits.filter((h) => h.checkedInToday).length;

  function tap(id: number, already: boolean) {
    if (already || checkIn.isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    checkIn.mutate(
      { id, data: { status: "great" } },
      {
        onSuccess: () => qc.invalidateQueries({ queryKey: getGetHabitsQueryKey() }),
        onError: () => Alert.alert("Couldn't check in", "Please try again."),
      },
    );
  }

  return (
    <View testID="today-habits-strip" style={[s.card, { backgroundColor: colors.card, borderColor: colors.primary + "33" }]}>
      <Pressable onPress={() => router.push("/(tabs)/habits" as any)} style={s.head} accessibilityRole="button" accessibilityLabel="Open Habits">
        <Text style={[s.label, { color: colors.mutedForeground }]}>Habits</Text>
        {habits.length > 0 && (
          <Text style={[s.count, { color: colors.primary }]}>{done}/{habits.length}</Text>
        )}
        <View style={{ flex: 1 }} />
        <Text style={[s.link, { color: colors.primary }]}>All habits</Text>
        <Feather name="chevron-right" size={13} color={colors.primary} />
      </Pressable>

      {isLoading ? (
        <View testID="today-habits-loading" style={s.row}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[s.chip, s.skel, { backgroundColor: colors.muted, borderColor: colors.border }]} />
          ))}
        </View>
      ) : isError ? (
        <Pressable onPress={() => refetch()} style={s.errRow} testID="today-habits-error">
          <Feather name="alert-circle" size={14} color={colors.destructive} />
          <Text style={[s.muted, { color: colors.mutedForeground, flex: 1 }]}>Couldn't load habits.</Text>
          <Text style={[s.link, { color: colors.primary }]}>Retry</Text>
        </Pressable>
      ) : habits.length === 0 ? (
        <Pressable onPress={() => router.push("/(tabs)/habits" as any)} style={s.errRow}>
          <Feather name="plus-circle" size={14} color={colors.primary} />
          <Text style={[s.muted, { color: colors.mutedForeground }]}>Add a habit to track it here.</Text>
        </Pressable>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
          {habits.map((h) => {
            const busy = checkIn.isPending && checkIn.variables?.id === h.id;
            const on = h.checkedInToday;
            return (
              <Pressable
                key={h.id}
                testID={`today-habit-${h.id}`}
                accessibilityRole="button"
                accessibilityState={{ checked: on, busy }}
                accessibilityLabel={`${h.name}${on ? ", done today" : ", tap to check in"}`}
                onPress={() => tap(h.id, on)}
                style={({ pressed }) => [
                  s.chip,
                  {
                    backgroundColor: on ? colors.primary + "1A" : colors.background,
                    borderColor: on ? colors.primary + "66" : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Feather name={on ? "check-circle" : "circle"} size={15} color={on ? colors.primary : colors.mutedForeground} />
                )}
                <Text numberOfLines={1} style={[s.name, { color: on ? colors.primary : colors.foreground }]}>{h.name}</Text>
                {(h.currentStreak ?? 0) > 0 && (
                  <View style={s.streak}>
                    <Feather name="zap" size={10} color={colors.primary} />
                    <Text style={[s.streakText, { color: colors.primary }]}>{h.currentStreak}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 12 },
  head: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  label: { fontFamily: fonts.body, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase" },
  count: { fontFamily: fonts.subSemibold, fontSize: 11 },
  link: { fontFamily: fonts.sub, fontSize: 12 },
  row: { flexDirection: "row", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, maxWidth: 200 },
  skel: { width: 96, height: 34 },
  name: { fontFamily: fonts.body, fontSize: 13, flexShrink: 1 },
  streak: { flexDirection: "row", alignItems: "center", gap: 2 },
  streakText: { fontFamily: fonts.subSemibold, fontSize: 11 },
  errRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  muted: { fontFamily: fonts.body, fontSize: 13 },
});
