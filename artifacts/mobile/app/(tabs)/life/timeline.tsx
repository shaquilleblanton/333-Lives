import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetLifeEvents,
  useCreateLifeEvent,
  useUpdateLifeEvent,
  useDeleteLifeEvent,
  getGetLifeEventsQueryKey,
  requestUploadUrl,
  type LifeEvent,
  type MediaAttachment,
} from "@workspace/api-client-react";
import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";
import { ErrorRetryView } from "@/components/ErrorRetryView";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

const CATEGORIES = [
  { value: "education",    label: "Education",    icon: "book" as const,       color: "#60a5fa" },
  { value: "career",       label: "Career",       icon: "briefcase" as const,  color: "#34d399" },
  { value: "family",       label: "Family",       icon: "users" as const,      color: "#f472b6" },
  { value: "health",       label: "Health",       icon: "heart" as const,      color: "#fb7185" },
  { value: "home",         label: "Home",         icon: "home" as const,       color: "#fbbf24" },
  { value: "travel",       label: "Travel",       icon: "map" as const,        color: "#38bdf8" },
  { value: "loss",         label: "Loss",         icon: "cloud-rain" as const, color: "#94a3b8" },
  { value: "achievement",  label: "Achievement",  icon: "award" as const,      color: "#f59e0b" },
  { value: "relationship", label: "Relationship", icon: "link" as const,       color: "#a78bfa" },
  { value: "spiritual",    label: "Spiritual",    icon: "star" as const,       color: "#e879f9" },
  { value: "other",        label: "Other",        icon: "circle" as const,     color: "#6b7280" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

function getCategoryMeta(cat: string) {
  return CATEGORIES.find((c) => c.value === cat) ?? CATEGORIES[CATEGORIES.length - 1];
}

function formatEventDate(date: string, approx: boolean) {
  if (approx && date.length === 7) {
    const [y, m] = date.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[Number(m) - 1]} ${y}`;
  }
  if (approx) return date.slice(0, 4);
  if (date.length === 10) {
    const [y, m, d] = date.split("-");
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return `${months[Number(m) - 1]} ${Number(d)}, ${y}`;
  }
  return date;
}

function getEventYear(date: string) { return date.slice(0, 4); }

function formatClock(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

type TimelineItem =
  | { type: "year"; year: string; id: string }
  | { type: "event"; event: LifeEvent; id: string };

export default function TimelineScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + WEB_TOP_INSET + 12;
  const botPad = insets.bottom + WEB_BOTTOM_INSET + 24;

  const { data: events = [], isLoading } = useGetLifeEvents();
  const deleteEvent = useDeleteLifeEvent();
  const queryClient = useQueryClient();

  const [sortAsc, setSortAsc] = useState(false);
  const [filterCat, setFilterCat] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [yearMin, setYearMin] = useState("");
  const [yearMax, setYearMax] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<LifeEvent | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const sorted = [...events]
    .filter((e) => !filterCat || e.category === filterCat)
    .filter((e) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return e.title.toLowerCase().includes(q) || (e.description ?? "").toLowerCase().includes(q);
    })
    .filter((e) => {
      const year = Number(getEventYear(e.date));
      if (yearMin && year < Number(yearMin)) return false;
      if (yearMax && year > Number(yearMax)) return false;
      return true;
    })
    .sort((a, b) => sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));

  const items: TimelineItem[] = [];
  let lastYear = "";
  for (const event of sorted) {
    const year = getEventYear(event.date);
    if (year !== lastYear) { items.push({ type: "year", year, id: `year-${year}` }); lastYear = year; }
    items.push({ type: "event", event, id: `event-${event.id}` });
  }

  const confirmDelete = (id: number) => {
    Alert.alert("Delete Event", "Remove this life event?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteEvent.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetLifeEventsQueryKey() }), onError: () => Alert.alert("Error", "Couldn't delete this event. Please try again.") }) },
    ]);
  };

  const renderItem = useCallback(({ item }: { item: TimelineItem }) => {
    if (item.type === "year") {
      return (
        <View style={[styles.yearRow]}>
          <View style={[styles.yearDot, { backgroundColor: colors.primary + "30", borderColor: colors.primary + "60" }]}>
            <View style={[styles.yearDotInner, { backgroundColor: colors.primary }]} />
          </View>
          <Text style={[styles.yearLabel, { color: colors.foreground + "99" }]}>{item.year}</Text>
        </View>
      );
    }
    const { event } = item;
    const meta = getCategoryMeta(event.category);
    const isExpanded = expandedId === event.id;
    const media = (event.mediaUrls ?? []) as MediaAttachment[];

    return (
      <View style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.categoryAccent, { backgroundColor: meta.color + "99" }]} />
        <View style={styles.eventBody}>
          <View style={[styles.categoryIcon, { backgroundColor: meta.color + "25" }]}>
            <Feather name={meta.icon} size={18} color={meta.color} />
          </View>
          <View style={styles.eventContent}>
            <View style={styles.eventHeaderRow}>
              <Text style={[styles.eventTitle, { color: colors.foreground }]} numberOfLines={isExpanded ? undefined : 2}>
                {event.title}
              </Text>
              <View style={styles.eventActions}>
                <Pressable onPress={() => setExpandedId(isExpanded ? null : event.id)} style={styles.actionBtn}>
                  <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
                </Pressable>
                <Pressable onPress={() => { setEditingEvent(event); setIsFormOpen(true); }} style={styles.actionBtn} accessibilityLabel="Edit event">
                  <Feather name="edit-2" size={14} color={colors.mutedForeground} />
                </Pressable>
                <Pressable onPress={() => confirmDelete(event.id)} style={styles.actionBtn} accessibilityLabel="Delete event">
                  <Feather name="trash-2" size={14} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaDate, { color: colors.mutedForeground }]}>
                {formatEventDate(event.date, event.approximateDate)}{event.approximateDate ? " (approx.)" : ""}
              </Text>
              <View style={[styles.catBadge, { backgroundColor: meta.color + "20", borderColor: meta.color + "40" }]}>
                <Text style={[styles.catBadgeText, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </View>
            {!isExpanded && event.description ? (
              <Text style={[styles.descPreview, { color: colors.foreground + "B0" }]} numberOfLines={2}>{event.description}</Text>
            ) : null}
            {!isExpanded && media.length > 0 && (
              <View style={styles.mediaThumbs}>
                {media.slice(0, 3).map((m, i) => (
                  <View key={i} style={[styles.mediaThumb, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                    <Feather name={m.type === "photo" ? "image" : m.type === "voice" ? "mic" : "file-text"} size={14} color={colors.mutedForeground} />
                  </View>
                ))}
                {media.length > 3 && <Text style={[styles.mediaMore, { color: colors.mutedForeground }]}>+{media.length - 3}</Text>}
              </View>
            )}
            {isExpanded && (
              <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                {event.description ? <Text style={[styles.descFull, { color: colors.foreground + "CC" }]}>{event.description}</Text> : null}
                {media.length > 0 && (
                  <View style={styles.mediaList}>
                    {media.map((m, i) => (
                      <View key={i} style={[styles.mediaItem, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                        <Feather name={m.type === "photo" ? "image" : m.type === "voice" ? "mic" : "file-text"} size={14} color={colors.mutedForeground} />
                        <Text style={[styles.mediaName, { color: colors.mutedForeground }]} numberOfLines={1}>{m.name}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }, [colors, expandedId]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Life Timeline</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Your defining moments</Text>
        </View>
        <Pressable onPress={() => { setEditingEvent(null); setIsFormOpen(true); }} style={[styles.addBtn, { backgroundColor: colors.primary }]} accessibilityLabel="Add event">
          <Feather name="plus" size={18} color="#fff" />
        </Pressable>
      </View>

      {/* Search bar */}
      <View style={[styles.searchRow, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={14} color={colors.mutedForeground} style={{ marginRight: 6 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search events…"
            placeholderTextColor={colors.mutedForeground + "80"}
            style={[styles.searchText, { color: colors.foreground }]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
        <View style={styles.yearRange}>
          <TextInput
            value={yearMin}
            onChangeText={setYearMin}
            placeholder="From"
            placeholderTextColor={colors.mutedForeground + "80"}
            style={[styles.yearInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            maxLength={4}
            keyboardType="numeric"
          />
          <Text style={[styles.yearDash, { color: colors.mutedForeground }]}>–</Text>
          <TextInput
            value={yearMax}
            onChangeText={setYearMax}
            placeholder="To"
            placeholderTextColor={colors.mutedForeground + "80"}
            style={[styles.yearInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            maxLength={4}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Category filter strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterStrip, { backgroundColor: colors.background }]} contentContainerStyle={styles.filterContent}>
        <Pressable onPress={() => setFilterCat(null)} style={[styles.filterChip, { borderColor: !filterCat ? colors.primary + "60" : colors.border, backgroundColor: !filterCat ? colors.primary + "15" : "transparent" }]}>
          <Text style={[styles.filterChipText, { color: !filterCat ? colors.primary : colors.mutedForeground }]}>All</Text>
        </Pressable>
        {CATEGORIES.map((cat) => (
          <Pressable key={cat.value} onPress={() => setFilterCat(filterCat === cat.value ? null : cat.value)}
            style={[styles.filterChip, { borderColor: filterCat === cat.value ? cat.color + "60" : colors.border, backgroundColor: filterCat === cat.value ? cat.color + "15" : "transparent" }]}>
            <Feather name={cat.icon} size={12} color={filterCat === cat.value ? cat.color : colors.mutedForeground} />
            <Text style={[styles.filterChipText, { color: filterCat === cat.value ? cat.color : colors.mutedForeground }]}>{cat.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Sort + count */}
      <View style={[styles.sortBar, { borderBottomColor: colors.border }]}>
        <Text style={[styles.countText, { color: colors.mutedForeground }]}>{sorted.length} event{sorted.length !== 1 ? "s" : ""}</Text>
        <Pressable onPress={() => setSortAsc(!sortAsc)} style={styles.sortBtn}>
          <Feather name={sortAsc ? "arrow-up" : "arrow-down"} size={13} color={colors.mutedForeground} />
          <Text style={[styles.sortText, { color: colors.mutedForeground }]}>{sortAsc ? "Oldest first" : "Newest first"}</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="calendar" size={40} color={colors.mutedForeground + "60"} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No milestones yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Add the moments that shaped your life.</Text>
          <Pressable onPress={() => { setEditingEvent(null); setIsFormOpen(true); }} style={[styles.emptyBtn, { borderColor: colors.primary + "40" }]}>
            <Text style={[styles.emptyBtnText, { color: colors.primary }]}>Add first event</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList data={items} keyExtractor={(item) => item.id} renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: botPad, paddingTop: 8 }}
          showsVerticalScrollIndicator={false} />
      )}

      <EventFormModal visible={isFormOpen} onClose={() => setIsFormOpen(false)} editingEvent={editingEvent} />
    </View>
  );
}

function EventFormModal({ visible, onClose, editingEvent }: {
  visible: boolean;
  onClose: () => void;
  editingEvent: LifeEvent | null;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isEditing = editingEvent !== null;
  const createEvent = useCreateLifeEvent();
  const updateEvent = useUpdateLifeEvent();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [approx, setApprox] = useState(false);
  const [category, setCategory] = useState<Category>("other");
  const [description, setDescription] = useState("");
  const [mediaUrls, setMediaUrls] = useState<MediaAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [catPickerOpen, setCatPickerOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSavingAudio, setIsSavingAudio] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const durationRef = useRef(0);
  durationRef.current = recorderState.durationMillis ?? 0;

  const prevVisible = useRef(false);
  if (visible !== prevVisible.current) {
    prevVisible.current = visible;
    if (visible) {
      setTitle(editingEvent?.title ?? "");
      setDate(editingEvent?.date ?? "");
      setApprox(editingEvent?.approximateDate ?? false);
      setCategory((editingEvent?.category as Category) ?? "other");
      setDescription(editingEvent?.description ?? "");
      setMediaUrls((editingEvent?.mediaUrls as MediaAttachment[]) ?? []);
      setCatPickerOpen(false);
      setIsRecording(false);
    } else {
      if (isRecording) {
        recorder.stop().catch(() => {});
        setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
        setIsRecording(false);
      }
    }
  }

  const isPending = createEvent.isPending || updateEvent.isPending;
  const selectedCat = getCategoryMeta(category);

  const handlePickPhoto = () => {
    Alert.alert("Add Photo", "Choose source", [
      {
        text: "Camera",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") { Alert.alert("Permission needed", "Allow camera access to take a photo."); return; }
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
          if (result.canceled || !result.assets[0]) return;
          await uploadImage(result.assets[0]);
        },
      },
      {
        text: "Photo Library",
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") { Alert.alert("Permission needed", "Allow photo access to attach images."); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
          if (result.canceled || !result.assets[0]) return;
          await uploadImage(result.assets[0]);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
    const name = asset.fileName ?? `photo_${Date.now()}.jpg`;
    setIsUploading(true);
    try {
      const urlRes = await requestUploadUrl({ name, size: asset.fileSize ?? 0, contentType: asset.mimeType ?? "image/jpeg" });
      await FileSystem.uploadAsync(urlRes.uploadURL, asset.uri, { httpMethod: "PUT", headers: { "Content-Type": asset.mimeType ?? "image/jpeg" } });
      setMediaUrls((prev) => [...prev, { type: "photo", objectPath: urlRes.objectPath, name }]);
    } catch {
      Alert.alert("Upload failed", "Couldn't upload the photo. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const startRecord = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) { Alert.alert("Microphone needed", "Allow microphone access to record a voice note."); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
    } catch {
      Alert.alert("Recording failed", "Couldn't start recording.");
    }
  };

  const stopRecord = async () => {
    setIsSavingAudio(true);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = recorder.uri;
      if (!uri) throw new Error("no uri");
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) throw new Error("file missing");
      const size = "size" in info && typeof info.size === "number" ? info.size : 0;
      const ext = uri.split(".").pop()?.toLowerCase() || "m4a";
      const contentType = ext === "m4a" || ext === "mp4" ? "audio/mp4" : `audio/${ext}`;
      const name = `voice-note-${Date.now()}.${ext}`;
      const upload = await requestUploadUrl({ name, size, contentType });
      const result = await FileSystem.uploadAsync(upload.uploadURL, uri, { httpMethod: "PUT", headers: { "Content-Type": contentType } });
      if (result.status < 200 || result.status >= 300) throw new Error("upload failed");
      setMediaUrls((prev) => [...prev, { type: "voice", objectPath: upload.objectPath, name }]);
    } catch {
      Alert.alert("Couldn't save voice note", "Please try again.");
    } finally {
      setIsRecording(false);
      setIsSavingAudio(false);
    }
  };

  const removeMedia = (idx: number) => setMediaUrls((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = () => {
    if (!title.trim() || !date.trim()) return;
    const data = { title: title.trim(), date: date.trim(), approximateDate: approx, category, description: description.trim() || undefined, mediaUrls };
    const onSuccess = () => { queryClient.invalidateQueries({ queryKey: getGetLifeEventsQueryKey() }); onClose(); };
    const onError = () => Alert.alert("Error", "Couldn't save this event. Please try again.");
    if (isEditing && editingEvent) {
      updateEvent.mutate({ id: editingEvent.id, data }, { onSuccess, onError });
    } else {
      createEvent.mutate({ data }, { onSuccess, onError });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
          <Pressable onPress={onClose} style={styles.modalCloseBtn}>
            <Text style={[styles.modalCloseText, { color: colors.mutedForeground }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>{isEditing ? "Edit Event" : "Add Event"}</Text>
          <Pressable onPress={handleSave}
            disabled={!title.trim() || !date.trim() || isPending || isUploading || isRecording || isSavingAudio}
            style={[styles.modalSaveBtn, { backgroundColor: colors.primary, opacity: (!title.trim() || !date.trim() || isPending || isUploading || isRecording || isSavingAudio) ? 0.5 : 1 }]}>
            {isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSaveText}>Save</Text>}
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
          {/* Title */}
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Title</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="Graduated college, got married…"
            placeholderTextColor={colors.mutedForeground + "80"}
            style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />

          {/* Category */}
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Category</Text>
          <Pressable onPress={() => setCatPickerOpen(!catPickerOpen)}
            style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Feather name={selectedCat.icon} size={16} color={selectedCat.color} />
              <Text style={{ color: colors.foreground, fontFamily: fonts.sub }}>{selectedCat.label}</Text>
            </View>
            <Feather name={catPickerOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
          </Pressable>
          {catPickerOpen && (
            <View style={[styles.catPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {CATEGORIES.map((cat) => (
                <Pressable key={cat.value} onPress={() => { setCategory(cat.value); setCatPickerOpen(false); }}
                  style={[styles.catPickerItem, { borderBottomColor: colors.border }]}>
                  <Feather name={cat.icon} size={16} color={cat.color} />
                  <Text style={[styles.catPickerLabel, { color: colors.foreground }]}>{cat.label}</Text>
                  {category === cat.value && <Feather name="check" size={14} color={colors.primary} style={{ marginLeft: "auto" as any }} />}
                </Pressable>
              ))}
            </View>
          )}

          {/* Date */}
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Date</Text>
          <TextInput value={date} onChangeText={setDate} placeholder={approx ? "YYYY-MM or YYYY" : "YYYY-MM-DD"}
            placeholderTextColor={colors.mutedForeground + "80"}
            style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />
          <Pressable onPress={() => setApprox(!approx)} style={styles.approxRow}>
            <View style={[styles.checkbox, { borderColor: colors.border, backgroundColor: approx ? colors.primary : "transparent" }]}>
              {approx && <Feather name="check" size={10} color="#fff" />}
            </View>
            <Text style={[styles.approxLabel, { color: colors.mutedForeground }]}>Approximate date</Text>
          </Pressable>

          {/* Description */}
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Description (optional)</Text>
          <TextInput value={description} onChangeText={setDescription} placeholder="Tell the story behind this moment…"
            placeholderTextColor={colors.mutedForeground + "80"} multiline numberOfLines={4}
            style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />

          {/* Media */}
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Media (optional, up to 10)</Text>
          {mediaUrls.length > 0 && (
            <View style={styles.mediaItems}>
              {mediaUrls.map((m, i) => (
                <View key={i} style={[styles.mediaChip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Feather name={m.type === "photo" ? "image" : m.type === "voice" ? "mic" : "file-text"} size={12} color={colors.mutedForeground} />
                  <Text style={[styles.mediaChipText, { color: colors.foreground }]} numberOfLines={1}>{m.name}</Text>
                  <Pressable onPress={() => removeMedia(i)}>
                    <Feather name="x" size={12} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          {mediaUrls.length < 10 && (
            <View style={styles.mediaButtons}>
              <Pressable onPress={handlePickPhoto} disabled={isUploading}
                style={[styles.attachBtn, { borderColor: colors.border, opacity: isUploading ? 0.6 : 1 }]}>
                {isUploading ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="image" size={16} color={colors.mutedForeground} />}
                <Text style={[styles.attachBtnText, { color: colors.mutedForeground }]}>{isUploading ? "Uploading…" : "Photo / Camera"}</Text>
              </Pressable>
              {!isRecording ? (
                <Pressable onPress={startRecord} disabled={isSavingAudio}
                  style={[styles.attachBtn, { borderColor: colors.border, opacity: isSavingAudio ? 0.6 : 1 }]}>
                  {isSavingAudio ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="mic" size={16} color={colors.mutedForeground} />}
                  <Text style={[styles.attachBtnText, { color: colors.mutedForeground }]}>{isSavingAudio ? "Saving…" : "Record Voice Note"}</Text>
                </Pressable>
              ) : (
                <Pressable onPress={stopRecord}
                  style={[styles.attachBtn, { borderColor: "#ef4444" + "60", backgroundColor: "#ef4444" + "10" }]}>
                  <Feather name="stop-circle" size={16} color="#ef4444" />
                  <Text style={[styles.attachBtnText, { color: "#ef4444" }]}>
                    Stop · {formatClock(recorderState.durationMillis ?? 0)}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.serifBold, fontSize: 28, lineHeight: 34 },
  subtitle: { fontFamily: fonts.sub, fontSize: 13, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  searchInput: { flex: 1, flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  searchText: { flex: 1, fontFamily: fonts.sub, fontSize: 13 },
  yearRange: { flexDirection: "row", alignItems: "center", gap: 4 },
  yearInput: { width: 52, borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 7, fontFamily: fonts.sub, fontSize: 12, textAlign: "center" },
  yearDash: { fontFamily: fonts.sub, fontSize: 12 },
  filterStrip: { maxHeight: 50 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: "row" },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontFamily: fonts.sub, fontSize: 12 },
  sortBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  countText: { fontFamily: fonts.sub, fontSize: 12 },
  sortBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  sortText: { fontFamily: fonts.sub, fontSize: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyTitle: { fontFamily: fonts.serifBold, fontSize: 20, textAlign: "center" },
  emptyText: { fontFamily: fonts.sub, fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  emptyBtnText: { fontFamily: fonts.sub, fontSize: 14 },
  yearRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16, marginBottom: 4 },
  yearDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  yearDotInner: { width: 8, height: 8, borderRadius: 4 },
  yearLabel: { fontFamily: fonts.serifBold, fontSize: 22 },
  eventCard: { borderRadius: 14, borderWidth: 1, marginBottom: 10, marginLeft: 32, overflow: "hidden", flexDirection: "row" },
  categoryAccent: { width: 4 },
  eventBody: { flex: 1, flexDirection: "row", padding: 14, gap: 10 },
  categoryIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  eventContent: { flex: 1 },
  eventHeaderRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  eventTitle: { fontFamily: fonts.serifBold, fontSize: 15, lineHeight: 20, flex: 1 },
  eventActions: { flexDirection: "row", gap: 2 },
  actionBtn: { padding: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3, flexWrap: "wrap" },
  metaDate: { fontFamily: fonts.sub, fontSize: 12 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  catBadgeText: { fontFamily: fonts.sub, fontSize: 10 },
  descPreview: { fontFamily: fonts.sub, fontSize: 13, lineHeight: 18, marginTop: 6 },
  mediaThumbs: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  mediaThumb: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  mediaMore: { fontFamily: fonts.sub, fontSize: 11 },
  expandedContent: { marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  descFull: { fontFamily: fonts.sub, fontSize: 13, lineHeight: 20 },
  mediaList: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  mediaItem: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  mediaName: { fontFamily: fonts.sub, fontSize: 11, maxWidth: 100 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  modalCloseBtn: { minWidth: 60 },
  modalCloseText: { fontFamily: fonts.sub, fontSize: 15 },
  modalTitle: { fontFamily: fonts.serifBold, fontSize: 17 },
  modalSaveBtn: { minWidth: 60, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, alignItems: "center" },
  modalSaveText: { fontFamily: fonts.sub, fontSize: 14, color: "#fff" },
  fieldLabel: { fontFamily: fonts.sub, fontSize: 12, marginBottom: 6, marginTop: 16, textTransform: "uppercase", letterSpacing: 0.5 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.sub, fontSize: 15 },
  textArea: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.sub, fontSize: 15, minHeight: 100, textAlignVertical: "top" },
  approxRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  approxLabel: { fontFamily: fonts.sub, fontSize: 13 },
  catPicker: { borderWidth: 1, borderRadius: 10, marginTop: 4, overflow: "hidden" },
  catPickerItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  catPickerLabel: { fontFamily: fonts.sub, fontSize: 14 },
  mediaButtons: { flexDirection: "column", gap: 8, marginTop: 4 },
  attachBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  attachBtnText: { fontFamily: fonts.sub, fontSize: 14 },
  mediaItems: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  mediaChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, maxWidth: 160 },
  mediaChipText: { fontFamily: fonts.sub, fontSize: 12, flex: 1 },
  muted: {},
});
