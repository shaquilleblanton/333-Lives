import { Feather } from "@expo/vector-icons";
import { useGetAnthropicCoachInsights } from "@workspace/api-client-react";
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
import { router } from "expo-router";

import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

function StatPill({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 14,
        paddingVertical: 10,
        alignItems: "center",
        minWidth: 90,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 20,
          color: colors.primary,
          lineHeight: 24,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: fonts.subSemibold,
          fontSize: 11,
          color: colors.mutedForeground,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function AiCoachScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const s = styles(colors);

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useGetAnthropicCoachInsights();

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + WEB_TOP_INSET + 16 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }]}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.title}>Life Coach</Text>
          <Text style={s.subtitle}>Your personalized daily insight</Text>
        </View>
        <Pressable
          onPress={() => refetch()}
          disabled={isRefetching || isLoading}
          hitSlop={10}
          style={({ pressed }) => [
            { opacity: isRefetching || isLoading ? 0.4 : pressed ? 0.7 : 1, padding: 4 },
          ]}
          accessibilityLabel="Refresh insights"
        >
          <Feather
            name="refresh-cw"
            size={18}
            color={colors.primary}
            style={{ transform: [{ rotate: isRefetching ? "180deg" : "0deg" }] }}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + WEB_BOTTOM_INSET + 24 },
        ]}
      >
        {isLoading ? (
          <View style={s.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={s.loadingText}>
              Reviewing your habits and intentions…
            </Text>
          </View>
        ) : isError ? (
          <View style={s.errorState}>
            <Text style={s.errorIcon}>⚠️</Text>
            <Text style={s.errorTitle}>Couldn't load insights</Text>
            <Text style={s.errorBody}>
              Check your connection and try again.
            </Text>
            <Pressable
              onPress={() => refetch()}
              style={({ pressed }) => [s.retryBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={s.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Stats row */}
            {data && (
              <View style={s.statsRow}>
                <StatPill
                  label="Streak"
                  value={`${data.streakDays}d`}
                  colors={colors}
                />
                {data.intentionsSummary ? (
                  <StatPill
                    label="Today"
                    value={data.intentionsSummary.split(" ")[0] ?? "–"}
                    colors={colors}
                  />
                ) : null}
              </View>
            )}

            {/* Coach message */}
            <View style={s.insightCard}>
              <View style={s.insightHeader}>
                <View style={s.coachAvatar}>
                  <Text style={{ fontSize: 20 }}>🧠</Text>
                </View>
                <View>
                  <Text style={s.coachLabel}>Your AI Coach</Text>
                  <Text style={s.coachTime}>
                    {new Date().toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              </View>
              <Text style={s.insightText}>{data?.insights}</Text>
            </View>

            {/* Habits context */}
            {data?.habitsSummary && data.habitsSummary !== "No habits tracked yet." && (
              <View style={s.contextCard}>
                <Text style={s.contextLabel}>Your habits</Text>
                <Text style={s.contextText}>{data.habitsSummary}</Text>
              </View>
            )}

            {/* Intentions context */}
            {data?.intentionsSummary && (
              <View style={s.contextCard}>
                <Text style={s.contextLabel}>Today's intentions</Text>
                <Text style={s.contextText}>{data.intentionsSummary}</Text>
              </View>
            )}

            <Text style={s.disclaimer}>
              Insights refresh each time you tap the ↻ button. They're based
              on your real habits, intentions, and streak data.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function styles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    title: {
      fontFamily: fonts.serif,
      fontSize: 26,
      color: colors.foreground,
      lineHeight: 30,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.mutedForeground,
      marginTop: 1,
    },
    content: { padding: 20, gap: 14 },
    statsRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
    insightCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.primary + "40",
      padding: 18,
    },
    insightHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 14,
    },
    coachAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary + "20",
      alignItems: "center",
      justifyContent: "center",
    },
    coachLabel: {
      fontFamily: fonts.sub,
      fontSize: 14,
      color: colors.primary,
    },
    coachTime: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 1,
    },
    insightText: {
      fontFamily: fonts.body,
      fontSize: 15,
      color: colors.foreground,
      lineHeight: 24,
    },
    contextCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    contextLabel: {
      fontFamily: fonts.subSemibold,
      fontSize: 11,
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 6,
    },
    contextText: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.foreground,
      lineHeight: 20,
    },
    loadingState: {
      alignItems: "center",
      paddingVertical: 60,
      gap: 16,
    },
    loadingText: {
      fontFamily: fonts.body,
      fontSize: 15,
      color: colors.mutedForeground,
      textAlign: "center",
    },
    errorState: {
      alignItems: "center",
      paddingVertical: 60,
      gap: 8,
    },
    errorIcon: { fontSize: 40, marginBottom: 8 },
    errorTitle: {
      fontFamily: fonts.sub,
      fontSize: 18,
      color: colors.foreground,
    },
    errorBody: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: "center",
    },
    retryBtn: {
      marginTop: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 10,
    },
    retryText: {
      fontFamily: fonts.sub,
      fontSize: 15,
      color: "#fff",
    },
    disclaimer: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 18,
      paddingHorizontal: 8,
    },
  });
}
