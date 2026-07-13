import { Feather } from "@expo/vector-icons";
import { useGetAnnualReview } from "@workspace/api-client-react";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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

const CURRENT_YEAR = new Date().getFullYear();
const AVAILABLE_YEARS = Array.from({ length: Math.max(1, CURRENT_YEAR - 2023) }, (_, i) => CURRENT_YEAR - i);

const MOOD_EMOJI: Record<string, string> = {
  great: "🌟",
  good: "😊",
  okay: "😐",
  rough: "😔",
  struggling: "💙",
};

function SectionHeader({ label }: { label: string }) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={[styles.sectionLine, { backgroundColor: colors.primary + "50" }]} />
      <Text style={[styles.sectionHeaderText, { color: colors.primary }]}>{label}</Text>
      <View style={[styles.sectionLineFlex, { backgroundColor: colors.primary + "20" }]} />
    </View>
  );
}

function StatCard({
  icon, value, label, accent = false,
}: {
  icon: keyof typeof Feather.glyphMap;
  value: number | string;
  label: string;
  accent?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: accent ? colors.primary + "26" : colors.secondary + "20" }]}>
        <Feather name={icon} size={18} color={accent ? colors.primary : colors.secondary} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function ReviewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [yearIdx, setYearIdx] = useState(0);

  const { data, isLoading } = useGetAnnualReview(year);

  const handlePrevYear = () => {
    if (yearIdx < AVAILABLE_YEARS.length - 1) {
      const next = yearIdx + 1;
      setYearIdx(next);
      setYear(AVAILABLE_YEARS[next] ?? CURRENT_YEAR);
    }
  };

  const handleNextYear = () => {
    if (yearIdx > 0) {
      const next = yearIdx - 1;
      setYearIdx(next);
      setYear(AVAILABLE_YEARS[next] ?? CURRENT_YEAR);
    }
  };

  const moodEntries = data
    ? Object.entries(data.growth.moodBreakdown).sort((a, b) => b[1] - a[1])
    : [];
  const totalMoods = moodEntries.reduce((s, [, v]) => s + v, 0);

  const contentTop = insets.top + WEB_TOP_INSET + 12;
  const contentBottom = insets.bottom + WEB_BOTTOM_INSET + 40;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: contentTop, paddingBottom: contentBottom, paddingHorizontal: 20 }}
    >
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        hitSlop={10}
      >
        <Feather name="arrow-left" size={16} color={colors.mutedForeground} />
        <Text style={[styles.backText, { color: colors.mutedForeground }]}>Back</Text>
      </Pressable>

      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>333 LIVES</Text>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Your Year,{"\n"}Wrapped.</Text>
        </View>
        <View style={[styles.yearPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable onPress={handlePrevYear} hitSlop={8} disabled={yearIdx >= AVAILABLE_YEARS.length - 1}>
            <Feather name="chevron-left" size={16} color={yearIdx >= AVAILABLE_YEARS.length - 1 ? colors.muted : colors.mutedForeground} />
          </Pressable>
          <Text style={[styles.yearText, { color: colors.foreground }]}>{year}</Text>
          <Pressable onPress={handleNextYear} hitSlop={8} disabled={yearIdx === 0}>
            <Feather name="chevron-right" size={16} color={yearIdx === 0 ? colors.muted : colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Gathering your year…</Text>
        </View>
      ) : !data ? null : (
        <>
          <View style={styles.section}>
            <SectionHeader label="THE NUMBERS" />
            <View style={styles.statGrid}>
              <StatCard icon="calendar" value={data.numbers.daysActive} label="Days Active" accent />
              <StatCard icon="check-square" value={data.numbers.intentionsCompleted} label="Intentions" />
              <StatCard icon="zap" value={data.numbers.longestStreak} label="Longest Streak" accent />
              <StatCard icon="heart" value={data.numbers.gratitudeEntries} label="Gratitude" />
              <StatCard icon="activity" value={data.numbers.habitCheckins} label="Habit Check-ins" />
              <StatCard icon="star" value={data.numbers.goalsCompleted} label="Goals Completed" accent />
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader label="YOUR STORY" />
            <View style={styles.statGrid}>
              <StatCard icon="clock" value={data.story.lifeEventsAdded} label="Life Events" />
              <StatCard icon="file-text" value={data.story.lettersWritten} label="Letters Written" accent />
              <StatCard icon="send" value={data.story.futureMessagesSet} label="Future Messages" />
              <StatCard icon="lock" value={data.story.vaultItemsAdded} label="Vault Items" accent />
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader label="YOUR PEOPLE" />
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.peopleSummaryRow}>
                <View>
                  <Text style={[styles.bigNum, { color: colors.foreground }]}>{data.people.totalMoments}</Text>
                  <Text style={[styles.bigNumLabel, { color: colors.mutedForeground }]}>Total moments logged</Text>
                </View>
                <Feather name="users" size={32} color={colors.secondary + "50"} />
              </View>
              {data.people.topPeople.length > 0 && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>TOP CONNECTIONS</Text>
                  {data.people.topPeople.map((person, i) => (
                    <View key={person.personId} style={styles.personRow}>
                      <View style={[
                        styles.rankBadge,
                        {
                          backgroundColor: i === 0 ? colors.primary + "26" : i === 1 ? colors.secondary + "20" : colors.muted + "40",
                        },
                      ]}>
                        <Text style={[styles.rankText, {
                          color: i === 0 ? colors.primary : i === 1 ? colors.secondary : colors.mutedForeground,
                        }]}>{i + 1}</Text>
                      </View>
                      <Text style={[styles.personName, { color: colors.foreground }]}>{person.name}</Text>
                      <Text style={[styles.personCount, { color: colors.mutedForeground }]}>{person.momentCount} moments</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader label="GROWTH" />
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 10 }]}>
              <Feather name="book-open" size={22} color={colors.primary} style={{ marginBottom: 8 }} />
              <Text style={[styles.bigNum, { color: colors.foreground }]}>{data.growth.journalEntries}</Text>
              <Text style={[styles.bigNumLabel, { color: colors.mutedForeground }]}>Journal entries written</Text>
            </View>
            {moodEntries.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>MOOD BREAKDOWN</Text>
                {moodEntries.map(([mood, cnt]) => (
                  <View key={mood} style={styles.moodRow}>
                    <Text style={styles.moodEmoji}>{MOOD_EMOJI[mood] ?? "😐"}</Text>
                    <View style={[styles.moodBarBg, { backgroundColor: colors.muted + "40" }]}>
                      <View
                        style={[
                          styles.moodBarFill,
                          {
                            backgroundColor: colors.primary + "B0",
                            width: `${Math.round((cnt / totalMoods) * 100)}%` as any,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.moodLabel, { color: colors.mutedForeground }]}>{cnt}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {data.topWord ? (
            <View style={styles.section}>
              <SectionHeader label="YOUR WORD" />
              <View style={[styles.wordCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
                <Text style={[styles.wordLabel, { color: colors.mutedForeground }]}>
                  Your most-used word across all journal entries
                </Text>
                <Text style={[styles.wordBig, { color: colors.primary }]}>
                  {data.topWord.charAt(0).toUpperCase() + data.topWord.slice(1)}
                </Text>
                <Text style={[styles.wordQuote, { color: colors.mutedForeground }]}>
                  "The words we use reveal the life we're living."
                </Text>
              </View>
            </View>
          ) : null}

          <Text style={[styles.footer, { color: colors.mutedForeground }]}>
            {year} — A year of intentional living
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 20 },
  backText: { fontSize: 14, fontFamily: fonts.body },
  titleRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 28, gap: 12 },
  eyebrow: { fontSize: 10, fontFamily: fonts.body, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 },
  pageTitle: { fontSize: 36, fontFamily: fonts.serif, lineHeight: 42 },
  yearPicker: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  yearText: { fontSize: 15, fontFamily: fonts.subSemibold, minWidth: 40, textAlign: "center" },
  loadingWrap: { flex: 1, alignItems: "center", paddingTop: 60, gap: 12 },
  loadingText: { fontSize: 13, fontFamily: fonts.body },
  section: { marginBottom: 28 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionLine: { width: 20, height: 1 },
  sectionLineFlex: { flex: 1, height: 1 },
  sectionHeaderText: { fontSize: 10, fontFamily: fonts.subSemibold, letterSpacing: 1.5 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "47%", borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  statValue: { fontSize: 32, fontFamily: fonts.serif, lineHeight: 36 },
  statLabel: { fontSize: 10, fontFamily: fonts.body, letterSpacing: 0.8, textTransform: "uppercase" },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 4 },
  peopleSummaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bigNum: { fontSize: 42, fontFamily: fonts.serif, lineHeight: 46 },
  bigNumLabel: { fontSize: 11, fontFamily: fonts.body, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 },
  divider: { height: 1, marginVertical: 12 },
  subLabel: { fontSize: 10, fontFamily: fonts.subSemibold, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 },
  personRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  rankBadge: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  rankText: { fontSize: 12, fontFamily: fonts.subSemibold },
  personName: { flex: 1, fontSize: 13, fontFamily: fonts.body },
  personCount: { fontSize: 12, fontFamily: fonts.body },
  moodRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  moodEmoji: { fontSize: 16, width: 22 },
  moodBarBg: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  moodBarFill: { height: "100%", borderRadius: 3 },
  moodLabel: { fontSize: 12, fontFamily: fonts.body, width: 20, textAlign: "right" },
  wordCard: { borderWidth: 1, borderRadius: 20, padding: 28, alignItems: "center", gap: 12 },
  wordLabel: { fontSize: 12, fontFamily: fonts.body, textAlign: "center" },
  wordBig: { fontSize: 56, fontFamily: fonts.serif, textAlign: "center" },
  wordQuote: { fontSize: 12, fontFamily: fonts.body, fontStyle: "italic", textAlign: "center" },
  footer: { textAlign: "center", fontSize: 11, fontFamily: fonts.body, letterSpacing: 1, textTransform: "uppercase", marginTop: 8, marginBottom: 20 },
});
