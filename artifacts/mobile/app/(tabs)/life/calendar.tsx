import { Feather } from "@expo/vector-icons";
import {
  useGetEvents,
  useCreateEvent,
  useDeleteEvent,
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
/**
 * Personal calendar (events table) supports all 4 tiers.
 * Community calendar (community_calendar) only uses open/locked/scheduled —
 * private events are excluded from the community endpoint server-side.
 */
type WindowType = "open" | "locked" | "scheduled" | "private";

const EVENT_TYPES: EventType[] = ["event", "medication", "routine"];
const TYPE_COLORS: Record<EventType, string> = {
  event: "#C9A439",
  medication: "#38bdf8",
  routine: "#9ca3af",
};

const WINDOW_TYPES: WindowType[] = ["open", "locked", "scheduled", "private"];
const WINDOW_TYPE_LABELS: Record<WindowType, string> = {
  open: "Open",
  locked: "Locked",
  scheduled: "Scheduled",
  private: "Private",
};
const WINDOW_TYPE_ICONS: Record<WindowType, keyof typeof Feather.glyphMap> = {
  open: "unlock",
  locked: "lock",
  scheduled: "calendar",
  private: "eye-off",
};

function getWindowTypeColor(wt: WindowType): string {
  switch (wt) {
    case "open":      return "#34d399";
    case "locked":    return "#fbbf24";
    case "private":   return "#6b7280";
    default:          return "#C9A439";
  }
}

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

  function dayEvents(d: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return events.filter(e => e.startTime?.startsWith(dateStr));
  }

  return (
    <View>
      <View style={grid.weekRow}>
        {WEEKDAYS.map(d => (
          <Text key={d} style={[grid.weekLabel, { color: colors.mutedForeground }]}>{d}</Text>
        ))}
      </View>
      <View style={grid.daysGrid}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={grid.cell} />;
          const isToday = d === todayDate;
          const isSelected = d === selectedDay;
          const evs = dayEvents(d);
          const wtColors = evs.map(e => getWindowTypeColor((e.windowType ?? "scheduled") as WindowType));
          const uniqueColors = [...new Set(wtColors)].slice(0, 3);
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
              {uniqueColors.length > 0 ? (
                <View style={{ flexDirection: "row", gap: 2, marginTop: 1 }}>
                  {uniqueColors.map((c, ci) => (
                    <View key={ci} style={[grid.dot, { backgroundColor: c }]} />
                  ))}
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Parse flexible date strings into a Date object (noon local time).
 *  Accepts: YYYY-MM-DD, M/D, M/D/YYYY, M-D, "April 8", "Apr 8", etc.
 */
function parseFlexibleDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;

  // YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const d = new Date(s + "T12:00:00");
    return isNaN(d.getTime()) ? null : d;
  }

  const now = new Date();
  const year = now.getFullYear();

  // M/D or M/D/YYYY
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (slashMatch) {
    const m = parseInt(slashMatch[1], 10) - 1;
    const d = parseInt(slashMatch[2], 10);
    const y = slashMatch[3] ? parseInt(slashMatch[3], 10) : year;
    const date = new Date(y, m, d, 12, 0, 0);
    return isNaN(date.getTime()) ? null : date;
  }

  // M-D (e.g. "4-8")
  const dashMatch = s.match(/^(\d{1,2})-(\d{1,2})$/);
  if (dashMatch) {
    const m = parseInt(dashMatch[1], 10) - 1;
    const d = parseInt(dashMatch[2], 10);
    const date = new Date(year, m, d, 12, 0, 0);
    return isNaN(date.getTime()) ? null : date;
  }

  // "April 8" / "Apr 8" / "8 April"
  const monthNames = ["january","february","march","april","may","june","july","august","september","october","november","december"];
  const wordMatch = s.match(/^([a-z]+)\s+(\d{1,2})$/i) || s.match(/^(\d{1,2})\s+([a-z]+)$/i);
  if (wordMatch) {
    const part1 = wordMatch[1], part2 = wordMatch[2];
    let monthIdx = -1, dayNum = -1;
    // Which is the month word?
    const tryMonth = (w: string) => monthNames.findIndex(mn => mn.startsWith(w.toLowerCase().slice(0, 3)));
    if (isNaN(Number(part1))) { monthIdx = tryMonth(part1); dayNum = parseInt(part2, 10); }
    else { dayNum = parseInt(part1, 10); monthIdx = tryMonth(part2); }
    if (monthIdx >= 0 && dayNum > 0) {
      const date = new Date(year, monthIdx, dayNum, 12, 0, 0);
      return isNaN(date.getTime()) ? null : date;
    }
  }

  return null;
}

/** Parse a time string like "9", "9:30", "9:30 AM", "21:30" → { hours, minutes } or null */
function parseTime(raw: string): { hours: number; minutes: number } | null {
  const s = raw.trim().toUpperCase();
  if (!s) return null;
  const match = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3];
  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

function AddEventModal({ visible, onClose, onSave, isSaving }: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
}) {
  const colors = useColors();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [type, setType] = useState<EventType>("event");
  const [windowType, setWindowType] = useState<WindowType>("scheduled");
  const [description, setDescription] = useState("");

  function reset() {
    setTitle(""); setDate(""); setTime("");
    setType("event"); setWindowType("scheduled"); setDescription("");
  }

  function submit() {
    if (!title.trim()) return;

    // Parse date — fall back to today if blank
    let dateObj: Date;
    if (!date.trim()) {
      dateObj = new Date();
      dateObj.setHours(9, 0, 0, 0);
    } else {
      const parsed = parseFlexibleDate(date);
      if (!parsed) {
        Alert.alert("Invalid date", "Try formats like 4/8, Apr 8, or 2025-04-08.");
        return;
      }
      dateObj = parsed;
    }

    // Parse time — fall back to 9:00 AM if blank
    if (time.trim()) {
      const t = parseTime(time);
      if (!t) {
        Alert.alert("Invalid time", "Try formats like 9:30, 2:00 PM, or 14:30.");
        return;
      }
      dateObj.setHours(t.hours, t.minutes, 0, 0);
    } else {
      dateObj.setHours(9, 0, 0, 0);
    }

    onSave({
      title: title.trim(),
      type,
      windowType,
      startTime: dateObj.toISOString(),
      endTime: new Date(dateObj.getTime() + 60 * 60 * 1000).toISOString(),
      description: description.trim() || undefined,
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

          {/* Date + Time row */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput value={date} onChangeText={setDate} placeholder="Date (e.g. 4/8 or Apr 8)" placeholderTextColor={colors.mutedForeground + "99"}
              style={[styles.input, { flex: 3, backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} />
            <TextInput value={time} onChangeText={setTime} placeholder="Time (e.g. 9:30)" placeholderTextColor={colors.mutedForeground + "99"}
              keyboardType="numbers-and-punctuation"
              style={[styles.input, { flex: 2, backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} />
          </View>

          {/* Event type */}
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Type</Text>
          <View style={styles.pills}>
            {EVENT_TYPES.map(t => (
              <Pressable key={t} onPress={() => setType(t)}
                style={[styles.pill, { borderColor: type === t ? TYPE_COLORS[t] : colors.border, backgroundColor: type === t ? TYPE_COLORS[t] + "1A" : "transparent" }]}>
                <Text style={[styles.pillText, { color: type === t ? TYPE_COLORS[t] : colors.mutedForeground }]}>{t}</Text>
              </Pressable>
            ))}
          </View>

          {/* Window type */}
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Availability</Text>
          <View style={styles.pills}>
            {WINDOW_TYPES.map(wt => {
              const accentColor = getWindowTypeColor(wt);
              const icon = WINDOW_TYPE_ICONS[wt];
              const isSelected = windowType === wt;
              return (
                <Pressable
                  key={wt}
                  onPress={() => setWindowType(wt)}
                  style={[styles.pill, {
                    borderColor: isSelected ? accentColor : colors.border,
                    backgroundColor: isSelected ? accentColor + "1A" : "transparent",
                    flexDirection: "row", alignItems: "center", gap: 4,
                  }]}
                >
                  <Feather name={icon} size={11} color={isSelected ? accentColor : colors.mutedForeground} />
                  <Text style={[styles.pillText, { color: isSelected ? accentColor : colors.mutedForeground }]}>{WINDOW_TYPE_LABELS[wt]}</Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput value={description} onChangeText={setDescription} placeholder="Details (optional)" placeholderTextColor={colors.mutedForeground + "99"} multiline numberOfLines={3} textAlignVertical="top"
            style={[styles.input, { minHeight: 70, textAlignVertical: "top", backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} />

          <Pressable onPress={submit} disabled={!title.trim() || !date.trim() || isSaving}
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: !title.trim() || !date.trim() || isSaving ? 0.5 : 1 }]}>
            {isSaving ? <ActivityIndicator color={colors.primaryForeground} size="small" /> : <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Add Event</Text>}
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
  const deleteEvent = useDeleteEvent();
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

  function confirmDelete(id: number, title: string) {
    Alert.alert("Delete event?", `"${title}" will be removed.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await deleteEvent.mutateAsync({ id }); invalidate(); }
        catch { Alert.alert("Couldn't delete", "Please try again."); }
      }},
    ]);
  }

  const topPad = insets.top + WEB_TOP_INSET + 12;
  const botPad = insets.bottom + WEB_BOTTOM_INSET + 24;

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

        <View style={[styles.calCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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

          {/* Legend */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border + "40" }}>
            {WINDOW_TYPES.map(wt => (
              <View key={wt} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: getWindowTypeColor(wt) }} />
                <Text style={{ fontFamily: fonts.sub, fontSize: 10, color: colors.mutedForeground }}>{WINDOW_TYPE_LABELS[wt]}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            {selectedDay ? `${MONTHS[viewMonth]} ${selectedDay}` : "UPCOMING"}
          </Text>

          {dayEvents.length === 0 ? (
            <View style={styles.emptyDay}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {selectedDay ? "Nothing scheduled. Tap + to add an event." : "No upcoming events. Tap + to schedule something."}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {dayEvents.map(e => {
                const startTime = new Date(e.startTime);
                const timeStr = startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                const typeColor = TYPE_COLORS[(e.type as EventType)] ?? colors.primary;
                const wt = (e.windowType ?? "scheduled") as WindowType;
                const wtColor = getWindowTypeColor(wt);
                const WtIcon = WINDOW_TYPE_ICONS[wt];
                return (
                  <View key={e.id} style={[styles.eventRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.eventDot, { backgroundColor: wtColor }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.eventTitle, { color: colors.foreground }]}>{e.title}</Text>
                      <Text style={[styles.eventMeta, { color: colors.mutedForeground }]}>
                        {startTime.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {timeStr}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View style={[styles.typeBadge, { backgroundColor: typeColor + "1A", borderColor: typeColor + "40" }]}>
                        <Text style={[styles.typeText, { color: typeColor }]}>{e.type}</Text>
                      </View>
                      <View style={[styles.typeBadge, { backgroundColor: wtColor + "1A", borderColor: wtColor + "40", flexDirection: "row", alignItems: "center", gap: 3 }]}>
                        <Feather name={WtIcon} size={9} color={wtColor} />
                        <Text style={[styles.typeText, { color: wtColor }]}>{WINDOW_TYPE_LABELS[wt]}</Text>
                      </View>
                      <Pressable onPress={() => confirmDelete(e.id, e.title)} hitSlop={8}>
                        <Feather name="trash-2" size={14} color={colors.destructive} />
                      </Pressable>
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
  dot: { width: 4, height: 4, borderRadius: 2 },
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
  typeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
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
