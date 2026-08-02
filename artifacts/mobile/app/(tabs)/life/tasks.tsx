import { Feather } from "@expo/vector-icons";
import {
  useGetTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  getGetTasksQueryKey,
} from "@workspace/api-client-react";
import type { Task } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
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
import { ErrorRetryView } from "@/components/ErrorRetryView";

type Priority = "low" | "medium" | "high";
type Category = "personal" | "finance" | "health" | "family" | "work" | "other";

const PRIORITY_COLORS: Record<Priority, string> = {
  high: "#fb7185",
  medium: "#fbbf24",
  low: "#38bdf8",
};
const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const CATEGORIES: Category[] = ["personal", "finance", "health", "family", "work", "other"];
const PRIORITIES: Priority[] = ["high", "medium", "low"];

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

function TaskRow({
  task, overdue, onToggle, onEdit, onDelete,
}: { task: Task; overdue: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const colors = useColors();
  const pColor = PRIORITY_COLORS[(task.priority as Priority) ?? "low"];

  return (
    <Pressable
      onPress={onEdit}
      style={({ pressed }) => [
        styles.taskRow,
        {
          backgroundColor: colors.card,
          borderColor: overdue ? PRIORITY_COLORS.high + "50" : task.isCompleted ? colors.border + "60" : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Pressable onPress={onToggle} hitSlop={8} style={styles.checkBtn}>
        <Feather
          name={task.isCompleted ? "check-circle" : "circle"}
          size={22}
          color={task.isCompleted ? colors.primary : overdue ? PRIORITY_COLORS.high : colors.mutedForeground}
        />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.taskTitle,
            {
              color: task.isCompleted ? colors.mutedForeground : colors.foreground,
              textDecorationLine: task.isCompleted ? "line-through" : "none",
            },
          ]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        <View style={styles.taskMeta}>
          <View style={[styles.dot, { backgroundColor: pColor }]} />
          <Text style={[styles.taskMetaText, { color: colors.mutedForeground }]}>
            {task.priority ?? "low"} · {task.category ?? "other"}
          </Text>
          {task.dueDate ? (
            <Text style={[styles.taskMetaText, { color: overdue ? "#fb7185" : colors.mutedForeground }]}>
              {" · "}
              {new Date(task.dueDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </Text>
          ) : null}
          {overdue && !task.isCompleted && (
            <Text style={[styles.taskMetaText, { color: PRIORITY_COLORS.high }]}>{" · overdue"}</Text>
          )}
        </View>
      </View>
      <Pressable onPress={onDelete} hitSlop={8} style={{ padding: 4 }}>
        <Feather name="trash-2" size={16} color={colors.mutedForeground + "70"} />
      </Pressable>
    </Pressable>
  );
}

function TaskModal({
  task,
  visible,
  onClose,
  onSave,
  isPending,
}: {
  task: Task | null;
  visible: boolean;
  onClose: () => void;
  onSave: (payload: {
    title: string; notes: string; dueDate: string | null; priority: Priority; category: Category;
  }) => void;
  isPending: boolean;
}) {
  const colors = useColors();
  const isEditing = !!task;

  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [priority, setPriority] = useState<Priority>((task?.priority as Priority) ?? "medium");
  const [category, setCategory] = useState<Category>((task?.category as Category) ?? "personal");

  React.useEffect(() => {
    if (visible) {
      setTitle(task?.title ?? "");
      setNotes(task?.notes ?? "");
      setDueDate(task?.dueDate ?? "");
      setPriority((task?.priority as Priority) ?? "medium");
      setCategory((task?.category as Category) ?? "personal");
    }
  }, [visible, task]);

  function submit() {
    if (!title.trim()) return;
    let finalDueDate: string | null = null;
    if (dueDate.trim()) {
      const d = new Date(dueDate.trim() + "T12:00:00");
      if (!isNaN(d.getTime())) finalDueDate = dueDate.trim();
    }
    onSave({ title: title.trim(), notes: notes.trim(), dueDate: finalDueDate, priority, category });
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
            {isEditing ? "Edit Task" : "New Task"}
          </Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What needs to get done?"
            placeholderTextColor={colors.mutedForeground + "99"}
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            autoFocus={!isEditing}
            returnKeyType="next"
          />

          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (optional)"
            placeholderTextColor={colors.mutedForeground + "99"}
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            returnKeyType="next"
          />

          <TextInput
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="Due date: YYYY-MM-DD (optional)"
            placeholderTextColor={colors.mutedForeground + "99"}
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            autoCapitalize="none"
            returnKeyType="done"
          />

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Priority</Text>
          <View style={styles.pills}>
            {PRIORITIES.map(p => (
              <Pressable
                key={p}
                onPress={() => setPriority(p)}
                style={[
                  styles.pill,
                  {
                    borderColor: priority === p ? PRIORITY_COLORS[p] : colors.border,
                    backgroundColor: priority === p ? PRIORITY_COLORS[p] + "1A" : "transparent",
                  },
                ]}
              >
                <Text style={[styles.pillText, { color: priority === p ? PRIORITY_COLORS[p] : colors.mutedForeground }]}>
                  {p}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Category</Text>
          <View style={styles.pills}>
            {CATEGORIES.map(c => (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[
                  styles.pill,
                  {
                    borderColor: category === c ? colors.primary : colors.border,
                    backgroundColor: category === c ? colors.primary + "1A" : "transparent",
                  },
                ]}
              >
                <Text style={[styles.pillText, { color: category === c ? colors.primary : colors.mutedForeground }]}>
                  {c}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={submit}
            disabled={!title.trim() || isPending}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: colors.primary, opacity: !title.trim() || isPending ? 0.5 : pressed ? 0.85 : 1 },
            ]}
          >
            {isPending ? (
              <ActivityIndicator color={colors.primaryForeground} size="small" />
            ) : (
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
                {isEditing ? "Save Changes" : "Add Task"}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function GroupHeader({ label, count, accent }: { label: string; count: number; accent: string }) {
  return (
    <View style={styles.groupHeader}>
      <Text style={[styles.groupLabel, { color: accent }]}>{label}</Text>
      <Text style={[styles.groupCount, { color: accent + "99" }]}>({count})</Text>
    </View>
  );
}

const CATEGORIES_ALL = ["all", "personal", "work", "health", "finance", "family", "other"] as const;
type CategoryFilter = typeof CATEGORIES_ALL[number];

export default function TasksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data: tasks, isLoading, isError, refetch, isRefetching } = useGetTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [catFilter, setCatFilter] = useState<CategoryFilter>("all");

  function invalidate() { qc.invalidateQueries({ queryKey: getGetTasksQueryKey() }); }
  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(t: Task) { setEditing(t); setModalOpen(true); }

  async function toggle(t: Task) {
    try {
      await updateTask.mutateAsync({ id: t.id, data: { isCompleted: !t.isCompleted } });
      invalidate();
    } catch { Alert.alert("Couldn't update task", "Please try again."); }
  }

  function confirmDelete(t: Task) {
    Alert.alert("Delete task?", `"${t.title}"`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try { await deleteTask.mutateAsync({ id: t.id }); invalidate(); }
          catch { Alert.alert("Couldn't delete", "Please try again."); }
        },
      },
    ]);
  }

  async function handleSave(payload: {
    title: string; notes: string; dueDate: string | null; priority: Priority; category: Category;
  }) {
    try {
      if (editing) {
        await updateTask.mutateAsync({ id: editing.id, data: payload as any });
      } else {
        await createTask.mutateAsync({ data: payload as any });
      }
      invalidate();
      setModalOpen(false);
      setEditing(null);
    } catch { Alert.alert("Couldn't save task", "Please try again."); }
  }

  if (isError) return <ErrorRetryView message="Couldn't load your tasks. Check your connection and try again." onRetry={refetch} />;

  const topPad = insets.top + WEB_TOP_INSET + 12;
  const botPad = insets.bottom + WEB_BOTTOM_INSET + 24;
  const tk = todayKey();
  const allTasks = tasks ?? [];
  const filteredByCategory = catFilter === "all" ? allTasks : allTasks.filter(t => (t.category ?? "other") === catFilter);
  const active = filteredByCategory.filter(t => !t.isCompleted);
  const completed = filteredByCategory.filter(t => t.isCompleted);

  const byPriority = (a: Task, b: Task) =>
    (PRIORITY_ORDER[(a.priority as Priority) ?? "low"] ?? 1) -
    (PRIORITY_ORDER[(b.priority as Priority) ?? "low"] ?? 1);

  const overdue  = active.filter(t => t.dueDate && t.dueDate < tk).sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
  const dueToday = active.filter(t => t.dueDate === tk).sort(byPriority);
  const upcoming = active.filter(t => t.dueDate && t.dueDate > tk).sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
  const someday  = active.filter(t => !t.dueDate).sort(byPriority);

  type GroupedItem = { type: "header"; key: string; label: string; count: number; accent: string } | { type: "task"; task: Task; overdue: boolean };
  const listData: GroupedItem[] = [];
  if (overdue.length)  { listData.push({ type: "header", key: "h-overdue",  label: "Overdue",  count: overdue.length,  accent: PRIORITY_COLORS.high }); overdue.forEach(t  => listData.push({ type: "task", task: t, overdue: true  })); }
  if (dueToday.length) { listData.push({ type: "header", key: "h-today",   label: "Today",    count: dueToday.length, accent: colors.primary }); dueToday.forEach(t => listData.push({ type: "task", task: t, overdue: false })); }
  if (upcoming.length) { listData.push({ type: "header", key: "h-upcoming", label: "Upcoming", count: upcoming.length, accent: colors.foreground }); upcoming.forEach(t => listData.push({ type: "task", task: t, overdue: false })); }
  if (someday.length)  { listData.push({ type: "header", key: "h-someday",  label: "Someday",  count: someday.length,  accent: colors.mutedForeground }); someday.forEach(t  => listData.push({ type: "task", task: t, overdue: false })); }
  if (completed.length){ listData.push({ type: "header", key: "h-done",     label: "Completed",count: completed.length, accent: colors.mutedForeground }); completed.slice(0, 20).forEach(t => listData.push({ type: "task", task: t, overdue: false })); }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={listData}
        keyExtractor={item => item.type === "header" ? item.key : String(item.task.id)}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: botPad, paddingHorizontal: 20, gap: 8 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ marginBottom: 4 }}>
            <View style={styles.pageHeader}>
              <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
                <Feather name="arrow-left" size={22} color={colors.foreground} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pageTitle, { color: colors.foreground }]}>Tasks</Text>
                <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>
                  {overdue.length ? `${overdue.length} overdue · ` : ""}{dueToday.length} today · {completed.length} done
                </Text>
              </View>
              <Pressable onPress={openCreate} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                <Feather name="plus" size={20} color={colors.primaryForeground} />
              </Pressable>
            </View>

            {/* Stats row */}
            <View style={[styles.statsRow, { gap: 8 }]}>
              {[
                { label: "Overdue", value: overdue.length, color: "#fb7185" },
                { label: "Today",   value: dueToday.length, color: colors.primary },
                { label: "Done",    value: completed.length, color: colors.accent ?? colors.secondary },
              ].map(s => (
                <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: s.color + "30", flex: 1 }]}>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                </View>
              ))}
            </View>
            {/* Category filter */}
            <View style={[styles.filterRow]}>
              {CATEGORIES_ALL.map(c => (
                <Pressable key={c} onPress={() => setCatFilter(c)}
                  style={[styles.filterPill, { borderColor: catFilter === c ? colors.primary : colors.border, backgroundColor: catFilter === c ? colors.primary + "1A" : "transparent" }]}>
                  <Text style={[styles.filterPillText, { color: catFilter === c ? colors.primary : colors.mutedForeground }]}>
                    {c === "all" ? "All" : c.charAt(0).toUpperCase() + c.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}><ActivityIndicator color={colors.primary} /></View>
          ) : allTasks.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="check-square" size={40} color={colors.mutedForeground + "50"} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No tasks yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Tap + to add your first task.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          if (item.type === "header") {
            return <GroupHeader label={item.label} count={item.count} accent={item.accent} />;
          }
          return (
            <TaskRow
              task={item.task}
              overdue={item.overdue}
              onToggle={() => toggle(item.task)}
              onEdit={() => openEdit(item.task)}
              onDelete={() => confirmDelete(item.task)}
            />
          );
        }}
      />

      <TaskModal
        task={editing}
        visible={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        isPending={createTask.isPending || updateTask.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  backBtn: { padding: 4 },
  pageTitle: { fontFamily: fonts.serifBold, fontSize: 28 },
  pageSub: { fontFamily: fonts.sub, fontSize: 13, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", marginBottom: 12 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  filterPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  filterPillText: { fontFamily: fonts.sub, fontSize: 11 },
  statCard: { borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center" },
  statValue: { fontFamily: fonts.serifBold, fontSize: 22 },
  statLabel: { fontFamily: fonts.sub, fontSize: 11, marginTop: 2 },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, marginBottom: 4 },
  groupLabel: { fontFamily: fonts.subSemibold, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  groupCount: { fontFamily: fonts.sub, fontSize: 12 },
  taskRow: {
    flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14,
  },
  checkBtn: { padding: 2 },
  taskTitle: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 20 },
  taskMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  taskMetaText: { fontFamily: fonts.sub, fontSize: 11 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20 },
  emptySub: { fontFamily: fonts.sub, fontSize: 14 },
  overlay: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    padding: 24, paddingBottom: 40, gap: 12,
  },
  sheetTitle: { fontFamily: fonts.serif, fontSize: 22, marginBottom: 4 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontFamily: fonts.body, fontSize: 14 },
  fieldLabel: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  pillText: { fontFamily: fonts.sub, fontSize: 12, textTransform: "capitalize" },
  saveBtn: { borderRadius: 999, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { fontFamily: fonts.subSemibold, fontSize: 15 },
});
