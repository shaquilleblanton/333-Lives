import { Feather } from "@expo/vector-icons";
import {
  getGetHabitsQueryKey,
  useCheckInHabit,
  useCreateHabit,
  useDeleteHabit,
  useGetHabits,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import { ErrorRetryView } from "@/components/ErrorRetryView";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

type MoodStatus = "great" | "okay" | "struggling";

const MOODS: { value: MoodStatus; emoji: string; label: string }[] = [
  { value: "great", emoji: "🔥", label: "Great" },
  { value: "okay", emoji: "😊", label: "Okay" },
  { value: "struggling", emoji: "😓", label: "Struggling" },
];

function moodEmoji(status: string | null | undefined): string {
  return MOODS.find((m) => m.value === status)?.emoji ?? "✓";
}

function moodDotColor(
  status: string | null,
  colors: ReturnType<typeof useColors>
): string {
  if (status === "struggling") return colors.destructive;
  if (status === "okay") return colors.secondary;
  return colors.primary; // "great" or any checked-in day defaults to gold
}

type RecentCheckin = { date: string; done: boolean; status: string | null };

export default function HabitsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const {
    data: habits,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useGetHabits();

  const checkIn = useCheckInHabit();
  const createHabit = useCreateHabit();
  const deleteHabit = useDeleteHabit();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  // Mood picker state
  const [moodTarget, setMoodTarget] = useState<number | null>(null);

  const all = (habits ?? []).filter((h) => !!h?.id);
  const completed = all.filter((h) => h.checkedInToday).length;
  const total = all.length;
  const allDone = total > 0 && completed === total;

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetHabitsQueryKey() });
  }

  function handleCheckIn(id: number, alreadyDone: boolean) {
    if (alreadyDone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMoodTarget(id);
  }

  function submitMood(status: MoodStatus) {
    const id = moodTarget;
    if (id == null) return;
    setMoodTarget(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    checkIn.mutate(
      { id, data: { status } },
      {
        onSuccess: invalidate,
        onError: () =>
          Alert.alert("Oops", "Couldn't check in. Please try again."),
      }
    );
  }

  function handleCreate() {
    if (!name.trim()) return;
    createHabit.mutate(
      { data: { name: name.trim(), description: desc.trim() || undefined } },
      {
        onSuccess: () => {
          invalidate();
          setName("");
          setDesc("");
          setCreateOpen(false);
        },
        onError: () => Alert.alert("Oops", "Couldn't create habit."),
      }
    );
  }

  function confirmDelete(id: number, habitName: string) {
    Alert.alert("Delete habit?", `"${habitName}" and all its check-in history will be removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteHabit.mutate(
            { id },
            {
              onSuccess: invalidate,
              onError: () => Alert.alert("Oops", "Couldn't delete habit."),
            }
          ),
      },
    ]);
  }

  const contentTopPad = insets.top + WEB_TOP_INSET + 12;
  const contentBottomPad = insets.bottom + WEB_BOTTOM_INSET + 100;

  if (isLoading) {
    return (
      <View style={[s.screen, s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return <ErrorRetryView message="Couldn't load your habits. Check your connection and try again." onRetry={refetch} />;
  }

  const moodTargetHabit = all.find((h) => h.id === moodTarget);

  return (
    <>
      <ScrollView
        style={[s.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={{
          paddingTop: contentTopPad,
          paddingBottom: contentBottomPad,
          paddingHorizontal: 20,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={[s.title, { color: colors.foreground }]}>Daily Habits</Text>
            <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
              {total === 0
                ? "Build your first streak"
                : allDone
                ? "All done for today 🔥"
                : `${completed} of ${total} complete`}
            </Text>
          </View>
          {total > 0 && (
            <View
              style={[
                s.progressPill,
                {
                  backgroundColor: allDone
                    ? colors.primary + "20"
                    : colors.muted,
                  borderColor: allDone
                    ? colors.primary + "50"
                    : colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: allDone ? colors.primary : colors.mutedForeground,
                  fontFamily: fonts.serifMedium,
                  fontSize: 18,
                }}
              >
                {completed}
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: fonts.sub,
                  fontSize: 13,
                }}
              >
                /{total}
              </Text>
            </View>
          )}
        </View>

        {/* ── Progress bar ── */}
        {total > 0 && (
          <View
            style={[s.progressTrack, { backgroundColor: colors.muted }]}
          >
            <View
              style={[
                s.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${Math.round((completed / total) * 100)}%` as any,
                },
              ]}
            />
          </View>
        )}

        {/* ── Habit list ── */}
        {all.length === 0 ? (
          <View style={s.empty}>
            <View
              style={[
                s.emptyIcon,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <Feather name="activity" size={30} color={colors.primary} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.foreground }]}>
              No habits yet
            </Text>
            <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
              Tap "Add Habit" to start building your first streak.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10, marginTop: 20 }}>
            {all.map((h) => {
              const isBusy =
                checkIn.isPending &&
                (checkIn.variables as any)?.id === h.id;
              const todayStatus = (h as any).todayStatus as string | null | undefined;

              const recentCheckins = (h as any).recentCheckins as RecentCheckin[] | undefined;
              const isToday = (date: string) => date === recentCheckins?.[6]?.date;

              return (
                <Pressable
                  key={h.id}
                  onPress={() => handleCheckIn(h.id, h.checkedInToday)}
                  onLongPress={() => confirmDelete(h.id, h.name)}
                  delayLongPress={500}
                  style={({ pressed }) => [
                    s.card,
                    {
                      backgroundColor: h.checkedInToday
                        ? colors.primary + "0F"
                        : colors.card,
                      borderColor: h.checkedInToday
                        ? colors.primary + "55"
                        : colors.border,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  {/* ── Main row: circle · name · streak ── */}
                  <View style={s.cardRow}>
                    {/* Check circle / mood indicator */}
                    <View
                      style={[
                        s.checkCircle,
                        {
                          borderColor: h.checkedInToday
                            ? colors.primary
                            : colors.border,
                          backgroundColor: h.checkedInToday
                            ? colors.primary
                            : "transparent",
                        },
                      ]}
                    >
                      {isBusy ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : h.checkedInToday ? (
                        todayStatus ? (
                          <Text style={{ fontSize: 14 }}>
                            {moodEmoji(todayStatus)}
                          </Text>
                        ) : (
                          <Feather
                            name="check"
                            size={16}
                            color={colors.primaryForeground}
                          />
                        )
                      ) : null}
                    </View>

                    {/* Text */}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          s.habitName,
                          {
                            color: h.checkedInToday
                              ? colors.primary
                              : colors.foreground,
                            textDecorationLine: h.checkedInToday
                              ? "line-through"
                              : "none",
                            opacity: h.checkedInToday ? 0.8 : 1,
                          },
                        ]}
                      >
                        {h.name ?? "Unnamed Habit"}
                      </Text>
                      {h.description ? (
                        <Text
                          style={[s.habitDesc, { color: colors.mutedForeground }]}
                          numberOfLines={1}
                        >
                          {h.description}
                        </Text>
                      ) : null}
                    </View>

                    {/* Streak badge */}
                    {(h.currentStreak ?? 0) > 0 && (
                      <View
                        style={[
                          s.streakBadge,
                          {
                            backgroundColor: colors.primary + "18",
                            borderColor: colors.primary + "40",
                          },
                        ]}
                      >
                        <Feather name="zap" size={11} color={colors.primary} />
                        <Text
                          style={{
                            color: colors.primary,
                            fontFamily: fonts.sub,
                            fontSize: 12,
                            marginLeft: 3,
                          }}
                        >
                          {h.currentStreak}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* ── 7-day streak dots ── */}
                  {recentCheckins && recentCheckins.length === 7 && (
                    <View style={[s.dotsStrip, { borderTopColor: colors.border + "40" }]}>
                      {recentCheckins.map((day) => {
                        const label = new Date(day.date + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "narrow" });
                        const dotBg = day.done ? moodDotColor(day.status, colors) : colors.muted;
                        const today = isToday(day.date);
                        return (
                          <View key={day.date} style={s.dotCol}>
                            <Text style={[s.dotLabel, { color: today ? colors.primary : colors.mutedForeground, fontFamily: today ? fonts.subSemibold : fonts.sub }]}>
                              {label}
                            </Text>
                            <View
                              style={[
                                s.dot,
                                {
                                  backgroundColor: dotBg,
                                  opacity: day.done ? 1 : 0.25,
                                  width: today ? 10 : 8,
                                  height: today ? 10 : 8,
                                  borderRadius: today ? 5 : 4,
                                },
                              ]}
                            />
                          </View>
                        );
                      })}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* ── Add button ── */}
        <Pressable
          onPress={() => setCreateOpen(true)}
          style={({ pressed }) => [
            s.addBtn,
            {
              borderColor: colors.primary + "50",
              backgroundColor: colors.primary + "0A",
              opacity: pressed ? 0.75 : 1,
              marginTop: all.length === 0 ? 20 : 24,
            },
          ]}
        >
          <Feather name="plus" size={18} color={colors.primary} />
          <Text
            style={{
              color: colors.primary,
              fontFamily: fonts.sub,
              fontSize: 14,
              marginLeft: 6,
            }}
          >
            Add Habit
          </Text>
        </Pressable>

        {all.length > 0 && (
          <Text
            style={[s.hint, { color: colors.mutedForeground }]}
          >
            Tap to check in · Hold to delete
          </Text>
        )}
      </ScrollView>

      {/* ── Mood picker modal ── */}
      <Modal
        visible={moodTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setMoodTarget(null)}
      >
        <View style={s.modalBg}>
          <View
            style={[
              s.modalSheet,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[s.modalTitle, { color: colors.foreground }]}>
              How did it go?
            </Text>
            {moodTargetHabit && (
              <Text style={[s.moodHabitName, { color: colors.mutedForeground }]}>
                {moodTargetHabit.name}
              </Text>
            )}

            <View style={s.moodRow}>
              {MOODS.map((m) => (
                <Pressable
                  key={m.value}
                  onPress={() => submitMood(m.value)}
                  style={({ pressed }) => [
                    s.moodBtn,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text style={s.moodEmoji}>{m.emoji}</Text>
                  <Text style={[s.moodLabel, { color: colors.foreground }]}>
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => setMoodTarget(null)}
              style={[s.cancelBtn, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.mutedForeground, fontFamily: fonts.sub }}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Create modal ── */}
      <Modal
        visible={createOpen}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!createHabit.isPending) { setCreateOpen(false); setName(""); setDesc(""); } }}
      >
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={s.modalBg}>
          <View
            style={[
              s.modalSheet,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[s.modalTitle, { color: colors.foreground }]}>
              New Habit
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Morning meditation, read 10 pages…"
              placeholderTextColor={colors.mutedForeground}
              style={[
                s.input,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              autoFocus
              returnKeyType="next"
            />
            <TextInput
              value={desc}
              onChangeText={setDesc}
              placeholder="Why does this matter? (optional)"
              placeholderTextColor={colors.mutedForeground}
              style={[
                s.input,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  marginTop: 10,
                },
              ]}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <View style={s.modalBtns}>
              <Pressable
                onPress={() => {
                  if (createHabit.isPending) return;
                  setCreateOpen(false);
                  setName("");
                  setDesc("");
                }}
                disabled={createHabit.isPending}
                style={[s.modalBtn, { borderColor: colors.border, opacity: createHabit.isPending ? 0.4 : 1 }]}
              >
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontFamily: fonts.sub,
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleCreate}
                disabled={!name.trim() || createHabit.isPending}
                style={[
                  s.modalBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity:
                      !name.trim() || createHabit.isPending ? 0.45 : 1,
                  },
                ]}
              >
                {createHabit.isPending ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.primaryForeground}
                  />
                ) : (
                  <Text
                    style={{
                      color: colors.primaryForeground,
                      fontFamily: fonts.sub,
                    }}
                  >
                    Create
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}


  const {
    data: habits,
    isLoading,
    refetch,
    isRefetching,
  } = useGetHabits();

  const checkIn = useCheckInHabit();
  const createHabit = useCreateHabit();
  const deleteHabit = useDeleteHabit();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  // Mood picker state
  const [moodTarget, setMoodTarget] = useState<number | null>(null);

  const all = habits ?? [];
  const completed = all.filter((h) => h.checkedInToday).length;
  const total = all.length;
  const allDone = total > 0 && completed === total;

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetHabitsQueryKey() });
  }

  function handleCheckIn(id: number, alreadyDone: boolean) {
    if (alreadyDone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMoodTarget(id);
  }

  function submitMood(status: MoodStatus) {
    const id = moodTarget;
    if (id == null) return;
    setMoodTarget(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    checkIn.mutate(
      { id, data: { status } },
      {
        onSuccess: invalidate,
        onError: () =>
          Alert.alert("Oops", "Couldn't check in. Please try again."),
      }
    );
  }

  function handleCreate() {
    if (!name.trim()) return;
    createHabit.mutate(
      { data: { name: name.trim(), description: desc.trim() || undefined } },
      {
        onSuccess: () => {
          invalidate();
          setName("");
          setDesc("");
          setCreateOpen(false);
        },
        onError: () => Alert.alert("Oops", "Couldn't create habit."),
      }
    );
  }

  function confirmDelete(id: number, habitName: string) {
    Alert.alert("Delete habit?", `"${habitName}" and all its check-in history will be removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteHabit.mutate(
            { id },
            {
              onSuccess: invalidate,
              onError: () => Alert.alert("Oops", "Couldn't delete habit."),
            }
          ),
      },
    ]);
  }

  const contentTopPad = insets.top + WEB_TOP_INSET + 12;
  const contentBottomPad = insets.bottom + WEB_BOTTOM_INSET + 100;

  if (isLoading) {
    return (
      <View style={[s.screen, s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const moodTargetHabit = all.find((h) => h.id === moodTarget);

  return (
    <>
      <ScrollView
        style={[s.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={{
          paddingTop: contentTopPad,
          paddingBottom: contentBottomPad,
          paddingHorizontal: 20,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={[s.title, { color: colors.foreground }]}>Daily Habits</Text>
            <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
              {total === 0
                ? "Build your first streak"
                : allDone
                ? "All done for today 🔥"
                : `${completed} of ${total} complete`}
            </Text>
          </View>
          {total > 0 && (
            <View
              style={[
                s.progressPill,
                {
                  backgroundColor: allDone
                    ? colors.primary + "20"
                    : colors.muted,
                  borderColor: allDone
                    ? colors.primary + "50"
                    : colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: allDone ? colors.primary : colors.mutedForeground,
                  fontFamily: fonts.serifMedium,
                  fontSize: 18,
                }}
              >
                {completed}
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: fonts.sub,
                  fontSize: 13,
                }}
              >
                /{total}
              </Text>
            </View>
          )}
        </View>

        {/* ── Progress bar ── */}
        {total > 0 && (
          <View
            style={[s.progressTrack, { backgroundColor: colors.muted }]}
          >
            <View
              style={[
                s.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${Math.round((completed / total) * 100)}%` as any,
                },
              ]}
            />
          </View>
        )}

        {/* ── Habit list ── */}
        {all.length === 0 ? (
          <View style={s.empty}>
            <View
              style={[
                s.emptyIcon,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <Feather name="activity" size={30} color={colors.primary} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.foreground }]}>
              No habits yet
            </Text>
            <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
              Tap "Add Habit" to start building your first streak.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10, marginTop: 20 }}>
            {all.map((h) => {
              const isBusy =
                checkIn.isPending &&
                (checkIn.variables as any)?.id === h.id;
              const todayStatus = (h as any).todayStatus as string | null | undefined;

              return (
                <Pressable
                  key={h.id}
                  onPress={() => handleCheckIn(h.id, h.checkedInToday)}
                  onLongPress={() => confirmDelete(h.id, h.name)}
                  delayLongPress={500}
                  style={({ pressed }) => [
                    s.card,
                    {
                      backgroundColor: h.checkedInToday
                        ? colors.primary + "0F"
                        : colors.card,
                      borderColor: h.checkedInToday
                        ? colors.primary + "55"
                        : colors.border,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  {/* Top row: check circle + name + streak */}
                  <View style={s.cardRow}>
                    {/* Check circle / mood indicator */}
                    <View
                      style={[
                        s.checkCircle,
                        {
                          borderColor: h.checkedInToday
                            ? colors.primary
                            : colors.border,
                          backgroundColor: h.checkedInToday
                            ? colors.primary
                            : "transparent",
                        },
                      ]}
                    >
                      {isBusy ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : h.checkedInToday ? (
                        todayStatus ? (
                          <Text style={{ fontSize: 14 }}>
                            {moodEmoji(todayStatus)}
                          </Text>
                        ) : (
                          <Feather
                            name="check"
                            size={16}
                            color={colors.primaryForeground}
                          />
                        )
                      ) : null}
                    </View>

                    {/* Text */}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          s.habitName,
                          {
                            color: h.checkedInToday
                              ? colors.primary
                              : colors.foreground,
                            textDecorationLine: h.checkedInToday
                              ? "line-through"
                              : "none",
                            opacity: h.checkedInToday ? 0.8 : 1,
                          },
                        ]}
                      >
                        {h.name}
                      </Text>
                      {h.description ? (
                        <Text
                          style={[
                            s.habitDesc,
                            { color: colors.mutedForeground },
                          ]}
                          numberOfLines={1}
                        >
                          {h.description}
                        </Text>
                      ) : null}
                    </View>

                    {/* Streak badge */}
                    {h.currentStreak > 0 && (
                      <View
                        style={[
                          s.streakBadge,
                          {
                            backgroundColor: colors.primary + "18",
                            borderColor: colors.primary + "40",
                          },
                        ]}
                      >
                        <Feather
                          name="zap"
                          size={11}
                          color={colors.primary}
                        />
                        <Text
                          style={{
                            color: colors.primary,
                            fontFamily: fonts.sub,
                            fontSize: 12,
                            marginLeft: 3,
                          }}
                        >
                          {h.currentStreak}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* 7-day mini calendar */}
                  <WeekDots
                    recentDates={h.recentDates ?? []}
                    primaryColor={colors.primary}
                    mutedColor={colors.muted}
                    mutedTextColor={colors.mutedForeground}
                  />
                </Pressable>
              );
            })}
          </View>
        )}

        {/* ── Add button ── */}
        <Pressable
          onPress={() => setCreateOpen(true)}
          style={({ pressed }) => [
            s.addBtn,
            {
              borderColor: colors.primary + "50",
              backgroundColor: colors.primary + "0A",
              opacity: pressed ? 0.75 : 1,
              marginTop: all.length === 0 ? 20 : 24,
            },
          ]}
        >
          <Feather name="plus" size={18} color={colors.primary} />
          <Text
            style={{
              color: colors.primary,
              fontFamily: fonts.sub,
              fontSize: 14,
              marginLeft: 6,
            }}
          >
            Add Habit
          </Text>
        </Pressable>

        {all.length > 0 && (
          <Text
            style={[s.hint, { color: colors.mutedForeground }]}
          >
            Tap to check in · Hold to delete
          </Text>
        )}
      </ScrollView>

      {/* ── Mood picker modal ── */}
      <Modal
        visible={moodTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setMoodTarget(null)}
      >
        <View style={s.modalBg}>
          <View
            style={[
              s.modalSheet,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[s.modalTitle, { color: colors.foreground }]}>
              How did it go?
            </Text>
            {moodTargetHabit && (
              <Text style={[s.moodHabitName, { color: colors.mutedForeground }]}>
                {moodTargetHabit.name}
              </Text>
            )}

            <View style={s.moodRow}>
              {MOODS.map((m) => (
                <Pressable
                  key={m.value}
                  onPress={() => submitMood(m.value)}
                  style={({ pressed }) => [
                    s.moodBtn,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text style={s.moodEmoji}>{m.emoji}</Text>
                  <Text style={[s.moodLabel, { color: colors.foreground }]}>
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => setMoodTarget(null)}
              style={[s.cancelBtn, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.mutedForeground, fontFamily: fonts.sub }}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Create modal ── */}
      <Modal
        visible={createOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateOpen(false)}
      >
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={s.modalBg}>
          <View
            style={[
              s.modalSheet,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[s.modalTitle, { color: colors.foreground }]}>
              New Habit
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Morning meditation, read 10 pages…"
              placeholderTextColor={colors.mutedForeground}
              style={[
                s.input,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              autoFocus
              returnKeyType="next"
            />
            <TextInput
              value={desc}
              onChangeText={setDesc}
              placeholder="Why does this matter? (optional)"
              placeholderTextColor={colors.mutedForeground}
              style={[
                s.input,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  marginTop: 10,
                },
              ]}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <View style={s.modalBtns}>
              <Pressable
                onPress={() => {
                  setCreateOpen(false);
                  setName("");
                  setDesc("");
                }}
                style={[s.modalBtn, { borderColor: colors.border }]}
              >
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontFamily: fonts.sub,
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleCreate}
                disabled={!name.trim() || createHabit.isPending}
                style={[
                  s.modalBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity:
                      !name.trim() || createHabit.isPending ? 0.45 : 1,
                  },
                ]}
              >
                {createHabit.isPending ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.primaryForeground}
                  />
                ) : (
                  <Text
                    style={{
                      color: colors.primaryForeground,
                      fontFamily: fonts.sub,
                    }}
                  >
                    Create
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 26,
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: fonts.sub,
    fontSize: 13,
    marginTop: 2,
  },
  progressPill: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 52,
    justifyContent: "center",
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  card: {
    flexDirection: "column",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  dotsStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
  },
  dotCol: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  dotLabel: {
    fontSize: 9,
  },
  dot: {
    borderRadius: 4,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  habitName: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 20,
  },
  habitDesc: {
    fontFamily: fonts.sub,
    fontSize: 12,
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  empty: {
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  hint: {
    fontFamily: fonts.sub,
    fontSize: 11,
    textAlign: "center",
    marginTop: 14,
    letterSpacing: 0.3,
  },
  // Mood picker
  moodHabitName: {
    fontFamily: fonts.sub,
    fontSize: 13,
    marginTop: -8,
    marginBottom: 20,
  },
  moodRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  moodBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  moodEmoji: {
    fontSize: 28,
  },
  moodLabel: {
    fontFamily: fonts.sub,
    fontSize: 12,
  },
  cancelBtn: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  // Modal
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  modalBtns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  modalBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
});

    gap: 12,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 26,
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: fonts.sub,
    fontSize: 13,
    marginTop: 2,
  },
  progressPill: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 52,
    justifyContent: "center",
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  habitName: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 20,
  },
  habitDesc: {
    fontFamily: fonts.sub,
    fontSize: 12,
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  empty: {
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  hint: {
    fontFamily: fonts.sub,
    fontSize: 11,
    textAlign: "center",
    marginTop: 14,
    letterSpacing: 0.3,
  },
  // Mood picker
  moodHabitName: {
    fontFamily: fonts.sub,
    fontSize: 13,
    marginTop: -8,
    marginBottom: 20,
  },
  moodRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  moodBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  moodEmoji: {
    fontSize: 28,
  },
  moodLabel: {
    fontFamily: fonts.sub,
    fontSize: 12,
  },
  cancelBtn: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  // Modal
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  modalBtns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  modalBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
});
