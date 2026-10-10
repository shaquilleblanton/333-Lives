import { Feather } from "@expo/vector-icons";
import {
  useGenerateAnthropicAffirmation,
  useGetAffirmations,
  getGetAffirmationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

export default function AiAffirmationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const s = styles(colors);
  const qc = useQueryClient();

  const generateMutation = useGenerateAnthropicAffirmation();
  const { data: history, isLoading: historyLoading, isError: historyError } = useGetAffirmations();

  const [generated, setGenerated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await generateMutation.mutateAsync();
      setGenerated(result.text);
      // Refresh affirmation history
      qc.invalidateQueries({ queryKey: getGetAffirmationsQueryKey() });
    } catch {
      setError("Couldn't generate an affirmation. Please try again.");
    }
  }

  const recentHistory = [...(history ?? [])]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 7);

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
          <Text style={s.title}>Affirmations</Text>
          <Text style={s.subtitle}>Made for you</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + WEB_BOTTOM_INSET + 24 },
        ]}
      >
        {/* Hero generate card */}
        <View style={s.heroCard}>
          <Text style={s.heroLabel}>Made for you</Text>
          <Text style={s.heroTagline}>
            Get an affirmation crafted from your actual goals, intentions, and
            progress — not a random quote.
          </Text>

          {generated ? (
            <View style={s.affirmBox}>
              <Text style={s.affirmText}>"{generated}"</Text>
            </View>
          ) : null}

          {error ? (
            <Text style={s.errorText}>{error}</Text>
          ) : null}

          <Pressable
            onPress={handleGenerate}
            disabled={generateMutation.isPending}
            style={({ pressed }) => [
              s.generateBtn,
              { opacity: generateMutation.isPending ? 0.7 : pressed ? 0.85 : 1 },
            ]}
          >
            {generateMutation.isPending ? (
              <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={s.generateBtnText}>Crafting your affirmation…</Text>
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <Feather name="zap" size={16} color="#fff" />
                <Text style={s.generateBtnText}>
                  {generated ? "Generate another" : "Generate my affirmation"}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Recent affirmations */}
        {!historyLoading && recentHistory.length > 0 && (
          <View>
            <Text style={s.sectionLabel}>Recent affirmations</Text>
            {recentHistory.map((item) => (
              <View key={item.id} style={s.historyCard}>
                <Text style={s.historyDate}>
                  {new Date(item.date).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
                <Text style={s.historyText}>"{item.text}"</Text>
              </View>
            ))}
          </View>
        )}

        {historyLoading && (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        )}
        {historyError && !historyLoading && (
          <Text style={[s.errorText, { textAlign: "center", marginTop: 12 }]}>
            Couldn't load recent affirmations.
          </Text>
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
    heroCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary + "50",
      padding: 20,
      gap: 14,
    },
    heroLabel: {
      fontFamily: fonts.subSemibold,
      fontSize: 12,
      color: colors.primary,
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    heroTagline: {
      fontFamily: fonts.body,
      fontSize: 15,
      color: colors.mutedForeground,
      lineHeight: 22,
    },
    affirmBox: {
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary + "30",
      padding: 16,
    },
    affirmText: {
      fontFamily: fonts.serif,
      fontSize: 18,
      color: colors.foreground,
      lineHeight: 28,
      textAlign: "center",
    },
    errorText: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: "#E5484D",
      textAlign: "center",
    },
    generateBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    generateBtnText: {
      fontFamily: fonts.sub,
      fontSize: 15,
      color: "#fff",
    },
    sectionLabel: {
      fontFamily: fonts.subSemibold,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: colors.mutedForeground,
      marginBottom: 10,
    },
    historyCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
      gap: 6,
    },
    historyDate: {
      fontFamily: fonts.subSemibold,
      fontSize: 11,
      color: colors.mutedForeground,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    historyText: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.foreground,
      lineHeight: 20,
    },
  });
}
