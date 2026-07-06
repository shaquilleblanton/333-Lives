import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetDashboardQueryKey,
  getGetIntentionHistoryQueryKey,
  getGetIntentionsQueryKey,
  useCreateIntention,
  useDeleteIntention,
  useGetDashboard,
  useGetIntentionHistory,
  useGetIntentions,
  useUpdateIntention,
  type Intention,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { CompletionRing } from "@/components/CompletionRing";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

const PLACEHOLDERS = [
  "Call Mom and really listen",
  "Finish the proposal draft",
  "Move my body for 30 minutes",
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function TodayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const {
    data: intentions,
    isLoading,
    refetch,
    isRefetching,
  } = useGetIntentions();
  const { data: dashboard } = useGetDashboard();
  const { data: history } = useGetIntentionHistory();

  const createIntention = useCreateIntention();
  const updateIntention = useUpdateIntention();
  const deleteIntention = useDeleteIntention();

  const [drafts, setDrafts] = useState<string[]>(["", "", ""]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  const sorted = [...(intentions ?? [])].sort((a, b) => a.order - b.order);
  const total = sorted.length;
  const completed = sorted.filter((i) => i.isCompleted).length;
  const isSet = total >= 3;
  const allDone = isSet && completed === total;
  const streak = history?.currentStreak ?? dashboard?.intentionsStreak ?? 0;

  const usedOrders = new Set(sorted.map((i) => i.order));
  const freeOrders = [0, 1, 2].filter((o) => !usedOrders.has(o));
  const missingCount = freeOrders.length;

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetIntentionsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
    qc.invalidateQueries({ queryKey: getGetIntentionHistoryQueryKey() });
  }

  function showError(message: string) {
    Alert.alert("Something went wrong", message);
  }

  const canSave =
    !createIntention.isPending &&
    drafts.slice(0, missingCount).every((d) => d.trim().length > 0);

  async function handleSet() {
    const toCreate = freeOrders
      .map((order, idx) => ({ order, text: (drafts[idx] ?? "").trim() }))
      .filter((d) => d.text.length > 0);
    if (toCreate.length < missingCount) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Promise.all(
        toCreate.map((d) =>
          createIntention.mutateAsync({
            data: { text: d.text, order: d.order },
          }),
        ),
      );
      setDrafts(["", "", ""]);
    } catch {
      showError("We couldn't save your intentions. Check your connection and try again.");
    } finally {
      invalidate();
    }
  }

  function toggle(intention: Intention) {
    Haptics.impactAsync(
      intention.isCompleted
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium,
    );
    updateIntention.mutate(
      { id: intention.id, data: { isCompleted: !intention.isCompleted } },
      {
        onSuccess: invalidate,
        onError: () => showError("We couldn't update that intention. Please try again."),
      },
    );
  }

  function startEdit(intention: Intention) {
    setEditingId(intention.id);
    setEditText(intention.text);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  function saveEdit(intention: Intention) {
    const text = editText.trim();
    if (text.length === 0 || text === intention.text) {
      cancelEdit();
      return;
    }
    updateIntention.mutate(
      { id: intention.id, data: { text } },
      {
        onSuccess: () => {
          invalidate();
          cancelEdit();
        },
        onError: () => showError("We couldn't save your changes. Please try again."),
      },
    );
  }

  function confirmRemove(intention: Intention) {
    Alert.alert("Remove intention?", `"${intention.text}"`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          deleteIntention.mutate(
            { id: intention.id },
            {
              onSuccess: () => {
                invalidate();
                if (editingId === intention.id) cancelEdit();
              },
              onError: () =>
                showError("We couldn't remove that intention. Please try again."),
            },
          ),
      },
    ]);
  }

  const Header = (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.greeting, { color: colors.foreground }]}>
          {greeting()}
          {dashboard?.userName ? (
            <Text style={{ color: colors.primary }}>, {dashboard.userName}</Text>
          ) : null}
          .
        </Text>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>
          {todayLabel()}
        </Text>
      </View>
      {streak > 0 && (
        <View
          style={[
            styles.streakPill,
            { backgroundColor: colors.primary + "1A", borderColor: colors.primary + "40" },
          ]}
        >
          <Feather name="zap" size={14} color={colors.primary} />
          <Text style={[styles.streakPillText, { color: colors.primary }]}>
            {streak} day{streak === 1 ? "" : "s"}
          </Text>
        </View>
      )}
    </View>
  );

  const contentTopPad = insets.top + WEB_TOP_INSET + 12;
  const contentBottomPad = insets.bottom + WEB_BOTTOM_INSET + 40;

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.centerFill, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // ---- Setup state: fewer than three intentions are set ----
  if (!isSet) {
    return (
      <KeyboardAwareScrollViewCompat
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingTop: contentTopPad, paddingBottom: contentBottomPad, paddingHorizontal: 20 }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {Header}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.primary + "33" }]}>
          <View style={styles.cardHead}>
            <View style={[styles.cardIcon, { backgroundColor: colors.primary + "26" }]}>
              <Feather name="sunrise" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: colors.primary }]}>THE 333 METHOD</Text>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                {total === 0 ? "Set Your 3 Intentions" : "Finish Your 3 Intentions"}
              </Text>
            </View>
          </View>
          <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>
            {total === 0
              ? "What are the three things that matter most today? Name all three, then move through your day with purpose."
              : `You've named ${total} of 3 — add the ${missingCount === 1 ? "last one" : "rest"} to begin your day.`}
          </Text>

          {[0, 1, 2].map((slot) => {
            const existing = sorted[slot];
            if (existing) {
              return (
                <View key={existing.id} style={styles.row}>
                  <View style={[styles.numFilled, { backgroundColor: colors.primary + "26", borderColor: colors.primary + "4D" }]}>
                    <Feather name="check" size={14} color={colors.primary} />
                  </View>
                  <View style={[styles.filledText, { backgroundColor: colors.primary + "0D", borderColor: colors.primary + "26" }]}>
                    <Text style={{ color: colors.foreground, fontFamily: fonts.body, fontSize: 15 }}>
                      {existing.text}
                    </Text>
                  </View>
                </View>
              );
            }
            const draftIdx = slot - total;
            return (
              <View key={slot} style={styles.row}>
                <View style={[styles.numEmpty, { borderColor: colors.primary + "4D" }]}>
                  <Text style={{ color: colors.primary, fontFamily: fonts.serifMedium, fontSize: 14 }}>
                    {slot + 1}
                  </Text>
                </View>
                <TextInput
                  value={drafts[draftIdx] ?? ""}
                  onChangeText={(v) =>
                    setDrafts((d) => d.map((x, idx) => (idx === draftIdx ? v : x)))
                  }
                  placeholder={PLACEHOLDERS[slot]}
                  placeholderTextColor={colors.mutedForeground + "99"}
                  style={[
                    styles.input,
                    { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
                  ]}
                  returnKeyType="done"
                />
              </View>
            );
          })}

          <Pressable
            onPress={handleSet}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primary, opacity: !canSave ? 0.4 : pressed ? 0.85 : 1 },
            ]}
          >
            {createIntention.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} size="small" />
            ) : (
              <>
                <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                  Set My Intentions
                </Text>
                <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
    );
  }

  // ---- Active state: track today's intentions ----
  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: contentTopPad, paddingBottom: contentBottomPad, paddingHorizontal: 20 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
      }
    >
      {Header}
      <View
        style={[
          styles.card,
          {
            backgroundColor: allDone ? colors.primary + "0F" : colors.card,
            borderColor: allDone ? colors.primary + "66" : colors.primary + "33",
          },
        ]}
      >
        <View style={styles.cardHead}>
          <View style={[styles.cardIcon, { backgroundColor: colors.primary + "26" }]}>
            <Feather name="sunrise" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>THE 333 METHOD</Text>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Today's Intentions</Text>
          </View>
        </View>

        <View style={styles.ringRow}>
          <View style={styles.ringWrap}>
            <CompletionRing completed={completed} total={total} />
            <Text style={[styles.ringLabel, { color: colors.mutedForeground }]}>
              {allDone ? "ALL COMPLETE" : `${completed} OF ${total} DONE`}
            </Text>
          </View>
        </View>

        <View style={{ gap: 6 }}>
          {sorted.map((intention) => {
            const isEditing = editingId === intention.id;
            const isBusy =
              (updateIntention.isPending && updateIntention.variables?.id === intention.id) ||
              (deleteIntention.isPending && deleteIntention.variables?.id === intention.id);

            if (isEditing) {
              return (
                <View
                  key={intention.id}
                  style={[styles.intentionRow, { backgroundColor: colors.muted + "40" }]}
                >
                  <TextInput
                    autoFocus
                    value={editText}
                    onChangeText={setEditText}
                    onSubmitEditing={() => saveEdit(intention)}
                    style={[
                      styles.editInput,
                      { backgroundColor: colors.background, borderColor: colors.primary + "66", color: colors.foreground },
                    ]}
                    returnKeyType="done"
                  />
                  <Pressable onPress={() => saveEdit(intention)} disabled={isBusy} hitSlop={8} style={styles.iconBtn}>
                    {isBusy ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Feather name="check" size={18} color={colors.primary} />
                    )}
                  </Pressable>
                  <Pressable onPress={cancelEdit} hitSlop={8} style={styles.iconBtn}>
                    <Feather name="x" size={18} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              );
            }

            return (
              <View key={intention.id} style={styles.intentionRow}>
                <Pressable
                  onPress={() => toggle(intention)}
                  disabled={isBusy}
                  style={styles.intentionMain}
                >
                  <Feather
                    name={intention.isCompleted ? "check-circle" : "circle"}
                    size={22}
                    color={intention.isCompleted ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.intentionText,
                      {
                        color: intention.isCompleted ? colors.mutedForeground : colors.foreground,
                        textDecorationLine: intention.isCompleted ? "line-through" : "none",
                      },
                    ]}
                  >
                    {intention.text}
                  </Text>
                </Pressable>
                <Pressable onPress={() => startEdit(intention)} disabled={isBusy} hitSlop={8} style={styles.iconBtn}>
                  <Feather name="edit-2" size={16} color={colors.mutedForeground} />
                </Pressable>
                <Pressable onPress={() => confirmRemove(intention)} disabled={isBusy} hitSlop={8} style={styles.iconBtn}>
                  <Feather name="trash-2" size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>
            );
          })}
        </View>

        {allDone && (
          <View style={[styles.doneNote, { borderColor: colors.primary + "26" }]}>
            <Feather name="award" size={16} color={colors.primary} />
            <Text style={[styles.doneText, { color: colors.primary }]}>
              All three, complete. That's how legacies get built — one day at a time.
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
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
    gap: 12,
  },
  greeting: { fontFamily: fonts.serifBold, fontSize: 30, lineHeight: 36 },
  date: { fontFamily: fonts.sub, fontSize: 15, marginTop: 4 },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 4,
  },
  streakPillText: { fontFamily: fonts.subSemibold, fontSize: 13 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 2 },
  cardTitle: { fontFamily: fonts.serif, fontSize: 22, marginTop: 2 },
  cardBody: { fontFamily: fonts.sub, fontSize: 14, lineHeight: 21, marginBottom: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  numEmpty: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  numFilled: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filledText: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  input: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 14,
    marginTop: 8,
  },
  primaryBtnText: { fontFamily: fonts.subSemibold, fontSize: 15 },
  ringRow: { alignItems: "center", marginBottom: 20 },
  ringWrap: { alignItems: "center", gap: 10 },
  ringLabel: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 1.5 },
  intentionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  intentionMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  intentionText: { flex: 1, fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
  editInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  iconBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  doneNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 14,
  },
  doneText: { flex: 1, fontFamily: fonts.serifItalic, fontSize: 14, lineHeight: 20 },
});
