import { Feather } from "@expo/vector-icons";
import {
  useGetWorkouts,
  useCreateWorkout,
  useUpdateWorkout,
  useDeleteWorkout,
  getGetWorkoutsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
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

type WorkoutFocus = "strength" | "cardio" | "mobility" | "hiit" | "recovery" | "mixed";

const FOCUS_OPTIONS: { value: WorkoutFocus; label: string; emoji: string; color: string }[] = [
  { value: "strength", label: "Strength", emoji: "🏋️", color: "#8b5cf6" },
  { value: "cardio",   label: "Cardio",   emoji: "🏃", color: "#f43f5e" },
  { value: "mobility", label: "Mobility", emoji: "🧘", color: "#06b6d4" },
  { value: "hiit",     label: "HIIT",     emoji: "⚡", color: "#f59e0b" },
  { value: "recovery", label: "Recovery", emoji: "🌿", color: "#10b981" },
  { value: "mixed",    label: "Mixed",    emoji: "🔥", color: "#8b5cf6" },
];

function getFocusColor(focus: string): string {
  return FOCUS_OPTIONS.find((f) => f.value === focus)?.color ?? "#8b5cf6";
}
function getFocusEmoji(focus: string): string {
  return FOCUS_OPTIONS.find((f) => f.value === focus)?.emoji ?? "🏋️";
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

// ─── Create Session Sheet ────────────────────────────────────────────────────

function CreateSessionSheet({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const colors = useColors();
  const s = styles(colors);
  const qc = useQueryClient();
  const createWorkout = useCreateWorkout();

  const [title, setTitle] = useState("");
  const [focus, setFocus] = useState<WorkoutFocus>("strength");
  const [date, setDate] = useState(toDateStr(new Date()));

  async function handleCreate() {
    const t = title.trim() || "Workout";
    try {
      await createWorkout.mutateAsync({
        data: { title: t, focus, date, notes: "" },
      });
      qc.invalidateQueries({ queryKey: getGetWorkoutsQueryKey() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onCreated();
    } catch {
      Alert.alert("Error", "Couldn't create the session. Please try again.");
    }
  }

  return (
    <ScrollView
      contentContainerStyle={s.sheetContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.sheetTitle}>Plan a session</Text>

      <Text style={s.sheetLabel}>Session name</Text>
      <TextInput
        style={[s.sheetInput, { color: colors.foreground }]}
        placeholder="e.g. Morning lift, Evening run…"
        placeholderTextColor={colors.mutedForeground}
        value={title}
        onChangeText={setTitle}
        autoFocus
        maxLength={60}
        returnKeyType="done"
      />

      <Text style={s.sheetLabel}>Focus</Text>
      <View style={s.focusGrid}>
        {FOCUS_OPTIONS.map((opt) => {
          const active = focus === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setFocus(opt.value)}
              style={({ pressed }) => [
                s.focusChip,
                {
                  borderColor: active ? opt.color : colors.border,
                  backgroundColor: active ? opt.color + "20" : colors.card,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text style={{ fontSize: 16 }}>{opt.emoji}</Text>
              <Text
                style={[
                  s.focusChipLabel,
                  { color: active ? opt.color : colors.mutedForeground },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={s.sheetBtns}>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [
            s.sheetBtn,
            { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[s.sheetBtnText, { color: colors.mutedForeground }]}>
            Cancel
          </Text>
        </Pressable>
        <Pressable
          onPress={handleCreate}
          disabled={createWorkout.isPending}
          style={({ pressed }) => [
            s.sheetBtn,
            {
              backgroundColor: colors.primary,
              borderColor: colors.primary,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          {createWorkout.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[s.sheetBtnText, { color: "#fff" }]}>Add session</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

// ─── Session Card ────────────────────────────────────────────────────────────

function SessionCard({
  session,
  onToggle,
  onDelete,
}: {
  session: { id: number; title: string; focus: string; date: string; status: string; notes?: string | null };
  onToggle: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();
  const s = styles(colors);
  const focusColor = getFocusColor(session.focus);
  const isCompleted = session.status === "completed";

  return (
    <Pressable
      onLongPress={onDelete}
      delayLongPress={500}
      style={({ pressed }) => [
        s.sessionCard,
        {
          opacity: pressed ? 0.85 : 1,
          borderColor: isCompleted ? focusColor + "40" : colors.border,
        },
      ]}
    >
      <Pressable
        onPress={onToggle}
        hitSlop={8}
        style={({ pressed }) => [
          s.checkCircle,
          {
            borderColor: isCompleted ? focusColor : colors.border,
            backgroundColor: isCompleted ? focusColor : "transparent",
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        {isCompleted && <Feather name="check" size={12} color="#fff" />}
      </Pressable>

      <View style={{ flex: 1 }}>
        <Text
          style={[
            s.sessionTitle,
            isCompleted && {
              textDecorationLine: "line-through",
              color: colors.mutedForeground,
            },
          ]}
          numberOfLines={1}
        >
          {session.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
          <Text style={{ fontSize: 13 }}>{getFocusEmoji(session.focus)}</Text>
          <Text style={s.sessionMeta}>
            {FOCUS_OPTIONS.find((f) => f.value === session.focus)?.label ?? session.focus} ·{" "}
            {formatDate(session.date)}
          </Text>
        </View>
      </View>

      <View
        style={[
          s.statusBadge,
          {
            backgroundColor: isCompleted ? focusColor + "20" : colors.muted + "80",
          },
        ]}
      >
        <Text
          style={[
            s.statusBadgeText,
            { color: isCompleted ? focusColor : colors.mutedForeground },
          ]}
        >
          {isCompleted ? "Done" : "Planned"}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function WorkoutsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const s = styles(colors);
  const qc = useQueryClient();

  const today = new Date();
  // Show rolling 30-day window: past 7 days + next 23 days
  const start = new Date(today);
  start.setDate(today.getDate() - 7);
  const end = new Date(today);
  end.setDate(today.getDate() + 23);

  const { data: sessions = [], isLoading, isError, refetch } = useGetWorkouts({
    start: toDateStr(start),
    end: toDateStr(end),
  });

  const updateWorkout = useUpdateWorkout();
  const deleteWorkout = useDeleteWorkout();

  const [showCreate, setShowCreate] = useState(false);

  const completedCount = sessions.filter((s) => s.status === "completed").length;

  function handleToggle(session: { id: number; status: string }) {
    const newStatus = session.status === "completed" ? "planned" : "completed";
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateWorkout.mutate(
      { id: session.id, data: { status: newStatus } },
      { onSuccess: () => qc.invalidateQueries({ queryKey: getGetWorkoutsQueryKey() }) }
    );
  }

  function handleDelete(session: { id: number; title: string }) {
    Alert.alert(
      "Delete session?",
      `"${session.title}" will be removed permanently.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            deleteWorkout.mutate(
              { id: session.id },
              {
                onSuccess: () =>
                  qc.invalidateQueries({ queryKey: getGetWorkoutsQueryKey() }),
              }
            ),
        },
      ]
    );
  }

  const upcoming = sessions.filter((s) => s.status !== "completed");
  const completed = sessions.filter((s) => s.status === "completed");

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
          <Text style={s.title}>Workouts</Text>
          <Text style={s.subtitle}>Train with intention</Text>
        </View>
        <Pressable
          onPress={() => setShowCreate(true)}
          hitSlop={10}
          style={({ pressed }) => [
            s.addBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          accessibilityLabel="Plan a session"
        >
          <Feather name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Stats strip */}
      <View style={s.statsRow}>
        <View style={s.statPill}>
          <Text style={[s.statValue, { color: colors.primary }]}>
            {sessions.length}
          </Text>
          <Text style={s.statLabel}>Scheduled</Text>
        </View>
        <View style={[s.statDivider, { backgroundColor: colors.border }]} />
        <View style={s.statPill}>
          <Text style={[s.statValue, { color: "#10b981" }]}>{completedCount}</Text>
          <Text style={s.statLabel}>Completed</Text>
        </View>
        <View style={[s.statDivider, { backgroundColor: colors.border }]} />
        <View style={s.statPill}>
          <Text style={[s.statValue, { color: colors.foreground }]}>
            {sessions.length - completedCount}
          </Text>
          <Text style={s.statLabel}>Remaining</Text>
        </View>
      </View>

      {/* Body */}
      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={s.centered}>
          <Text style={s.errorIcon}>⚠️</Text>
          <Text style={s.errorTitle}>Couldn't load workouts</Text>
          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [s.retryBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={s.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : sessions.length === 0 ? (
        <View style={s.centered}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>💪</Text>
          <Text style={s.emptyTitle}>No sessions yet</Text>
          <Text style={s.emptyBody}>
            Plan your first workout session to get started. Consistency is everything.
          </Text>
          <Pressable
            onPress={() => setShowCreate(true)}
            style={({ pressed }) => [s.emptyBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={s.emptyBtnText}>Plan a session</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={[
            ...upcoming.sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            ),
            ...completed.sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            ),
          ]}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: insets.bottom + WEB_BOTTOM_INSET + 24,
            gap: 10,
          }}
          ListHeaderComponent={
            upcoming.length > 0 && completed.length > 0 ? (
              <Text style={[s.sectionLabel, { marginBottom: 4 }]}>Upcoming</Text>
            ) : null
          }
          renderItem={({ item, index }) => {
            const isFirstCompleted =
              index === upcoming.length && completed.length > 0;
            return (
              <>
                {isFirstCompleted && (
                  <Text style={[s.sectionLabel, { marginTop: 8, marginBottom: 4 }]}>
                    Completed
                  </Text>
                )}
                <SessionCard
                  session={item}
                  onToggle={() => handleToggle(item)}
                  onDelete={() => handleDelete(item)}
                />
              </>
            );
          }}
        />
      )}

      {/* Create Session Modal */}
      <Modal
        visible={showCreate}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreate(false)}
      >
        <View style={[s.modalContainer, { backgroundColor: colors.background }]}>
          <View style={s.modalHandle} />
          <CreateSessionSheet
            onCreated={() => setShowCreate(false)}
            onCancel={() => setShowCreate(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.mutedForeground,
      marginTop: 1,
    },
    addBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 16,
      marginBottom: 16,
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 14,
    },
    statPill: { flex: 1, alignItems: "center" },
    statValue: {
      fontFamily: fonts.serif,
      fontSize: 22,
      lineHeight: 28,
    },
    statLabel: {
      fontFamily: fonts.subSemibold,
      fontSize: 11,
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginTop: 2,
    },
    statDivider: { width: 1, height: 32 },
    sectionLabel: {
      fontFamily: fonts.subSemibold,
      fontSize: 11,
      letterSpacing: 1.1,
      textTransform: "uppercase",
      color: colors.mutedForeground,
      paddingHorizontal: 4,
      marginTop: 4,
    },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
    },
    errorIcon: { fontSize: 40, marginBottom: 12 },
    errorTitle: {
      fontFamily: fonts.subSemibold,
      fontSize: 16,
      color: colors.foreground,
      marginBottom: 16,
      textAlign: "center",
    },
    retryBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 10,
    },
    retryText: {
      fontFamily: fonts.sub,
      fontSize: 14,
      color: "#fff",
    },
    emptyTitle: {
      fontFamily: fonts.serif,
      fontSize: 22,
      color: colors.foreground,
      marginBottom: 10,
      textAlign: "center",
    },
    emptyBody: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 21,
      marginBottom: 24,
    },
    emptyBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    emptyBtnText: { fontFamily: fonts.sub, fontSize: 15, color: "#fff" },
    // Session card
    sessionCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
    },
    checkCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    sessionTitle: {
      fontFamily: fonts.sub,
      fontSize: 15,
      color: colors.foreground,
    },
    sessionMeta: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.mutedForeground,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    statusBadgeText: {
      fontFamily: fonts.subSemibold,
      fontSize: 11,
      letterSpacing: 0.3,
    },
    // Create sheet
    modalContainer: { flex: 1, borderRadius: 20 },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginTop: 12,
      marginBottom: 4,
    },
    sheetContent: { padding: 24 },
    sheetTitle: {
      fontFamily: fonts.serif,
      fontSize: 26,
      color: colors.foreground,
      marginBottom: 24,
    },
    sheetLabel: {
      fontFamily: fonts.subSemibold,
      fontSize: 12,
      color: colors.mutedForeground,
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    sheetInput: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontFamily: fonts.body,
      fontSize: 16,
      marginBottom: 20,
    },
    focusGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 28,
    },
    focusChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
      borderWidth: 1.5,
    },
    focusChipLabel: {
      fontFamily: fonts.sub,
      fontSize: 13,
    },
    sheetBtns: { flexDirection: "row", gap: 12 },
    sheetBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    sheetBtnText: { fontFamily: fonts.sub, fontSize: 15 },
  });
}
