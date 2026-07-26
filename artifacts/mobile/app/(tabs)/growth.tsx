import { Feather } from "@expo/vector-icons";
import {
  getGetHabitsQueryKey,
  getGetGoalsQueryKey,
  getGetJournalEntriesQueryKey,
  useCheckInHabit,
  useCreateHabit,
  useCreateGoal,
  useCreateJournalEntry,
  useGetHabits,
  useGetGoals,
  useGetJournalEntries,
  type JournalEntry,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

// ─── Prompt bank ─────────────────────────────────────────────────────────────

const DAILY_PROMPTS = [
  { id: 0,  category: "Reflection",    text: "What was the most meaningful part of your day?" },
  { id: 1,  category: "Reflection",    text: "What emotion showed up most today, and what triggered it?" },
  { id: 2,  category: "Reflection",    text: "What would you do differently if you could replay today?" },
  { id: 3,  category: "Reflection",    text: "What did you learn about yourself today?" },
  { id: 4,  category: "Reflection",    text: "Where did your energy go today — and was it worth it?" },
  { id: 5,  category: "Gratitude",     text: "Name three things — one small, one surprising, one person — you're grateful for today." },
  { id: 6,  category: "Gratitude",     text: "Who made your day a little better? What did they do?" },
  { id: 7,  category: "Gratitude",     text: "What's something you normally overlook that actually matters?" },
  { id: 8,  category: "Gratitude",     text: "What privilege or blessing are you carrying that you often forget?" },
  { id: 9,  category: "Gratitude",     text: "What moment today deserves a second look?" },
  { id: 10, category: "Growth",        text: "What habit or pattern did you notice in yourself today?" },
  { id: 11, category: "Growth",        text: "What are you working to get better at, and did today move the needle?" },
  { id: 12, category: "Growth",        text: "What belief did today challenge or confirm?" },
  { id: 13, category: "Growth",        text: "What would the best version of you have done differently today?" },
  { id: 14, category: "Growth",        text: "Where are you playing it safe when you know you should push?" },
  { id: 15, category: "Relationships", text: "Who haven't you talked to in too long? What would you say to them right now?" },
  { id: 16, category: "Relationships", text: "Who in your life deserves more of your presence?" },
  { id: 17, category: "Relationships", text: "What did someone say or do today that you want to remember?" },
  { id: 18, category: "Relationships", text: "How did you show up for the people who matter most today?" },
  { id: 19, category: "Relationships", text: "Is there a conversation you've been avoiding? What's the first sentence?" },
  { id: 20, category: "Future Self",   text: "What would your future self thank you for doing today?" },
  { id: 21, category: "Future Self",   text: "What are you building right now that your future self will inherit?" },
  { id: 22, category: "Future Self",   text: "If today were the last ordinary day before everything changed, what would you want to have done?" },
  { id: 23, category: "Future Self",   text: "What story are you telling yourself about your future — is it true?" },
  { id: 24, category: "Future Self",   text: "What would you write to yourself to open in 10 years?" },
  { id: 25, category: "Challenges",    text: "What challenged you most today, and what did it reveal?" },
  { id: 26, category: "Challenges",    text: "What are you carrying right now that you need to put down?" },
  { id: 27, category: "Challenges",    text: "Where are you resisting something that might be good for you?" },
  { id: 28, category: "Challenges",    text: "What fear is keeping you from something you actually want?" },
  { id: 29, category: "Challenges",    text: "What's the hardest thing you're avoiding saying — to yourself or someone else?" },
];

function getTodayPrompt() {
  const epoch = new Date("2024-01-01").getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSinceEpoch = Math.floor((today.getTime() - epoch) / (1000 * 60 * 60 * 24));
  return DAILY_PROMPTS[((daysSinceEpoch % DAILY_PROMPTS.length) + DAILY_PROMPTS.length) % DAILY_PROMPTS.length];
}

type GrowthTab = "habits" | "goals" | "journal";
type Mood = "great" | "good" | "okay" | "rough" | "struggling";
const MOODS: Mood[] = ["great", "good", "okay", "rough", "struggling"];

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function GrowthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<GrowthTab>("habits");

  const s = makeStyles(colors);

  return (
    <View style={[s.screen, { paddingTop: insets.top + WEB_TOP_INSET }]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Growth Hub</Text>
          <Text style={s.subtitle}>Habits · Goals · Journal</Text>
        </View>
      </View>

      {/* Sub-tab bar */}
      <View style={[s.tabBar, { borderBottomColor: colors.border }]}>
        {(["habits", "goals", "journal"] as GrowthTab[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              s.tabBtn,
              activeTab === tab && { borderBottomWidth: 2, borderBottomColor: colors.primary },
            ]}
          >
            <Text style={[
              s.tabLabel,
              { color: activeTab === tab ? colors.primary : colors.mutedForeground },
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === "habits"  && <HabitsTab />}
      {activeTab === "goals"   && <GoalsTab />}
      {activeTab === "journal" && <JournalTab />}
    </View>
  );
}

// ─── Habits tab ───────────────────────────────────────────────────────────────

function HabitsTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: habits, isLoading, refetch } = useGetHabits();
  const checkIn = useCheckInHabit();
  const createHabit = useCreateHabit();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const s = makeStyles(colors);

  const handleCheckIn = (id: number) => {
    checkIn.mutate({ id, data: { status: "great" } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() }),
      onError: () => Alert.alert("Error", "Couldn't check in. Please try again."),
    });
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    createHabit.mutate({ data: { name: name.trim(), description: desc.trim() || undefined } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() });
        setName(""); setDesc(""); setCreateOpen(false);
      },
      onError: () => Alert.alert("Error", "Couldn't create habit."),
    });
  };

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  if (isLoading) return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <>
      <FlatList
        data={habits ?? []}
        keyExtractor={h => String(h.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + WEB_BOTTOM_INSET + 80, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Feather name="activity" size={40} color={colors.mutedForeground} style={{ opacity: 0.3, marginBottom: 10 }} />
            <Text style={[s.emptyTitle, { color: colors.foreground }]}>No habits yet</Text>
            <Text style={[s.emptyText, { color: colors.mutedForeground }]}>Tap + to start a new streak</Text>
          </View>
        }
        ListFooterComponent={
          <Pressable style={[s.addRow, { borderColor: colors.border }]} onPress={() => setCreateOpen(true)}>
            <Feather name="plus" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontFamily: fonts.sub, fontSize: 14, marginLeft: 6 }}>New Habit</Text>
          </Pressable>
        }
        renderItem={({ item: h }) => (
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={[s.cardTitle, { color: colors.foreground }]}>{h.name}</Text>
                {h.description ? <Text style={[s.cardSub, { color: colors.mutedForeground }]}>{h.description}</Text> : null}
              </View>
              <View style={[s.streakPill, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}>
                <Feather name="zap" size={12} color={colors.primary} />
                <Text style={{ color: colors.primary, fontFamily: fonts.sub, fontSize: 12, marginLeft: 3 }}>{h.currentStreak}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => !h.checkedInToday && handleCheckIn(h.id)}
              disabled={h.checkedInToday || checkIn.isPending}
              style={[
                s.checkInBtn,
                h.checkedInToday
                  ? { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }
                  : { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
            >
              {h.checkedInToday ? (
                <>
                  <Feather name="check-circle" size={16} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontFamily: fonts.sub, fontSize: 13, marginLeft: 6 }}>Completed Today</Text>
                </>
              ) : (
                <Text style={{ color: colors.foreground, fontFamily: fonts.sub, fontSize: 13 }}>Check In</Text>
              )}
            </Pressable>
          </View>
        )}
      />

      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.modalBg}>
          <View style={[s.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.foreground }]}>New Habit</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Morning meditation, read 10 pages…"
              placeholderTextColor={colors.mutedForeground}
              style={[s.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              autoFocus
            />
            <TextInput
              value={desc}
              onChangeText={setDesc}
              placeholder="Why does this matter? (optional)"
              placeholderTextColor={colors.mutedForeground}
              style={[s.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, marginTop: 8 }]}
            />
            <View style={s.modalBtns}>
              <Pressable style={[s.btn, { borderColor: colors.border }]} onPress={() => setCreateOpen(false)}>
                <Text style={{ color: colors.mutedForeground, fontFamily: fonts.sub }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[s.btn, { backgroundColor: colors.primary, opacity: !name.trim() || createHabit.isPending ? 0.5 : 1 }]}
                onPress={handleCreate}
                disabled={!name.trim() || createHabit.isPending}
              >
                {createHabit.isPending
                  ? <ActivityIndicator size="small" color={colors.primaryForeground} />
                  : <Text style={{ color: colors.primaryForeground, fontFamily: fonts.sub }}>Create</Text>
                }
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ─── Goals tab ────────────────────────────────────────────────────────────────

function GoalsTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: goals, isLoading, refetch } = useGetGoals();
  const createGoal = useCreateGoal();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [progress, setProgress] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const s = makeStyles(colors);

  const handleCreate = () => {
    if (!title.trim()) return;
    createGoal.mutate({ data: { title: title.trim(), description: desc.trim() || undefined, category: "personal", progress } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetGoalsQueryKey() });
        setTitle(""); setDesc(""); setProgress(0); setCreateOpen(false);
      },
      onError: () => Alert.alert("Error", "Couldn't create goal."),
    });
  };

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  if (isLoading) return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <>
      <FlatList
        data={goals ?? []}
        keyExtractor={g => String(g.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + WEB_BOTTOM_INSET + 80, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Feather name="target" size={40} color={colors.mutedForeground} style={{ opacity: 0.3, marginBottom: 10 }} />
            <Text style={[s.emptyTitle, { color: colors.foreground }]}>No goals yet</Text>
            <Text style={[s.emptyText, { color: colors.mutedForeground }]}>Set a goal and track your progress</Text>
          </View>
        }
        ListFooterComponent={
          <Pressable style={[s.addRow, { borderColor: colors.border }]} onPress={() => setCreateOpen(true)}>
            <Feather name="plus" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontFamily: fonts.sub, fontSize: 14, marginLeft: 6 }}>New Goal</Text>
          </Pressable>
        }
        renderItem={({ item: g }) => (
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={[s.cardTitle, { color: colors.foreground }]}>{g.title}</Text>
                <Text style={[s.cardSub, { color: colors.mutedForeground }]}>{g.category}</Text>
              </View>
              <Text style={{ color: colors.primary, fontFamily: fonts.serif, fontSize: 22 }}>{g.progress}%</Text>
            </View>
            <View style={[s.progressTrack, { backgroundColor: colors.muted }]}>
              <View style={[s.progressFill, { backgroundColor: colors.primary, width: `${g.progress}%` as any }]} />
            </View>
          </View>
        )}
      />

      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.modalBg}>
          <View style={[s.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.foreground }]}>New Goal</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Run a half marathon…"
              placeholderTextColor={colors.mutedForeground}
              style={[s.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              autoFocus
            />
            <TextInput
              value={desc}
              onChangeText={setDesc}
              placeholder="What does success look like? (optional)"
              placeholderTextColor={colors.mutedForeground}
              style={[s.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, marginTop: 8 }]}
            />
            <Text style={{ color: colors.mutedForeground, fontFamily: fonts.sub, fontSize: 13, marginTop: 12 }}>Starting progress: {progress}%</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6, marginBottom: 4 }}>
              <Pressable onPress={() => setProgress(p => Math.max(0, p - 10))} style={[s.smallBtn, { borderColor: colors.border }]}>
                <Feather name="minus" size={14} color={colors.foreground} />
              </Pressable>
              <View style={[s.progressTrack, { flex: 1, backgroundColor: colors.muted }]}>
                <View style={[s.progressFill, { backgroundColor: colors.primary, width: `${progress}%` as any }]} />
              </View>
              <Pressable onPress={() => setProgress(p => Math.min(100, p + 10))} style={[s.smallBtn, { borderColor: colors.border }]}>
                <Feather name="plus" size={14} color={colors.foreground} />
              </Pressable>
            </View>
            <View style={s.modalBtns}>
              <Pressable style={[s.btn, { borderColor: colors.border }]} onPress={() => setCreateOpen(false)}>
                <Text style={{ color: colors.mutedForeground, fontFamily: fonts.sub }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[s.btn, { backgroundColor: colors.primary, opacity: !title.trim() || createGoal.isPending ? 0.5 : 1 }]}
                onPress={handleCreate}
                disabled={!title.trim() || createGoal.isPending}
              >
                {createGoal.isPending
                  ? <ActivityIndicator size="small" color={colors.primaryForeground} />
                  : <Text style={{ color: colors.primaryForeground, fontFamily: fonts.sub }}>Create</Text>
                }
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ─── Journal tab ──────────────────────────────────────────────────────────────

function JournalTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: entries, isLoading, refetch } = useGetJournalEntries();
  const createEntry = useCreateJournalEntry();

  const [writeOpen, setWriteOpen] = useState(false);
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<Mood>("good");
  const [pendingPrompt, setPendingPrompt] = useState<{ id: number; text: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const todayPrompt = getTodayPrompt();
  const s = makeStyles(colors);

  const openPrompted = () => {
    setPendingPrompt({ id: todayPrompt.id, text: todayPrompt.text });
    setContent("");
    setMood("good");
    setWriteOpen(true);
  };

  const openFreeWrite = () => {
    setPendingPrompt(null);
    setContent("");
    setMood("good");
    setWriteOpen(true);
  };

  const handleCreate = () => {
    if (!content.trim()) return;
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    createEntry.mutate(
      {
        data: {
          content: content.trim(),
          mood,
          date: dateStr,
          ...(pendingPrompt ? { promptId: pendingPrompt.id, promptText: pendingPrompt.text } : {}),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetJournalEntriesQueryKey() });
          setContent(""); setMood("good"); setPendingPrompt(null); setWriteOpen(false);
        },
        onError: () => Alert.alert("Error", "Couldn't save your entry."),
      }
    );
  };

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  if (isLoading) return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;

  const sorted = [...(entries ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + WEB_BOTTOM_INSET + 80, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Daily prompt card */}
        <View style={[s.promptCard, { backgroundColor: colors.card, borderColor: colors.primary + "40" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
            <Feather name="star" size={12} color={colors.primary} />
            <Text style={{ color: colors.primary, fontFamily: fonts.sub, fontSize: 11, marginLeft: 5, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Today's Prompt · {todayPrompt.category}
            </Text>
          </View>
          <Text style={[s.promptText, { color: colors.foreground }]}>"{todayPrompt.text}"</Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <Pressable
              onPress={openPrompted}
              style={[s.promptBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="edit-3" size={14} color={colors.primaryForeground} />
              <Text style={{ color: colors.primaryForeground, fontFamily: fonts.sub, fontSize: 13, marginLeft: 5 }}>Answer this prompt</Text>
            </Pressable>
            <Pressable onPress={openFreeWrite} style={[s.promptBtnSecondary, { borderColor: colors.border }]}>
              <Text style={{ color: colors.mutedForeground, fontFamily: fonts.sub, fontSize: 13 }}>Free write</Text>
            </Pressable>
          </View>
        </View>

        {/* Add entry row */}
        <Pressable style={[s.addRow, { borderColor: colors.border, marginTop: 4 }]} onPress={openFreeWrite}>
          <Feather name="plus" size={18} color={colors.primary} />
          <Text style={{ color: colors.primary, fontFamily: fonts.sub, fontSize: 14, marginLeft: 6 }}>New Entry</Text>
        </Pressable>

        {/* Entry list */}
        {sorted.length === 0 ? (
          <View style={[s.empty, { paddingTop: 24 }]}>
            <Feather name="book-open" size={40} color={colors.mutedForeground} style={{ opacity: 0.3, marginBottom: 10 }} />
            <Text style={[s.emptyTitle, { color: colors.foreground }]}>Your journal is waiting</Text>
            <Text style={[s.emptyText, { color: colors.mutedForeground }]}>Answer today's prompt to begin</Text>
          </View>
        ) : (
          sorted.map((entry: JournalEntry) => (
            <View key={entry.id} style={[s.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={{ color: colors.mutedForeground, fontFamily: fonts.sub, fontSize: 12 }}>
                  {new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </Text>
                <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                  {entry.promptText && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.primary + "15", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 }}>
                      <Feather name="star" size={9} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontFamily: fonts.sub, fontSize: 10 }}>Prompted</Text>
                    </View>
                  )}
                  <View style={{ backgroundColor: colors.primary + "15", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 }}>
                    <Text style={{ color: colors.primary, fontFamily: fonts.sub, fontSize: 11 }}>{entry.mood}</Text>
                  </View>
                </View>
              </View>
              {entry.promptText && (
                <Text style={{ color: colors.mutedForeground, fontFamily: fonts.body, fontSize: 12, fontStyle: "italic", marginBottom: 6, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: colors.primary + "40" }}>
                  {entry.promptText}
                </Text>
              )}
              <Text style={{ color: colors.foreground, fontFamily: fonts.body, fontSize: 14, lineHeight: 22 }}>
                {entry.content}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Write modal */}
      <Modal visible={writeOpen} transparent animationType="slide" onRequestClose={() => { setWriteOpen(false); setPendingPrompt(null); }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.modalBg}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={[s.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.modalTitle, { color: colors.foreground }]}>
                {pendingPrompt ? "Answer Today's Prompt" : "New Entry"}
              </Text>

              {pendingPrompt && (
                <View style={[s.promptInDialog, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
                  <Text style={{ color: colors.primary, fontFamily: fonts.sub, fontSize: 11, marginBottom: 4 }}>Today's Prompt</Text>
                  <Text style={{ color: colors.foreground, fontFamily: fonts.serif, fontSize: 15, lineHeight: 22 }}>
                    "{pendingPrompt.text}"
                  </Text>
                </View>
              )}

              {/* Mood picker */}
              <Text style={{ color: colors.mutedForeground, fontFamily: fonts.sub, fontSize: 13, marginBottom: 8, marginTop: pendingPrompt ? 12 : 0 }}>How are you feeling?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {MOODS.map(m => (
                    <Pressable
                      key={m}
                      onPress={() => setMood(m)}
                      style={[
                        s.moodChip,
                        { borderColor: mood === m ? colors.primary : colors.border, backgroundColor: mood === m ? colors.primary + "15" : "transparent" },
                      ]}
                    >
                      <Text style={{ color: mood === m ? colors.primary : colors.mutedForeground, fontFamily: fonts.sub, fontSize: 13 }}>
                        {m}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder={pendingPrompt ? "Write your answer here…" : "What's on your mind today?"}
                placeholderTextColor={colors.mutedForeground}
                multiline
                style={[s.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                autoFocus
              />
              <View style={s.modalBtns}>
                <Pressable style={[s.btn, { borderColor: colors.border }]} onPress={() => { setWriteOpen(false); setPendingPrompt(null); }}>
                  <Text style={{ color: colors.mutedForeground, fontFamily: fonts.sub }}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[s.btn, { backgroundColor: colors.primary, opacity: !content.trim() || createEntry.isPending ? 0.5 : 1 }]}
                  onPress={handleCreate}
                  disabled={!content.trim() || createEntry.isPending}
                >
                  {createEntry.isPending
                    ? <ActivityIndicator size="small" color={colors.primaryForeground} />
                    : <Text style={{ color: colors.primaryForeground, fontFamily: fonts.sub }}>Save Entry</Text>
                  }
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: { fontSize: 26, fontFamily: fonts.serif, color: colors.foreground },
    subtitle: { fontSize: 13, fontFamily: fonts.sub, color: colors.mutedForeground, marginTop: 2 },
    tabBar: {
      flexDirection: "row",
      borderBottomWidth: 1,
    },
    tabBtn: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 12,
    },
    tabLabel: {
      fontFamily: fonts.sub,
      fontSize: 13,
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    empty: { alignItems: "center", paddingTop: 60 },
    emptyTitle: { fontSize: 18, fontFamily: fonts.serif, marginBottom: 4 },
    emptyText: { fontSize: 13, fontFamily: fonts.sub, textAlign: "center" },
    card: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 16,
    },
    cardTitle: { fontSize: 16, fontFamily: fonts.serif },
    cardSub: { fontSize: 12, fontFamily: fonts.sub, marginTop: 2 },
    streakPill: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
    },
    checkInBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 10,
    },
    progressTrack: {
      height: 6,
      borderRadius: 3,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 3,
    },
    addRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderStyle: "dashed",
      borderRadius: 12,
      paddingVertical: 12,
      marginTop: 4,
    },
    promptCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 18,
    },
    promptText: {
      fontFamily: fonts.serif,
      fontSize: 17,
      lineHeight: 26,
    },
    promptBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
    },
    promptBtnSecondary: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
      borderWidth: 1,
    },
    entryCard: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
    },
    modalBg: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      padding: 24,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
    },
    modalTitle: { fontSize: 20, fontFamily: fonts.serif, marginBottom: 14 },
    input: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      fontFamily: fonts.body,
      minHeight: 44,
    },
    textarea: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      fontFamily: fonts.body,
      minHeight: 120,
      textAlignVertical: "top",
    },
    modalBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
    btn: {
      flex: 1,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    smallBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    promptInDialog: {
      borderRadius: 10,
      borderWidth: 1,
      padding: 12,
    },
    moodChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      borderWidth: 1,
    },
  });
}
