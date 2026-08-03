import { Feather } from "@expo/vector-icons";
import {
  useGetAffirmations,
  useGetGratitudeEntries,
  useGetIntentions,
} from "@workspace/api-client-react";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
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

function formatDate(dateStr: string): string {
  // Parse as local date to avoid UTC offset shifting the day
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year!, month! - 1, day!);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function DayDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { date, wasComplete } = useLocalSearchParams<{
    date: string;
    wasComplete?: string;
  }>();

  const complete = wasComplete === "true";

  const { data: intentionsData, isLoading: intentionsLoading } =
    useGetIntentions({ date: date ?? undefined }, { query: { enabled: !!date } as any });

  const { data: gratitudeRows, isLoading: gratitudeLoading } =
    useGetGratitudeEntries({ date: date ?? undefined }, { query: { enabled: !!date } as any });

  const { data: affirmationRows, isLoading: affirmationLoading } =
    useGetAffirmations({ date: date ?? undefined }, { query: { enabled: !!date } as any });

  const sorted = [...(intentionsData ?? [])].sort((a, b) => a.order - b.order);
  const completedCount = sorted.filter((i) => i.isCompleted).length;

  const gratitude = gratitudeRows?.[0];
  const gratitudeItems = gratitude
    ? [gratitude.item1, gratitude.item2, gratitude.item3].filter(
        (item): item is string => !!item && item.trim().length > 0,
      )
    : [];

  const affirmation = affirmationRows?.[0];

  const heading = date ? formatDate(date) : "";

  const contentTopPad = insets.top + WEB_TOP_INSET + 12;
  const contentBottomPad = insets.bottom + WEB_BOTTOM_INSET + 40;

  const anyLoading = intentionsLoading || gratitudeLoading || affirmationLoading;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.navBar,
          {
            paddingTop: insets.top + WEB_TOP_INSET + 4,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          hitSlop={12}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
          <Text style={[styles.backLabel, { color: colors.foreground }]}>Back</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 20,
          paddingBottom: contentBottomPad,
          paddingHorizontal: 20,
        }}
      >
        {/* Title */}
        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            {complete && (
              <Feather name="award" size={20} color={colors.primary} style={{ marginRight: 8 }} />
            )}
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
              {heading}
            </Text>
          </View>
          {anyLoading ? null : (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {sorted.length === 0
                ? "No intentions were set this day."
                : complete
                  ? "You completed all three intentions this day."
                  : `${completedCount} of ${sorted.length} intention${sorted.length === 1 ? "" : "s"} completed.`}
            </Text>
          )}
        </View>

        {anyLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <>
            {/* ── Intentions ── */}
            <SectionLabel icon="check-circle" label="Intentions" colors={colors} />
            {sorted.length === 0 ? (
              <EmptyCard
                icon="circle"
                text="No intentions were set this day."
                colors={colors}
              />
            ) : (
              <View style={styles.sectionBody}>
                {sorted.map((intention, idx) => (
                  <View
                    key={intention.id}
                    style={[
                      styles.intentionRow,
                      {
                        backgroundColor: intention.isCompleted
                          ? colors.primary + "10"
                          : colors.card,
                        borderColor: intention.isCompleted
                          ? colors.primary + "40"
                          : colors.border,
                      },
                    ]}
                  >
                    <Feather
                      name={intention.isCompleted ? "check-circle" : "circle"}
                      size={18}
                      color={
                        intention.isCompleted ? colors.primary : colors.mutedForeground + "60"
                      }
                      style={{ marginTop: 1 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.intentionLabel,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        INTENTION {idx + 1}
                      </Text>
                      <Text
                        style={[
                          styles.intentionText,
                          {
                            color: intention.isCompleted
                              ? colors.foreground + "99"
                              : colors.foreground,
                            textDecorationLine: intention.isCompleted
                              ? "line-through"
                              : "none",
                          },
                        ]}
                      >
                        {intention.text}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ── Gratitude ── */}
            <SectionLabel icon="heart" label="Gratitude" colors={colors} />
            {gratitudeItems.length === 0 ? (
              <EmptyCard
                icon="heart"
                text="No gratitude logged this day."
                colors={colors}
              />
            ) : (
              <View
                style={[
                  styles.blockCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                {gratitudeItems.map((item, idx) => (
                  <View key={idx} style={[styles.gratitudeItem, idx > 0 && { borderTopColor: colors.border + "60", borderTopWidth: StyleSheet.hairlineWidth }]}>
                    <Feather name="star" size={13} color={colors.primary + "BB"} style={{ marginTop: 2 }} />
                    <Text style={[styles.gratitudeText, { color: colors.foreground + "E6" }]}>
                      {item}
                    </Text>
                  </View>
                ))}
                {gratitude?.reflection && gratitude.reflection.trim().length > 0 && (
                  <Text
                    style={[
                      styles.reflection,
                      {
                        color: colors.mutedForeground,
                        borderTopColor: colors.border + "60",
                      },
                    ]}
                  >
                    {gratitude.reflection}
                  </Text>
                )}
              </View>
            )}

            {/* ── Affirmation ── */}
            <SectionLabel icon="sun" label="Affirmation" colors={colors} />
            {!affirmation ? (
              <EmptyCard
                icon="sun"
                text="No affirmation was seen this day."
                colors={colors}
              />
            ) : (
              <View
                style={[
                  styles.blockCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.affirmationText, { color: colors.foreground + "E6" }]}>
                  "{affirmation.text}"
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SectionLabel({
  icon,
  label,
  colors,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.sectionLabel}>
      <Feather name={icon} size={14} color={colors.primary + "CC"} />
      <Text style={[styles.sectionLabelText, { color: colors.mutedForeground }]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

function EmptyCard({
  icon,
  text,
  colors,
}: {
  icon: keyof typeof Feather.glyphMap;
  text: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View
      style={[
        styles.blockCard,
        styles.emptyCard,
        { backgroundColor: colors.card + "80", borderColor: colors.border + "80" },
      ]}
    >
      <Feather name={icon} size={16} color={colors.mutedForeground + "60"} />
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  navBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  titleBlock: {
    marginBottom: 28,
    gap: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 26,
    lineHeight: 34,
    flex: 1,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionLabelText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.4,
  },
  sectionBody: {
    gap: 8,
    marginBottom: 24,
  },
  intentionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  intentionLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 9,
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  intentionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },
  blockCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 24,
  },
  emptyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  gratitudeItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    paddingVertical: 6,
  },
  gratitudeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  reflection: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    fontStyle: "italic",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 6,
  },
  affirmationText: {
    fontFamily: "PlayfairDisplay_500Medium_Italic",
    fontSize: 17,
    lineHeight: 26,
  },
});
