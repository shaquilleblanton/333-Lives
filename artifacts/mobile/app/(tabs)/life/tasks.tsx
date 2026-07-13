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

type Priority = "low" | "medium" | "high";
type Category = "personal" | "finance" | "health" | "family" | "work" | "other";

const PRIORITY_COLORS: Record<Priority, string> = {
  high: "#fb7185",
  medium: "#fbbf24",
  low: "#38bdf8",
};

const CATEGORIES: Category[] = ["personal", "finance", "health", "family", "work", "other"];
const PRIORITIES: Priority[] = ["high", "medium", "low"];

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

function TaskRow({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete: () => void }) {
  const colors = useColors();
  const pColor = PRIORITY_COLORS[(task.priority as Priority) ?? "low"];

  return (
    <View style={[styles.taskRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Pressable onPress={onToggle} style={styles.checkBtn} hitSlop={8}>
        <Feather
          name={task.isCompleted ? "check-circle" : "circle"}
          size={22}
          color={task.isCompleted ? colors.primary : colors.mutedForeground}
        />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.taskTitle,
            { color: task.isCompleted ? colors.mutedForeground : colors.foreground,
              textDecorationLine: task.isCompleted ? "line-through" : "none" },
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
            <Text style={[styles.taskMetaText, { color: colors.mutedForeground }]}>
              {" · "}{new Date(task.dueDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </Text>
          ) : null}
        </View>
      </View>
      <Pressable onPress={onDelete} hitSlop={8} style={{ padding: 4 }}>
        <Feather name="trash-2" size={16} color={colors.mutedForeground + "80"} />
      </Pressable>
    </View>
  );
}

function AddTaskModal({ visible, onClose, onSave, isPending }: {
  visible: boolean;
  onClose: () => void;
  onSave: (payload: { title: string; priority: Priority; category: Category; dueDate: string | null }) => void;
  isPending: boolean;
}) {
  const colors = useColors();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [category, setCategory] = useState<Category>("personal");

  function submit() {
    if (!title.trim()) return;
    onSave({ title: title.trim(), priority, category, dueDate: null });
    setTitle("");
    setPriority("medium");
    setCategory("personal");
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>New Task</Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What needs to get done?"
            placeholderTextColor={colors.mutedForeground + "99"}
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            multiline
            returnKeyType="done"
            autoFocus
          />

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Priority</Text>
          <View style={styles.pills}>
            {PRIORITIES.map(p => (
              <Pressable
                key={p}
                onPress={() => setPriority(p)}
                style={[
                  styles.pill,
                  { borderColor: priority === p ? PRIORITY_COLORS[p] : colors.border,
                    backgroundColor: priority === p ? PRIORITY_COLORS[p] + "1A" : "transparent" },
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
                  { borderColor: category === c ? colors.primary : colors.border,
                    backgroundColor: category === c ? colors.primary + "1A" : "transparent" },
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
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Add Task</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function TasksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data: tasks, isLoading, refetch, isRefetching } = useGetTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [modalOpen, setModalOpen] = useState(false);

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetTasksQueryKey() });
  }

  async function toggle(t: Task) {
    try {
      await updateTask.mutateAsync({ id: t.id, data: { isCompleted: !t.isCompleted } });
      invalidate();
    } catch {
      Alert.alert("Couldn't update task", "Please try again.");
    }
  }

  function confirmDelete(t: Task) {
    Alert.alert("Delete task?", `"${t.title}"`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try { await deleteTask.mutateAsync({ id: t.id }); invalidate(); }
          catch { Alert.alert("Couldn't delete", "Please try again."); }
        },
      },
    ]);
  }

  async function handleCreate(payload: { title: string; priority: Priority; category: Category; dueDate: string | null }) {
    try {
      await createTask.mutateAsync({ data: payload as any });
      invalidate();
      setModalOpen(false);
    } catch {
      Alert.alert("Couldn't save task", "Please try again.");
    }
  }

  const topPad = insets.top + WEB_TOP_INSET + 12;
  const botPad = insets.bottom + WEB_BOTTOM_INSET + 24;

  const sorted = [...(tasks ?? [])].sort((a, b) => {
    const po = { high: 0, medium: 1, low: 2 };
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    return (po[(a.priority as Priority) ?? "low"] ?? 1) - (po[(b.priority as Priority) ?? "low"] ?? 1);
  });

  const incomplete = sorted.filter(t => !t.isCompleted);
  const complete = sorted.filter(t => t.isCompleted);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={[...incomplete, ...complete]}
        keyExtractor={t => String(t.id)}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: botPad, paddingHorizontal: 20, gap: 8 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
              <Feather name="arrow-left" size={22} color={colors.foreground} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pageTitle, { color: colors.foreground }]}>Tasks</Text>
              <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>
                {incomplete.length} remaining · {complete.length} done
              </Text>
            </View>
            <Pressable
              onPress={() => setModalOpen(true)}
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="plus" size={20} color={colors.primaryForeground} />
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <View style={styles.empty}>
              <Feather name="check-square" size={40} color={colors.mutedForeground + "50"} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No tasks yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Tap + to add your first task.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <TaskRow task={item} onToggle={() => toggle(item)} onDelete={() => confirmDelete(item)} />
        )}
      />
      <AddTaskModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleCreate}
        isPending={createTask.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  backBtn: { padding: 4 },
  pageTitle: { fontFamily: fonts.serifBold, fontSize: 28 },
  pageSub: { fontFamily: fonts.sub, fontSize: 13, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  sheetTitle: { fontFamily: fonts.serif, fontSize: 22, marginBottom: 4 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },
  fieldLabel: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontFamily: fonts.sub, fontSize: 12, textTransform: "capitalize" },
  saveBtn: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: { fontFamily: fonts.subSemibold, fontSize: 15 },
});
