import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { useGenerateAnthropicAffirmation } from "@workspace/api-client-react";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";
import { useLocalNow } from "@/hooks/useLocalNow";
import {
  fallbackAffirmation,
  localDayKey,
  getDailyAffirmation,
} from "@/utils/dailyAffirmation";

/**
 * Today's Affirmation: generated once per user per local day via the existing
 * AI affirmation endpoint, cached on-device, with a static offline fallback.
 */
export function TodayAffirmation() {
  const colors = useColors();
  const { userId } = useAuth();
  const generate = useGenerateAnthropicAffirmation();
  const generateRef = useRef(generate.mutateAsync);
  generateRef.current = generate.mutateAsync;

  const day = localDayKey(useLocalNow());
  const [text, setText] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setText(fallbackAffirmation(day));
      setIsFallback(true);
      return;
    }
    setText(fallbackAffirmation(day));
    setIsFallback(true);
    (async () => {
      const result = await getDailyAffirmation(userId, day, () => generateRef.current());
      if (cancelled) return;
      setText(result);
      setIsFallback(result === fallbackAffirmation(day));
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, day]);

  return (
    <Pressable
      testID="today-affirmation"
      accessibilityRole="button"
      accessibilityHint="Opens Affirmations"
      onPress={() => router.push("/(tabs)/ai-affirmations" as any)}
      style={({ pressed }) => [
        s.card,
        { backgroundColor: colors.card, borderColor: colors.primary + "33", opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={s.head}>
        <Feather name="sun" size={13} color={colors.primary} />
        <Text style={[s.label, { color: colors.mutedForeground }]}>Today's Affirmation</Text>
        <View style={{ flex: 1 }} />
        <Text style={[s.link, { color: colors.primary }]}>More</Text>
        <Feather name="chevron-right" size={13} color={colors.primary} />
      </View>
      {text == null ? (
        <View testID="today-affirmation-loading" style={{ gap: 6, marginTop: 4 }}>
          <View style={[s.skel, { backgroundColor: colors.muted, width: "92%" }]} />
          <View style={[s.skel, { backgroundColor: colors.muted, width: "64%" }]} />
        </View>
      ) : (
        <Text
          testID={isFallback ? "today-affirmation-fallback" : "today-affirmation-text"}
          style={[s.text, { color: colors.foreground }]}
        >
          {text}
        </Text>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 12 },
  head: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  label: { fontFamily: fonts.body, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase" },
  link: { fontFamily: fonts.sub, fontSize: 12 },
  text: { fontFamily: fonts.serifItalic, fontSize: 16, lineHeight: 23 },
  skel: { height: 12, borderRadius: 6 },
});
