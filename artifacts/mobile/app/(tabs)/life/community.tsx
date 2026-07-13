import { Feather } from "@expo/vector-icons";
import {
  useGetCommunityEvents,
  useCreateCommunityEvent,
  useUpdateCommunityEvent,
  useDeleteCommunityEvent,
  useRespondToCommunityEvent,
  getGetCommunityEventsQueryKey,
} from "@workspace/api-client-react";
// ↑ getGetCommunityEventsQueryKey used for all invalidations — do not use hardcoded string keys
import type { CommunityEvent } from "@workspace/api-client-react";
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

/** Community calendar only surfaces 3 tiers — private is excluded server-side. */
type WindowType = "open" | "locked" | "scheduled";

const WINDOW_TYPES: WindowType[] = ["open", "locked", "scheduled"];
const WINDOW_TYPE_LABELS: Record<WindowType, string> = {
  open: "Open",
  locked: "Locked",
  scheduled: "Scheduled",
};
const WINDOW_TYPE_ICONS: Record<WindowType, keyof typeof Feather.glyphMap> = {
  open: "unlock",
  locked: "lock",
  scheduled: "calendar",
};
const WINDOW_TYPE_DESC: Record<WindowType, string> = {
  open: "Available — come through",
  locked: "Do not disturb",
  scheduled: "Already committed",
};

const CATEGORIES = ["graduation", "cookout", "reunion", "sporting_event", "birthday", "wedding", "open_day", "request", "other"] as const;
type EventCategory = typeof CATEGORIES[number];

const CATEGORY_ICONS: Record<EventCategory, keyof typeof Feather.glyphMap> = {
  graduation: "award",
  cookout: "coffee",
  reunion: "users",
  sporting_event: "star",
  birthday: "gift",
  wedding: "heart",
  open_day: "unlock",
  request: "send",
  other: "calendar",
};

const CATEGORY_LABELS: Record<EventCategory, string> = {
  graduation: "Graduation",
  cookout: "Cookout",
  reunion: "Reunion",
  sporting_event: "Sporting Event",
  birthday: "Birthday",
  wedding: "Wedding",
  open_day: "Open Day",
  request: "Request",
  other: "Event",
};

function WindowTypePill({ wt, colors }: { wt: WindowType; colors: any }) {
  const icon = WINDOW_TYPE_ICONS[wt];
  const label = WINDOW_TYPE_LABELS[wt];
  const color = wt === "open" ? "#34d399" : wt === "locked" ? "#fbbf24" : colors.primary;
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + "20", borderColor: color + "50", borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 4 }]}>
      <Feather name={icon} size={10} color={color} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

function EventCard({ event, onRespond, onEdit, onDelete }: {
  event: CommunityEvent;
  onRespond: (rsvp: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();
  const wt = (event.windowType ?? "scheduled") as WindowType;
  const isLocked = wt === "locked";

  const icon = isLocked ? "lock" : CATEGORY_ICONS[(event.category as EventCategory)] ?? "calendar";
  const label = isLocked ? "Blocked Time" : CATEGORY_LABELS[(event.category as EventCategory)] ?? "Event";
  const startDate = new Date(event.startDate + "T12:00:00");
  const dateStr = startDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const dotColor = wt === "open" ? "#34d399" : wt === "locked" ? "#fbbf24" : colors.primary;

  return (
    <View style={[styles.eventCard, { backgroundColor: colors.card, borderColor: isLocked ? "#fbbf24" + "30" : colors.border }]}>
      <View style={styles.eventHeader}>
        <View style={{ width: 6, alignSelf: "stretch", borderRadius: 3, backgroundColor: dotColor, marginRight: 4 }} />
        <View style={[styles.eventIconBox, { backgroundColor: (isLocked ? "#fbbf24" : colors.primary) + "1A" }]}>
          <Feather name={icon as keyof typeof Feather.glyphMap} size={18} color={isLocked ? "#fbbf24" : colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eventTitle, { color: isLocked ? colors.mutedForeground : colors.foreground }]}>
            {isLocked ? "Busy" : event.title}
          </Text>
          <Text style={[styles.eventMeta, { color: colors.mutedForeground }]}>{label} · {dateStr}</Text>
          {!isLocked && event.requestedBy ? <Text style={[styles.eventMeta, { color: colors.mutedForeground }]}>By: {event.requestedBy}</Text> : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <WindowTypePill wt={wt} colors={colors} />
          {!isLocked && (
            <>
              <Pressable onPress={onEdit} hitSlop={8}><Feather name="edit-2" size={14} color={colors.mutedForeground} /></Pressable>
              <Pressable onPress={onDelete} hitSlop={8}><Feather name="trash-2" size={14} color="#f87171" /></Pressable>
            </>
          )}
          {isLocked && <Pressable onPress={onDelete} hitSlop={8}><Feather name="trash-2" size={14} color="#f87171" /></Pressable>}
        </View>
      </View>

      {!isLocked && event.description ? (
        <Text style={[styles.eventDesc, { color: colors.mutedForeground }]} numberOfLines={3}>{event.description}</Text>
      ) : null}

      {!isLocked && (
        <View style={styles.rsvpRow}>
          {(["confirmed", "pending", "declined"] as const).map(rsvp => (
            <Pressable
              key={rsvp}
              onPress={() => onRespond(rsvp)}
              style={[styles.rsvpBtn, {
                borderColor: rsvp === "confirmed" ? colors.primary + "60" : rsvp === "declined" ? "#f87171" + "60" : colors.border,
                backgroundColor: colors.muted + "30",
              }]}
            >
              <Text style={[styles.rsvpText, {
                color: rsvp === "confirmed" ? colors.primary : rsvp === "declined" ? "#f87171" : colors.mutedForeground,
              }]}>
                {rsvp === "confirmed" ? "✓ Confirm" : rsvp === "pending" ? "? Maybe" : "✗ Decline"}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function CreateEventModal({ visible, onClose, onSave, isSaving, initialData }: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
  initialData?: CommunityEvent | null;
}) {
  const colors = useColors();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<EventCategory>("other");
  const [startDate, setStartDate] = useState("");
  const [windowType, setWindowType] = useState<WindowType>("scheduled");

  React.useEffect(() => {
    if (visible && initialData) {
      setTitle(initialData.title ?? "");
      setDescription(initialData.description ?? "");
      setCategory((initialData.category as EventCategory) ?? "other");
      setStartDate(initialData.startDate ?? "");
      setWindowType((initialData.windowType ?? "scheduled") as WindowType);
    } else if (visible && !initialData) {
      setTitle(""); setDescription(""); setCategory("other"); setStartDate(""); setWindowType("scheduled");
    }
  }, [visible, initialData]);

  function reset() { setTitle(""); setDescription(""); setCategory("other"); setStartDate(""); setWindowType("scheduled"); }

  function submit() {
    if (!title.trim() || !startDate.trim()) return;
    const dateObj = new Date(startDate + "T12:00:00");
    if (isNaN(dateObj.getTime())) { Alert.alert("Invalid date", "Use YYYY-MM-DD format."); return; }
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      startDate: dateObj.toISOString().split("T")[0],
      endDate: dateObj.toISOString().split("T")[0],
      status: "open",
      windowType,
    });
    reset();
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <Pressable style={styles.overlay} onPress={() => { reset(); onClose(); }} />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{initialData ? "Edit Event" : "New Event"}</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="Event title" placeholderTextColor={colors.mutedForeground + "99"} autoFocus
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} />
          <TextInput value={startDate} onChangeText={setStartDate} placeholder="Date (YYYY-MM-DD)" placeholderTextColor={colors.mutedForeground + "99"}
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} />

          {/* Window type selector */}
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Availability</Text>
          <View style={[styles.pills, { marginBottom: 8 }]}>
            {WINDOW_TYPES.map(wt => {
              const icon = WINDOW_TYPE_ICONS[wt];
              const accentColor = wt === "open" ? "#34d399" : wt === "locked" ? "#fbbf24" : colors.primary;
              const isSelected = windowType === wt;
              return (
                <Pressable
                  key={wt}
                  onPress={() => setWindowType(wt)}
                  style={[styles.pill, {
                    borderColor: isSelected ? accentColor : colors.border,
                    backgroundColor: isSelected ? accentColor + "1A" : "transparent",
                    flexDirection: "row", alignItems: "center", gap: 5,
                  }]}
                >
                  <Feather name={icon} size={12} color={isSelected ? accentColor : colors.mutedForeground} />
                  <Text style={[styles.pillText, { color: isSelected ? accentColor : colors.mutedForeground }]}>{WINDOW_TYPE_LABELS[wt]}</Text>
                </Pressable>
              );
            })}
          </View>

          {windowType !== "locked" && windowType !== "open" ? (
            <>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Category</Text>
              <View style={styles.pills}>
                {CATEGORIES.slice(0, 6).map(c => (
                  <Pressable key={c} onPress={() => setCategory(c)}
                    style={[styles.pill, { borderColor: category === c ? colors.primary : colors.border, backgroundColor: category === c ? colors.primary + "1A" : "transparent" }]}>
                    <Text style={[styles.pillText, { color: category === c ? colors.primary : colors.mutedForeground }]}>{CATEGORY_LABELS[c]}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          <TextInput value={description} onChangeText={setDescription} placeholder="Details (optional)" placeholderTextColor={colors.mutedForeground + "99"} multiline numberOfLines={3} textAlignVertical="top"
            style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} />

          <Pressable onPress={submit} disabled={!title.trim() || !startDate.trim() || isSaving}
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: !title.trim() || !startDate.trim() || isSaving ? 0.5 : 1 }]}>
            {isSaving ? <ActivityIndicator color="#000" size="small" /> : <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>{initialData ? "Save" : "Create Event"}</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const FILTERS = ["all", "open", "locked", "scheduled", "request"] as const;
type EventFilter = typeof FILTERS[number];
const FILTER_LABELS: Record<EventFilter, string> = { all: "All", open: "Open", locked: "Locked", scheduled: "Scheduled", request: "Requests" };

export default function CommunityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data: events, isLoading, refetch, isRefetching } = useGetCommunityEvents();
  const createEvent = useCreateCommunityEvent();
  const respondEvent = useRespondToCommunityEvent();
  const updateEvent = useUpdateCommunityEvent();
  const deleteEvent = useDeleteCommunityEvent();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CommunityEvent | null>(null);
  const [activeFilter, setActiveFilter] = useState<EventFilter>("all");

  function invalidate() { qc.invalidateQueries({ queryKey: getGetCommunityEventsQueryKey() }); }

  async function handleCreate(data: any) {
    try {
      await createEvent.mutateAsync({ data });
      invalidate();
      setCreateOpen(false);
    } catch { Alert.alert("Couldn't create event", "Please try again."); }
  }

  async function handleUpdate(data: any) {
    if (!editingEvent) return;
    try {
      await updateEvent.mutateAsync({ id: editingEvent.id, data });
      invalidate();
      setEditingEvent(null);
    } catch { Alert.alert("Couldn't update event", "Please try again."); }
  }

  function confirmDelete(event: CommunityEvent) {
    Alert.alert("Delete event?", `"${event.title}"`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try { await deleteEvent.mutateAsync({ id: event.id }); invalidate(); }
          catch { Alert.alert("Couldn't delete", "Please try again."); }
        },
      },
    ]);
  }

  async function handleRespond(eventId: number, rsvp: string) {
    try {
      await respondEvent.mutateAsync({ id: eventId, data: { rsvp } as any });
      invalidate();
    } catch { Alert.alert("Couldn't save response", "Please try again."); }
  }

  const allSorted = [...(events ?? [])].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const sorted = activeFilter === "all" ? allSorted
    : activeFilter === "request" ? allSorted.filter(e => e.category === "request")
    : allSorted.filter(e => (e.windowType ?? "scheduled") === activeFilter);

  const topPad = insets.top + WEB_TOP_INSET + 12;
  const botPad = insets.bottom + WEB_BOTTOM_INSET + 24;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={sorted}
        keyExtractor={e => String(e.id)}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: botPad, paddingHorizontal: 20, gap: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ marginBottom: 4 }}>
            <View style={styles.pageHeader}>
              <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
                <Feather name="arrow-left" size={22} color={colors.foreground} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pageTitle, { color: colors.foreground }]}>Community</Text>
                <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>Events & gatherings.</Text>
              </View>
              <Pressable onPress={() => setCreateOpen(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                <Feather name="plus" size={20} color={colors.primaryForeground} />
              </Pressable>
            </View>
            <View style={[styles.pills, { marginBottom: 12 }]}>
              {FILTERS.map(f => (
                <Pressable key={f} onPress={() => setActiveFilter(f)}
                  style={[styles.pill, { borderColor: activeFilter === f ? colors.primary : colors.border, backgroundColor: activeFilter === f ? colors.primary + "1A" : "transparent" }]}>
                  <Text style={[styles.pillText, { color: activeFilter === f ? colors.primary : colors.mutedForeground }]}>{FILTER_LABELS[f]}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? <View style={styles.empty}><ActivityIndicator color={colors.primary} /></View> : (
            <View style={styles.empty}>
              <Feather name="users" size={40} color={colors.mutedForeground + "50"} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No events yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Create a gathering or mark an open day.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <EventCard
            event={item}
            onRespond={rsvp => handleRespond(item.id, rsvp)}
            onEdit={() => setEditingEvent(item)}
            onDelete={() => confirmDelete(item)}
          />
        )}
      />
      <CreateEventModal visible={createOpen} onClose={() => setCreateOpen(false)} onSave={handleCreate} isSaving={createEvent.isPending} />
      <CreateEventModal
        visible={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        onSave={handleUpdate}
        isSaving={updateEvent.isPending}
        initialData={editingEvent}
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
  eventCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
  eventHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  eventIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  eventTitle: { fontFamily: fonts.serif, fontSize: 15 },
  eventMeta: { fontFamily: fonts.sub, fontSize: 12, marginTop: 2 },
  eventDesc: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontFamily: fonts.sub, fontSize: 10, textTransform: "capitalize" },
  rsvpRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  rsvpBtn: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 8, alignItems: "center" },
  rsvpText: { fontFamily: fonts.sub, fontSize: 11 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20 },
  emptySub: { fontFamily: fonts.sub, fontSize: 14, textAlign: "center" },
  overlay: { flex: 1 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 24, paddingBottom: 40, gap: 12 },
  sheetTitle: { fontFamily: fonts.serif, fontSize: 22, marginBottom: 4 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontFamily: fonts.body, fontSize: 14 },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  fieldLabel: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  pillText: { fontFamily: fonts.sub, fontSize: 12 },
  saveBtn: { borderRadius: 999, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveBtnText: { fontFamily: fonts.subSemibold, fontSize: 15 },
});
