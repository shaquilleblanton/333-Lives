import { Feather } from "@expo/vector-icons";
import {
  useGetGratitudeEntries,
  useGetTodayGratitudeEntry,
  useCreateGratitudeEntry,
  useUpdateGratitudeEntry,
  getGetGratitudeEntriesQueryKey,
  getGetTodayGratitudeEntryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

export default function GratitudeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data: entries, isLoading, refetch, isRefetching } = useGetGratitudeEntries();
  const { data: todayEntry, isLoading: loadingToday } = useGetTodayGratitudeEntry();
  const createEntry = useCreateGratitudeEntry();
  const updateEntry = useUpdateGratitudeEntry();

  const [item1, setItem1] = useState("");
  const [item2, setItem2] = useState("");
  const [item3, setItem3] = useState("");
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);

  const hasToday = !!todayEntry;
  const topPad = insets.top + WEB_TOP_INSET + 12;
  const botPad = insets.bottom + WEB_BOTTOM_INSET + 24;

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetGratitudeEntriesQueryKey() });
    qc.invalidateQueries({ queryKey: getGetTodayGratitudeEntryQueryKey() });
  }

  async function handleSave() {
    if (!item1.trim() || !item2.trim() || !item3.trim()) {
      Alert.alert("Fill all three", "You need at least three things you're grateful for.");
      return;
    }
    setSaving(true);
    try {
      const date = new Date().toISOString().split("T")[0];
      const payload = { item1: item1.trim(), item2: item2.trim(), item3: item3.trim(), reflection: reflection.trim() || undefined, date };
      if (todayEntry) {
        await updateEntry.mutateAsync({ id: todayEntry.id, data: payload as any });
      } else {
        await createEntry.mutateAsync({ data: payload as any });
      }
      invalidate();
      setItem1(""); setItem2(""); setItem3(""); setReflection("");
    } catch {
      Alert.alert("Couldn't save", "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const sortedEntries = [...(entries ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: botPad, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>Gratitude</Text>
            <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>Count your blessings, daily.</Text>
          </View>
        </View>

        {/* Today's entry card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.primary + "33" }]}>
          <View style={styles.cardHead}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primary + "1A" }]}>
              <Feather name="heart" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              {hasToday ? "Today's Gratitude ✓" : "Today's Gratitude"}
            </Text>
          </View>

          {hasToday && !item1 ? (
            <View style={{ gap: 8 }}>
              {[todayEntry.item1, todayEntry.item2, todayEntry.item3].map((item, i) => (
                <View key={i} style={[styles.entryItem, { backgroundColor: colors.primary + "0D", borderColor: colors.primary + "26" }]}>
                  <Text style={[styles.entryItemText, { color: colors.foreground }]}>{item}</Text>
                </View>
              ))}
              {todayEntry.reflection ? (
                <Text style={[styles.reflection, { color: colors.mutedForeground }]}>
                  "{todayEntry.reflection}"
                </Text>
              ) : null}
              <Pressable
                onPress={() => {
                  setItem1(todayEntry.item1 ?? "");
                  setItem2(todayEntry.item2 ?? "");
                  setItem3(todayEntry.item3 ?? "");
                  setReflection(todayEntry.reflection ?? "");
                }}
                style={[styles.editBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.editBtnText, { color: colors.mutedForeground }]}>Edit today's entry</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {[
                { value: item1, set: setItem1, label: "I'm grateful for…" },
                { value: item2, set: setItem2, label: "Something beautiful today…" },
                { value: item3, set: setItem3, label: "A person I appreciate…" },
              ].map(({ value, set, label }, i) => (
                <TextInput
                  key={i}
                  value={value}
                  onChangeText={set}
                  placeholder={label}
                  placeholderTextColor={colors.mutedForeground + "99"}
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  returnKeyType="next"
                />
              ))}
              <TextInput
                value={reflection}
                onChangeText={setReflection}
                placeholder="Reflection (optional)…"
                placeholderTextColor={colors.mutedForeground + "99"}
                style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <Pressable
                onPress={handleSave}
                disabled={saving || !item1.trim() || !item2.trim() || !item3.trim()}
                style={({ pressed }) => [
                  styles.saveBtn,
                  { backgroundColor: colors.primary, opacity: saving || !item1.trim() || !item2.trim() || !item3.trim() ? 0.5 : pressed ? 0.85 : 1 },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
                    {hasToday ? "Update Entry" : "Save Gratitude"}
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        </View>

        {/* Past entries */}
        {sortedEntries.length > 0 ? (
          <View style={{ marginTop: 28 }}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PAST ENTRIES</Text>
            <View style={{ gap: 12 }}>
              {sortedEntries.map(entry => (
                <View key={entry.id} style={[styles.pastCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.pastDate, { color: colors.mutedForeground }]}>
                    {new Date(entry.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </Text>
                  {[entry.item1, entry.item2, entry.item3].filter(Boolean).map((item, i) => (
                    <Text key={i} style={[styles.pastItem, { color: colors.foreground }]}>· {item}</Text>
                  ))}
                  {entry.reflection ? (
                    <Text style={[styles.pastReflection, { color: colors.mutedForeground }]}>"{entry.reflection}"</Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  backBtn: { padding: 4 },
  pageTitle: { fontFamily: fonts.serifBold, fontSize: 28 },
  pageSub: { fontFamily: fonts.sub, fontSize: 13, marginTop: 2 },
  card: { borderRadius: 20, borderWidth: 1, padding: 20 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  iconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontFamily: fonts.serif, fontSize: 20 },
  entryItem: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  entryItemText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  reflection: { fontFamily: fonts.serifItalic, fontSize: 13, lineHeight: 20, paddingHorizontal: 4, marginTop: 4 },
  editBtn: { borderRadius: 10, borderWidth: 1, paddingVertical: 10, alignItems: "center", marginTop: 4 },
  editBtnText: { fontFamily: fonts.sub, fontSize: 13 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontFamily: fonts.body, fontSize: 14 },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  saveBtn: { borderRadius: 999, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveBtnText: { fontFamily: fonts.subSemibold, fontSize: 15 },
  sectionLabel: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 1.5, marginBottom: 12 },
  pastCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 4 },
  pastDate: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 0.5, marginBottom: 6, textTransform: "uppercase" },
  pastItem: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  pastReflection: { fontFamily: fonts.serifItalic, fontSize: 13, marginTop: 6 },
});
