import { Feather } from "@expo/vector-icons";
import {
  useGetEvents,
  useCreateEvent,
  getGetEventsQueryKey,
} from "@workspace/api-client-react";
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

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

type EventType = "event" | "medication" | "routine";
const EVENT_TYPES: EventType[] = ["event", "medication", "routine"];
const TYPE_COLORS: Record<EventType, string> = {
  event: "#C9A439",
  medication: "#38bdf8",
  routine: "#9ca3af",
};

function CalendarGrid({ year, month, events, onDaySelect, selectedDay }: {
  year: number;
  month: number;
  events: any[];
  onDaySelect: (day: number) => void;
  selectedDay: number | null;
}) {
  const colors = useColors();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = isCurrentMonth ? today.getDate() : -1;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function hasEvent(d: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return events.some(e => e.startTime?.startsWith(dateStr));
  }

  return (
    <View>
      {/* Day headers */}
      <View style={grid.weekRow}>
        {WEEKDAYS.map(d => (
          <Text key={d} style={[grid.weekLabel, { color: colors.mutedForeground }]}>{d}</Text>
        ))}
      </View>
      {/* Day cells */}
      <View style={grid.daysGrid}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={grid.cell} />;
          const isToday = d === todayDate;
          const isSelected = d === selectedDay;
          const dot = hasEvent(d);
          return (
            <Pressable
              key={i}
              onPress={() => onDaySelect(d)}
              style={[
                grid.cell,
                isSelected && { backgroundColor: colors.primary + "20", borderRadius: 10 },
              ]}
            >
              <Text style={[
                grid.dayNum,
                { color: isToday ? colors.primary : colors.foreground },
                isToday && { fontFamily: fonts.serifBold },
                isSelected && { color: colors.primary },
              ]}>{d}</Text>
              {dot ? <View style={[grid.dot, { backgroundColor: colors.primary }]} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function AddEventModal({ visible, onClose, onSave, isSaving }: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
}) {
  const colors = useColors();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [type, setType] = useState<EventType>("event");
  const [description, setDescription] = useState("");

  function reset() { setTitle(""); setDate(new Date().toISOString().split("T")[0]); setType("event"); setDescription(""); }

  function submit() {
    if (!title.trim() || !date.trim()) return;
    const dateObj = new Date(date + "T09:00:00");
    if (isNaN(dateObj.getTime())) { Alert.alert("Invalid date", "Use YYYY-MM-DD format."); return; }
    onSave({
      title: title.trim(),
      type,
      startTime: dateObj.toISOString(),
      endTime: new Date(dateObj.getTime() + 60 * 60 * 1000).toISOString(),
      description: description.trim() || undefined,
      isAllDay: false,
    });
    reset();
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <Pressable style={styles.overlay} onPress={() => { reset(); onClose(); }} />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>New Event</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="What's happening?" placeholderTextColor={colors.mutedForeground + "99"} autoFocus
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} />
          <TextInput value={date} onChangeText={setDate} placeholder="Date (YYYY-MM-DD)" placeholderTextColor={colors.mutedForeground + "99"}
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} />
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Type</Text>
          <View style={styles.pills}>
            {EVENT_TYPES.map(t => (
              <Pressable key={t} onPress={() => setType(t)}
                style={[styles.pill, { borderColor: type === t ? TYPE_COLORS[t] : colors.border, backgroundColor: type === t ? TYPE_COLORS[t] + "1A" : "transparent" }]}>
                <Text style={[styles.pillText, { color: type === t ? TYPE_COLORS[t] : colors.mutedForeground }]}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={submit} disabled={!title.trim() || !date.trim() || isSaving}
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: !title.trim() || !date.trim() || isSaving ? 0.5 : 1 }]}>
            {isSaving ? <ActivityIndicator color="#000" size="small" /> : <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Add Event</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data: events, isLoading, refetch, isRefetching } = useGetEvents();
  const createEvent = useCreateEvent();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
  }

  function invalidate() { qc.invalidateQueries({ queryKey: getGetEventsQueryKey() }); }

  async function handleCreate(data: any) {
    try { await createEvent.mutateAsync({ data }); invalidate(); setAddOpen(false); }
    catch { Alert.alert("Couldn't save event", "Please try again."); }
  }

  const topPad = insets.top + WEB_TOP_INSET + 12;
  const botPad = insets.bottom + WEB_BOTTOM_INSET + 24;

  // Events for the selected day or all upcoming
  const selectedDateStr = selectedDay
    ? `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : null;

  const dayEvents = selectedDateStr
    ? (events ?? []).filter(e => e.startTime?.startsWith(selectedDateStr))
    : (events ?? [])
        .filter(e => new Date(e.startTime) >= new Date(today.setHours(0, 0, 0, 0)))
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .slice(0, 8);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>Schedule</Text>
            <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>Your time, carefully arranged.</Text>
          </View>
          <Pressable onPress={() => setAddOpen(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Feather name="plus" size={20} color={colors.primaryForeground} />
          </Pressable>
        </View>

        {/* Calendar */}
        <View style={[styles.calCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Month nav */}
          <View style={styles.monthNav}>
            <Pressable onPress={prevMonth} hitSlop={8}>
              <Feather name="chevron-left" size={20} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.monthTitle, { color: colors.foreground }]}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <Pressable onPress={nextMonth} hitSlop={8}>
              <Feather name="chevron-right" size={20} color={colors.foreground} />
            </Pressable>
          </View>
          {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 30 }} /> : (
            <CalendarGrid year={viewYear} month={viewMonth} events={events ?? []} onDaySelect={setSelectedDay} selectedDay={selectedDay} />
          )}
        </View>

        {/* Events list */}
        <View style={{ marginTop: 24 }}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            {selectedDay ? `${MONTHS[viewMonth]} ${selectedDay}` : "UPCOMING"}
          </Text>

          {selectedDay && dayEvents.length === 0 ? (
            <View style={styles.emptyDay}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nothing scheduled. Tap + to add an event.</Text>
            </View>
          ) : dayEvents.length === 0 ? (
            <View style={styles.emptyDay}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No upcoming events. Tap + to schedule something.</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {dayEvents.map(e => {
                const startTime = new Date(e.startTime);
                const timeStr = startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                const typeColor = TYPE_COLORS[(e.type as EventType)] ?? colors.primary;
                return (
                  <View key={e.id} style={[styles.eventRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.eventDot, { backgroundColor: typeColor }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.eventTitle, { color: colors.foreground }]}>{e.title}</Text>
                      <Text style={[styles.eventMeta, { color: colors.mutedForeground }]}>
                        {startTime.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {timeStr}
                      </Text>
                    </View>
                    <View style={[styles.typeBadge, { backgroundColor: typeColor + "1A", borderColor: typeColor + "40" }]}>
                      <Text style={[styles.typeText, { color: typeColor }]}>{e.type}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <AddEventModal visible={addOpen} onClose={() => setAddOpen(false)} onSave={handleCreate} isSaving={createEvent.isPending} />
    </View>
  );
}

const grid = StyleSheet.create({
  weekRow: { flexDirection: "row", marginBottom: 8 },
  weekLabel: { flex: 1, textAlign: "center", fontFamily: "DMSans_500Medium", fontSize: 11, letterSpacing: 0.5 },
  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "14.2857%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  dayNum: { fontFamily: "Inter_400Regular", fontSize: 13 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
});

const styles = StyleSheet.create({
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  backBtn: { padding: 4 },
  pageTitle: { fontFamily: fonts.serifBold, fontSize: 28 },
  pageSub: { fontFamily: fonts.sub, fontSize: 13, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  calCard: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 4 },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingHorizontal: 4 },
  monthTitle: { fontFamily: fonts.serif, fontSize: 18 },
  sectionLabel: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 },
  emptyDay: { paddingVertical: 20 },
  emptyText: { fontFamily: fonts.sub, fontSize: 14, textAlign: "center" },
  eventRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  eventDot: { width: 10, height: 10, borderRadius: 5 },
  eventTitle: { fontFamily: fonts.bodyMedium, fontSize: 14 },
  eventMeta: { fontFamily: fonts.sub, fontSize: 12, marginTop: 2 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  typeText: { fontFamily: fonts.sub, fontSize: 10, textTransform: "capitalize" },
  overlay: { flex: 1 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 24, paddingBottom: 40, gap: 12 },
  sheetTitle: { fontFamily: fonts.serif, fontSize: 22, marginBottom: 4 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontFamily: fonts.body, fontSize: 14 },
  fieldLabel: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  pillText: { fontFamily: fonts.sub, fontSize: 12, textTransform: "capitalize" },
  saveBtn: { borderRadius: 999, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveBtnText: { fontFamily: fonts.subSemibold, fontSize: 15 },
});
