import { Feather } from "@expo/vector-icons";
import {
  useGetHabits,
  useCheckInHabit,
  useCreateHabit,
  getGetHabitsQueryKey,
  useGetGoals,
  useCreateGoal,
  getGetGoalsQueryKey,
  useGetJournalEntries,
  useCreateJournalEntry,
  getGetJournalEntriesQueryKey,
} from "@workspace/api-client-react";
import type { Habit, Goal, JournalEntry } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
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

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

type Tab = "habits" | "goals" | "journal";

const GOAL_CATEGORIES = ["personal", "financial", "health", "relationships", "career", "spiritual"] as const;
const MOODS = ["great", "good", "okay", "rough", "struggling"] as const;
type Mood = typeof MOODS[number];

const MOOD_COLORS: Record<Mood, string> = {
  great: "#34d399",
  good: "#38bdf8",
  okay: "#fbbf24",
  rough: "#fb923c",
  struggling: "#f87171",
};

// ── Habits ──────────────────────────────────────────────────────────────
function HabitsSection({ colors }: { colors: ReturnType<typeof useColors> }) {
  const qc = useQueryClient();
  const { data: habits, isLoading, refetch, isRefetching } = useGetHabits();
  const checkIn = useCheckInHabit();
  const createHabit = useCreateHabit();
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  function invalidate() { qc.invalidateQueries({ queryKey: getGetHabitsQueryKey() }); }

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      await createHabit.mutateAsync({ data: { name: name.trim(), description: desc.trim() || undefined } as any });
      invalidate();
      setFormOpen(false);
      setName(""); setDesc("");
    } catch { Alert.alert("Couldn't save habit", "Please try again."); }
  }

  function doCheckIn(id: number) {
    checkIn.mutate({ id, data: { status: "great" } as any }, {
      onSuccess: invalidate,
      onError: () => Alert.alert("Couldn't check in", "Please try again."),
    });
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}>
      <View style={[sStyles.row, { marginBottom: 16 }]}>
        <Text style={[sStyles.sectionTitle, { color: colors.foreground }]}>Daily Habits</Text>
        <Pressable onPress={() => setFormOpen(true)} style={[sStyles.addBtn, { backgroundColor: colors.primary }]}>
          <Feather name="plus" size={16} color={colors.primaryForeground} />
        </Pressable>
      </View>

      {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> :
        (habits ?? []).length === 0 ? (
          <View style={sStyles.empty}>
            <Feather name="activity" size={36} color={colors.mutedForeground + "50"} />
            <Text style={[sStyles.emptyTitle, { color: colors.foreground }]}>No habits yet</Text>
            <Text style={[sStyles.emptySub, { color: colors.mutedForeground }]}>Small actions, compounded daily.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {(habits ?? []).map(h => {
              const checkedToday = h.checkedInToday;
              return (
                <View key={h.id} style={[sStyles.card, { backgroundColor: colors.card, borderColor: checkedToday ? colors.primary + "40" : colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[sStyles.cardTitle, { color: colors.foreground }]}>{h.name}</Text>
                    {h.description ? <Text style={[sStyles.cardSub, { color: colors.mutedForeground }]}>{h.description}</Text> : null}
                    <Text style={[sStyles.cardMeta, { color: colors.mutedForeground }]}>
                      {h.currentStreak} day streak
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => !checkedToday && doCheckIn(h.id)}
                    style={[sStyles.checkBtn, { backgroundColor: checkedToday ? colors.primary + "1A" : colors.muted + "40", borderColor: checkedToday ? colors.primary + "60" : colors.border }]}
                  >
                    <Feather name={checkedToday ? "check" : "circle"} size={18} color={checkedToday ? colors.primary : colors.mutedForeground} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )
      }

      <Modal visible={formOpen} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable style={sStyles.overlay} onPress={() => setFormOpen(false)} />
          <View style={[sStyles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[sStyles.sheetTitle, { color: colors.foreground }]}>New Habit</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Habit name" placeholderTextColor={colors.mutedForeground + "99"} autoFocus
              style={[sStyles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} />
            <TextInput value={desc} onChangeText={setDesc} placeholder="Description (optional)" placeholderTextColor={colors.mutedForeground + "99"}
              style={[sStyles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} />
            <Pressable onPress={handleCreate} disabled={!name.trim() || createHabit.isPending}
              style={[sStyles.saveBtn, { backgroundColor: colors.primary, opacity: !name.trim() || createHabit.isPending ? 0.5 : 1 }]}>
              {createHabit.isPending ? <ActivityIndicator color="#000" size="small" /> : <Text style={[sStyles.saveBtnText, { color: colors.primaryForeground }]}>Create Habit</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

// ── Goals ──────────────────────────────────────────────────────────────
function GoalsSection({ colors }: { colors: ReturnType<typeof useColors> }) {
  const qc = useQueryClient();
  const { data: goals, isLoading, refetch, isRefetching } = useGetGoals();
  const createGoal = useCreateGoal();
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<typeof GOAL_CATEGORIES[number]>("personal");

  function invalidate() { qc.invalidateQueries({ queryKey: getGetGoalsQueryKey() }); }

  async function handleCreate() {
    if (!title.trim()) return;
    try {
      await createGoal.mutateAsync({ data: { title: title.trim(), category, status: "active" } as any });
      invalidate();
      setFormOpen(false);
      setTitle("");
    } catch { Alert.alert("Couldn't save goal", "Please try again."); }
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}>
      <View style={[sStyles.row, { marginBottom: 16 }]}>
        <Text style={[sStyles.sectionTitle, { color: colors.foreground }]}>Goals</Text>
        <Pressable onPress={() => setFormOpen(true)} style={[sStyles.addBtn, { backgroundColor: colors.primary }]}>
          <Feather name="plus" size={16} color={colors.primaryForeground} />
        </Pressable>
      </View>

      {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> :
        (goals ?? []).length === 0 ? (
          <View style={sStyles.empty}>
            <Feather name="target" size={36} color={colors.mutedForeground + "50"} />
            <Text style={[sStyles.emptyTitle, { color: colors.foreground }]}>No goals set</Text>
            <Text style={[sStyles.emptySub, { color: colors.mutedForeground }]}>Set a goal and pursue it with intention.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {(goals ?? []).map(g => (
              <View key={g.id} style={[sStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[sStyles.cardTitle, { color: colors.foreground }]}>{g.title}</Text>
                  <Text style={[sStyles.cardMeta, { color: colors.mutedForeground }]}>
                    {g.category} · {g.isCompleted ? "completed" : "active"}
                    {g.targetDate ? ` · ${new Date(g.targetDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                  </Text>
                  {typeof g.progress === "number" ? (
                    <View style={{ marginTop: 8 }}>
                      <View style={[sStyles.progressBar, { backgroundColor: colors.border }]}>
                        <View style={[sStyles.progressFill, { backgroundColor: colors.primary, width: `${g.progress}%` as any }]} />
                      </View>
                      <Text style={[sStyles.cardMeta, { color: colors.mutedForeground, marginTop: 4 }]}>{g.progress}% complete</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )
      }

      <Modal visible={formOpen} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable style={sStyles.overlay} onPress={() => setFormOpen(false)} />
          <View style={[sStyles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[sStyles.sheetTitle, { color: colors.foreground }]}>New Goal</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="What do you want to achieve?" placeholderTextColor={colors.mutedForeground + "99"} autoFocus
              style={[sStyles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} />
            <Text style={[sStyles.fieldLabel, { color: colors.mutedForeground }]}>Category</Text>
            <View style={sStyles.pills}>
              {GOAL_CATEGORIES.map(c => (
                <Pressable key={c} onPress={() => setCategory(c)}
                  style={[sStyles.pill, { borderColor: category === c ? colors.primary : colors.border, backgroundColor: category === c ? colors.primary + "1A" : "transparent" }]}>
                  <Text style={[sStyles.pillText, { color: category === c ? colors.primary : colors.mutedForeground }]}>{c}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={handleCreate} disabled={!title.trim() || createGoal.isPending}
              style={[sStyles.saveBtn, { backgroundColor: colors.primary, opacity: !title.trim() || createGoal.isPending ? 0.5 : 1 }]}>
              {createGoal.isPending ? <ActivityIndicator color="#000" size="small" /> : <Text style={[sStyles.saveBtnText, { color: colors.primaryForeground }]}>Set Goal</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

// ── Journal ──────────────────────────────────────────────────────────────
function JournalSection({ colors }: { colors: ReturnType<typeof useColors> }) {
  const qc = useQueryClient();
  const { data: entries, isLoading, refetch, isRefetching } = useGetJournalEntries();
  const createEntry = useCreateJournalEntry();
  const [formOpen, setFormOpen] = useState(false);
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<Mood>("good");

  function invalidate() { qc.invalidateQueries({ queryKey: getGetJournalEntriesQueryKey() }); }

  async function handleCreate() {
    if (!content.trim()) return;
    try {
      const date = new Date().toISOString().split("T")[0];
      await createEntry.mutateAsync({ data: { content: content.trim(), mood, date } as any });
      invalidate();
      setFormOpen(false);
      setContent(""); setMood("good");
    } catch { Alert.alert("Couldn't save entry", "Please try again."); }
  }

  const sorted = [...(entries ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}>
      <View style={[sStyles.row, { marginBottom: 16 }]}>
        <Text style={[sStyles.sectionTitle, { color: colors.foreground }]}>Journal</Text>
        <Pressable onPress={() => setFormOpen(true)} style={[sStyles.addBtn, { backgroundColor: colors.primary }]}>
          <Feather name="plus" size={16} color={colors.primaryForeground} />
        </Pressable>
      </View>

      {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> :
        sorted.length === 0 ? (
          <View style={sStyles.empty}>
            <Feather name="book-open" size={36} color={colors.mutedForeground + "50"} />
            <Text style={[sStyles.emptyTitle, { color: colors.foreground }]}>No entries yet</Text>
            <Text style={[sStyles.emptySub, { color: colors.mutedForeground }]}>Write your first reflection.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {sorted.map(e => {
              const moodColor = MOOD_COLORS[(e.mood as Mood) ?? "good"] ?? colors.primary;
              return (
                <View key={e.id} style={[sStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={sStyles.row}>
                    <Text style={[sStyles.cardDate, { color: colors.mutedForeground }]}>
                      {new Date(e.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </Text>
                    {e.mood ? (
                      <View style={[sStyles.moodBadge, { backgroundColor: moodColor + "1A", borderColor: moodColor + "40" }]}>
                        <Text style={[sStyles.moodText, { color: moodColor }]}>{e.mood}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[sStyles.entryText, { color: colors.foreground }]} numberOfLines={4}>{e.content}</Text>
                </View>
              );
            })}
          </View>
        )
      }

      <Modal visible={formOpen} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable style={sStyles.overlay} onPress={() => setFormOpen(false)} />
          <View style={[sStyles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[sStyles.sheetTitle, { color: colors.foreground }]}>New Entry</Text>
            <Text style={[sStyles.fieldLabel, { color: colors.mutedForeground }]}>How are you feeling?</Text>
            <View style={sStyles.pills}>
              {MOODS.map(m => (
                <Pressable key={m} onPress={() => setMood(m)}
                  style={[sStyles.pill, { borderColor: mood === m ? MOOD_COLORS[m] : colors.border, backgroundColor: mood === m ? MOOD_COLORS[m] + "1A" : "transparent" }]}>
                  <Text style={[sStyles.pillText, { color: mood === m ? MOOD_COLORS[m] : colors.mutedForeground }]}>{m}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput value={content} onChangeText={setContent} placeholder="What's on your mind today?" placeholderTextColor={colors.mutedForeground + "99"} multiline numberOfLines={6} textAlignVertical="top" autoFocus
              style={[sStyles.input, sStyles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} />
            <Pressable onPress={handleCreate} disabled={!content.trim() || createEntry.isPending}
              style={[sStyles.saveBtn, { backgroundColor: colors.primary, opacity: !content.trim() || createEntry.isPending ? 0.5 : 1 }]}>
              {createEntry.isPending ? <ActivityIndicator color="#000" size="small" /> : <Text style={[sStyles.saveBtnText, { color: colors.primaryForeground }]}>Save Entry</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

// ── Root Screen ──────────────────────────────────────────────────────────────
export default function GrowthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("habits");

  const topPad = insets.top + WEB_TOP_INSET + 12;
  const botPad = insets.bottom + WEB_BOTTOM_INSET + 24;

  const TABS: { key: Tab; label: string }[] = [
    { key: "habits", label: "Habits" },
    { key: "goals", label: "Goals" },
    { key: "journal", label: "Journal" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: topPad }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20 }}>
        <View style={sStyles.pageHeader}>
          <Pressable onPress={() => router.back()} style={sStyles.backBtn} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[sStyles.pageTitle, { color: colors.foreground }]}>Growth Hub</Text>
        </View>

        {/* Tab bar */}
        <View style={[sStyles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {TABS.map(t => (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[sStyles.tabItem, tab === t.key && { backgroundColor: colors.primary + "20" }]}
            >
              <Text style={[sStyles.tabLabel, { color: tab === t.key ? colors.primary : colors.mutedForeground }]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: botPad }}>
        {tab === "habits" ? <HabitsSection colors={colors} /> :
         tab === "goals" ? <GoalsSection colors={colors} /> :
         <JournalSection colors={colors} />}
      </View>
    </View>
  );
}

const sStyles = StyleSheet.create({
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  backBtn: { padding: 4 },
  pageTitle: { fontFamily: fonts.serifBold, fontSize: 28 },
  tabBar: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 4, marginBottom: 4 },
  tabItem: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 },
  tabLabel: { fontFamily: fonts.subSemibold, fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontFamily: fonts.serif, fontSize: 22 },
  addBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  cardTitle: { fontFamily: fonts.bodyMedium, fontSize: 15 },
  cardSub: { fontFamily: fonts.sub, fontSize: 13, marginTop: 2, lineHeight: 18 },
  cardMeta: { fontFamily: fonts.sub, fontSize: 11, marginTop: 4, textTransform: "capitalize" },
  cardDate: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" },
  entryText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginTop: 8 },
  checkBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  progressBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  moodBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  moodText: { fontFamily: fonts.sub, fontSize: 11, textTransform: "capitalize" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20 },
  emptySub: { fontFamily: fonts.sub, fontSize: 14, textAlign: "center" },
  overlay: { flex: 1 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 24, paddingBottom: 40, gap: 12 },
  sheetTitle: { fontFamily: fonts.serif, fontSize: 22, marginBottom: 4 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontFamily: fonts.body, fontSize: 14 },
  textArea: { minHeight: 140, textAlignVertical: "top" },
  fieldLabel: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  pillText: { fontFamily: fonts.sub, fontSize: 12, textTransform: "capitalize" },
  saveBtn: { borderRadius: 999, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveBtnText: { fontFamily: fonts.subSemibold, fontSize: 15 },
});
