import { Feather } from "@expo/vector-icons";
import {
  useGetIntentionHistory,
} from "@workspace/api-client-react";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
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

const WEEKS = 15;
const CELL = 15;
const GAP = 4;

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function StreakScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch, isRefetching } = useGetIntentionHistory();

  const contentTopPad = insets.top + WEB_TOP_INSET + 12;
  const contentBottomPad = insets.bottom + WEB_BOTTOM_INSET + 40;

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.centerFill, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const completedSet = new Set(data?.completedDays ?? []);
  const hasHistory = (data?.completedDays?.length ?? 0) > 0;

  // Build a grid of the last WEEKS weeks, columns = weeks (Sun→Sat).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = ymd(today);

  const end = new Date(today);
  end.setDate(end.getDate() + (6 - end.getDay())); // Saturday of this week
  const start = new Date(end);
  start.setDate(start.getDate() - (WEEKS * 7 - 1));

  const columns: Date[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < WEEKS; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    columns.push(week);
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: contentTopPad, paddingBottom: contentBottomPad, paddingHorizontal: 20 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
      }
    >
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>
          YOUR LEGACY, ONE DAY AT A TIME
        </Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Intention Streak</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>CURRENT</Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {data?.currentStreak ?? 0}
            <Text style={[styles.statUnit, { color: colors.mutedForeground }]}>
              {" "}
              day{(data?.currentStreak ?? 0) === 1 ? "" : "s"}
            </Text>
          </Text>
        </View>
        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.primary + "0F", borderColor: colors.primary + "40" },
          ]}
        >
          <View style={styles.bestLabelRow}>
            <Feather name="award" size={13} color={colors.primary} />
            <Text style={[styles.statLabel, { color: colors.primary }]}>BEST RUN</Text>
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {data?.longestStreak ?? 0}
            <Text style={[styles.statUnit, { color: colors.mutedForeground }]}>
              {" "}
              day{(data?.longestStreak ?? 0) === 1 ? "" : "s"}
            </Text>
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.primary + "26" }]}>
        <View style={styles.cardHead}>
          <View style={[styles.cardIcon, { backgroundColor: colors.primary + "26" }]}>
            <Feather name="calendar" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Your History</Text>
        </View>

        {hasHistory ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: GAP }}
            >
              {columns.map((week, wi) => (
                <View key={wi} style={{ gap: GAP }}>
                  {week.map((day) => {
                    const key = ymd(day);
                    const isFuture = key > todayKey;
                    const isComplete = completedSet.has(key);
                    const isToday = key === todayKey;
                    return (
                      <Pressable
                        key={key}
                        disabled={isFuture}
                        onPress={() =>
                          router.push({
                            pathname: "/day-detail",
                            params: { date: key, wasComplete: isComplete ? "true" : "false" },
                          })
                        }
                        style={({ pressed }) => [
                          styles.cell,
                          {
                            backgroundColor: isFuture
                              ? "transparent"
                              : isComplete
                                ? colors.primary
                                : colors.muted,
                            borderWidth: isToday ? 1.5 : 0,
                            borderColor: colors.primary,
                            opacity: pressed ? 0.7 : 1,
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              ))}
            </ScrollView>
            <View style={styles.legend}>
              <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Less</Text>
              <View style={[styles.cell, { backgroundColor: colors.muted }]} />
              <View style={[styles.cell, { backgroundColor: colors.primary + "80" }]} />
              <View style={[styles.cell, { backgroundColor: colors.primary }]} />
              <Text style={[styles.legendText, { color: colors.mutedForeground }]}>More</Text>
            </View>
          </>
        ) : (
          <View style={styles.empty}>
            <Feather name="flag" size={26} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No complete 333 days yet. Finish all three intentions today to light your first day.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centerFill: { alignItems: "center", justifyContent: "center" },
  header: { marginBottom: 22 },
  eyebrow: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 2 },
  title: { fontFamily: fonts.serifBold, fontSize: 30, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  bestLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statLabel: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 1 },
  statValue: { fontFamily: fonts.serifBold, fontSize: 30 },
  statUnit: { fontFamily: fonts.body, fontSize: 13 },
  card: { borderRadius: 20, borderWidth: 1, padding: 22 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontFamily: fonts.serif, fontSize: 22 },
  cell: { width: CELL, height: CELL, borderRadius: 4 },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 16,
  },
  legendText: { fontFamily: fonts.sub, fontSize: 11 },
  empty: { alignItems: "center", gap: 12, paddingVertical: 24 },
  emptyText: {
    fontFamily: fonts.sub,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: 16,
  },
});
