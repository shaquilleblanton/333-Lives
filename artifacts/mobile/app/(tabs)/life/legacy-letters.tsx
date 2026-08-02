import { Feather } from "@expo/vector-icons";
import {
  useGetLegacyLetters,
  useCreateLegacyLetter,
  useUpdateLegacyLetter,
  useDeleteLegacyLetter,
  useSealLegacyLetter,
  useUnsealLegacyLetter,
  getGetLegacyLettersQueryKey,
} from "@workspace/api-client-react";
import type { LegacyLetter } from "@workspace/api-client-react";
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

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

const TRIGGER_TYPES = ["date", "milestone", "manual", "if_gone"] as const;
type TriggerType = typeof TRIGGER_TYPES[number];

const TRIGGER_LABELS: Record<TriggerType, string> = {
  date: "On a Date",
  milestone: "At a Milestone",
  if_gone: "If I'm Gone",
  manual: "Manual Send",
};

const TRIGGER_ICONS: Record<TriggerType, keyof typeof Feather.glyphMap> = {
  date: "calendar",
  milestone: "flag",
  if_gone: "heart",
  manual: "send",
};

function LetterCard({ letter, onPress }: { letter: LegacyLetter; onPress: () => void }) {
  const colors = useColors();
  const trigger = TRIGGER_LABELS[letter.triggerType as TriggerType] ?? "Manual";
  const triggerIcon = TRIGGER_ICONS[letter.triggerType as TriggerType] ?? "send";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: letter.isSealed ? colors.accent + "40" : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.letterIcon, { backgroundColor: letter.isSealed ? colors.accent + "1A" : colors.muted + "40" }]}>
        <Feather name={letter.isSealed ? "lock" : "mail"} size={20} color={letter.isSealed ? colors.accent : colors.mutedForeground} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.row}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{letter.title}</Text>
          <View style={[styles.statusBadge, {
            backgroundColor: letter.isSealed ? colors.accent + "1A" : colors.muted + "40",
            borderColor: letter.isSealed ? colors.accent + "40" : colors.border,
          }]}>
            <Text style={[styles.statusText, { color: letter.isSealed ? colors.accent : colors.mutedForeground }]}>
              {letter.status}
            </Text>
          </View>
        </View>
        <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
          To: {letter.recipientName}{letter.recipientRelation ? ` · ${letter.recipientRelation}` : ""}
        </Text>
        <View style={[styles.row, { gap: 4, marginTop: 2 }]}>
          <Feather name={triggerIcon} size={11} color={colors.mutedForeground} />
          <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>{trigger}</Text>
        </View>
        {letter.content ? <Text style={[styles.preview, { color: colors.mutedForeground }]} numberOfLines={2}>{letter.content}</Text> : null}
      </View>
    </Pressable>
  );
}

function LetterDetailModal({ letter, onClose, onSeal, onUnseal, onEdit, onDelete, isBusy }: {
  letter: LegacyLetter;
  onClose: () => void;
  onSeal: () => void;
  onUnseal: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isBusy: boolean;
}) {
  const colors = useColors();
  return (
    <Modal visible animationType="slide">
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.foreground }]} numberOfLines={1}>{letter.title}</Text>
          <Pressable onPress={onDelete} hitSlop={8}>
            <Feather name="trash-2" size={18} color="#f87171" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 16 }}>
          {/* Meta */}
          <View style={[styles.metaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.metaRow, { color: colors.mutedForeground }]}>To: <Text style={{ color: colors.foreground }}>{letter.recipientName}</Text></Text>
            {letter.recipientRelation ? <Text style={[styles.metaRow, { color: colors.mutedForeground }]}>Relation: <Text style={{ color: colors.foreground }}>{letter.recipientRelation}</Text></Text> : null}
            <Text style={[styles.metaRow, { color: colors.mutedForeground }]}>Delivery: <Text style={{ color: colors.foreground }}>{TRIGGER_LABELS[letter.triggerType as TriggerType] ?? letter.triggerType}</Text></Text>
            <Text style={[styles.metaRow, { color: colors.mutedForeground }]}>Status: <Text style={{ color: letter.isSealed ? colors.accent : colors.mutedForeground }}>{letter.status}</Text></Text>
            {letter.triggerDate ? <Text style={[styles.metaRow, { color: colors.mutedForeground }]}>Date: <Text style={{ color: colors.foreground }}>{new Date(letter.triggerDate + "T12:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</Text></Text> : null}
          </View>

          {/* Content */}
          {letter.content ? (
            <View style={[styles.contentCard, { backgroundColor: colors.card, borderColor: letter.isSealed ? colors.accent + "30" : colors.border }]}>
              {letter.isSealed ? <Feather name="lock" size={14} color={colors.accent} style={{ marginBottom: 8 }} /> : null}
              <Text style={[styles.letterContent, { color: colors.foreground }]}>{letter.content}</Text>
            </View>
          ) : null}

          {/* Actions */}
          {!letter.isSealed ? (
            <View style={{ gap: 10 }}>
              {/* Edit draft */}
              <Pressable
                onPress={onEdit}
                style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
              >
                <Feather name="edit-3" size={16} color={colors.foreground} />
                <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Edit Draft</Text>
              </Pressable>
              {/* Seal */}
              <Pressable
                onPress={onSeal}
                disabled={isBusy}
                style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.accent + "1A", borderColor: colors.accent + "50", opacity: pressed || isBusy ? 0.7 : 1 }]}
              >
                {isBusy ? <ActivityIndicator color={colors.accent} size="small" /> : <Feather name="lock" size={16} color={colors.accent} />}
                <Text style={[styles.actionBtnText, { color: colors.accent }]}>Seal This Letter</Text>
              </Pressable>
            </View>
          ) : (
            /* Unseal */
            <Pressable
              onPress={onUnseal}
              disabled={isBusy}
              style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.muted + "40", borderColor: colors.border, opacity: pressed || isBusy ? 0.7 : 1 }]}
            >
              {isBusy ? <ActivityIndicator color={colors.mutedForeground} size="small" /> : <Feather name="unlock" size={16} color={colors.mutedForeground} />}
              <Text style={[styles.actionBtnText, { color: colors.mutedForeground }]}>Unseal & Edit</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

type MediaType = "text" | "voice";

function WriteModal({ visible, letter, onClose, onSave, isSaving }: {
  visible: boolean;
  letter: LegacyLetter | null;
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
}) {
  const colors = useColors();
  const isEditing = !!letter;

  const [title, setTitle] = useState(letter?.title ?? "");
  const [recipientName, setRecipientName] = useState(letter?.recipientName ?? "");
  const [recipientRelation, setRecipientRelation] = useState(letter?.recipientRelation ?? "");
  const [triggerType, setTriggerType] = useState<TriggerType>((letter?.triggerType as TriggerType) ?? "date");
  const [mediaType, setMediaType] = useState<MediaType>((letter?.mediaType as MediaType) ?? "text");
  const [content, setContent] = useState(letter?.content ?? "");

  React.useEffect(() => {
    if (visible) {
      setTitle(letter?.title ?? "");
      setRecipientName(letter?.recipientName ?? "");
      setRecipientRelation(letter?.recipientRelation ?? "");
      setTriggerType((letter?.triggerType as TriggerType) ?? "date");
      setMediaType((letter?.mediaType as MediaType) ?? "text");
      setContent(letter?.content ?? "");
    }
  }, [visible, letter]);

  function reset() { setTitle(""); setRecipientName(""); setRecipientRelation(""); setTriggerType("date"); setMediaType("text"); setContent(""); }

  function submit() {
    if (!title.trim() || !recipientName.trim()) return;
    if (mediaType === "text" && !content.trim()) return;
    onSave({
      title: title.trim(),
      recipientName: recipientName.trim(),
      recipientRelation: recipientRelation.trim() || undefined,
      triggerType,
      mediaType,
      content: content.trim() || undefined,
      status: "draft",
      isSealed: false,
    });
    reset();
  }

  return (
    <Modal visible={visible} animationType="slide">
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => { reset(); onClose(); }} hitSlop={8}>
            <Feather name="x" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>{isEditing ? "Edit Letter" : "Write a Letter"}</Text>
          <View style={{ width: 22 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 14 }}>
          <TextInput value={title} onChangeText={setTitle} placeholder="Letter title" placeholderTextColor={colors.mutedForeground + "99"} autoFocus={!isEditing}
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />
          <View style={styles.row}>
            <TextInput value={recipientName} onChangeText={setRecipientName} placeholder="To (name)" placeholderTextColor={colors.mutedForeground + "99"}
              style={[styles.input, { flex: 1, backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />
            <TextInput value={recipientRelation} onChangeText={setRecipientRelation} placeholder="Relationship" placeholderTextColor={colors.mutedForeground + "99"}
              style={[styles.input, { flex: 1, backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />
          </View>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>When to deliver</Text>
          <View style={[styles.pills, { marginBottom: 4 }]}>
            {TRIGGER_TYPES.map(t => (
              <Pressable key={t} onPress={() => setTriggerType(t)}
                style={[styles.pill, { borderColor: triggerType === t ? colors.primary : colors.border, backgroundColor: triggerType === t ? colors.primary + "1A" : "transparent" }]}>
                <Text style={[styles.pillText, { color: triggerType === t ? colors.primary : colors.mutedForeground }]}>{TRIGGER_LABELS[t]}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Format</Text>
          <View style={[styles.pills, { marginBottom: 4 }]}>
            {(["text", "voice"] as MediaType[]).map(m => (
              <Pressable key={m} onPress={() => setMediaType(m)}
                style={[styles.pill, { borderColor: mediaType === m ? colors.primary : colors.border, backgroundColor: mediaType === m ? colors.primary + "1A" : "transparent" }]}>
                <Feather name={m === "text" ? "file-text" : "mic"} size={12} color={mediaType === m ? colors.primary : colors.mutedForeground} style={{ marginRight: 4 }} />
                <Text style={[styles.pillText, { color: mediaType === m ? colors.primary : colors.mutedForeground }]}>{m === "text" ? "Written" : "Voice Recording"}</Text>
              </Pressable>
            ))}
          </View>

          {mediaType === "text" ? (
            <TextInput value={content} onChangeText={setContent} placeholder="Write your letter…" placeholderTextColor={colors.mutedForeground + "99"} multiline numberOfLines={14} textAlignVertical="top"
              style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />
          ) : (
            <View style={[styles.voiceNote, { backgroundColor: colors.card, borderColor: colors.primary + "40" }]}>
              <Feather name="mic" size={28} color={colors.primary} style={{ marginBottom: 8 }} />
              <Text style={[styles.voiceNoteTitle, { color: colors.foreground }]}>Voice Letter</Text>
              <Text style={[styles.voiceNoteSub, { color: colors.mutedForeground }]}>
                Add a note about what this voice letter contains, then record on your device and attach the file.
              </Text>
              <TextInput value={content} onChangeText={setContent} placeholder="Describe or transcribe this voice letter…" placeholderTextColor={colors.mutedForeground + "99"} multiline numberOfLines={4} textAlignVertical="top"
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 12 }]} />
            </View>
          )}
          <Pressable onPress={submit} disabled={!title.trim() || !recipientName.trim() || (mediaType === "text" && !content.trim()) || isSaving}
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: !title.trim() || !recipientName.trim() || (mediaType === "text" && !content.trim()) || isSaving ? 0.5 : 1 }]}>
            {isSaving ? <ActivityIndicator color={colors.primaryForeground} size="small" /> : <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>{isEditing ? "Save Changes" : "Save as Draft"}</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function LegacyLettersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data: letters, isLoading, refetch, isRefetching } = useGetLegacyLetters();
  const createLetter = useCreateLegacyLetter();
  const updateLetter = useUpdateLegacyLetter();
  const deleteLetter = useDeleteLegacyLetter();
  const sealLetter = useSealLegacyLetter();
  const unsealLetter = useUnsealLegacyLetter();

  const [writeOpen, setWriteOpen] = useState(false);
  const [editingLetter, setEditingLetter] = useState<LegacyLetter | null>(null);
  const [selected, setSelected] = useState<LegacyLetter | null>(null);

  function invalidate() { qc.invalidateQueries({ queryKey: getGetLegacyLettersQueryKey() }); }

  async function handleSave(data: any) {
    try {
      if (editingLetter) {
        await updateLetter.mutateAsync({ id: editingLetter.id, data });
      } else {
        await createLetter.mutateAsync({ data: { ...data, userId: 0 } as any });
      }
      invalidate();
      setWriteOpen(false);
      setEditingLetter(null);
    } catch { Alert.alert("Couldn't save letter", "Please try again."); }
  }

  async function handleSeal(id: number) {
    try { await sealLetter.mutateAsync({ id }); invalidate(); setSelected(null); }
    catch { Alert.alert("Couldn't seal letter", "Please try again."); }
  }

  async function handleUnseal(id: number) {
    try { await unsealLetter.mutateAsync({ id }); invalidate(); setSelected(null); }
    catch { Alert.alert("Couldn't unseal letter", "Please try again."); }
  }

  function handleEditFromDetail(letter: LegacyLetter) {
    setSelected(null);
    setEditingLetter(letter);
    setWriteOpen(true);
  }

  function confirmDelete(id: number) {
    Alert.alert("Delete letter?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try { await deleteLetter.mutateAsync({ id }); invalidate(); setSelected(null); }
          catch { Alert.alert("Couldn't delete", "Please try again."); }
        },
      },
    ]);
  }

  const topPad = insets.top + WEB_TOP_INSET + 12;
  const botPad = insets.bottom + WEB_BOTTOM_INSET + 24;
  const isBusy = sealLetter.isPending || unsealLetter.isPending;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={letters ?? []}
        keyExtractor={l => String(l.id)}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: botPad, paddingHorizontal: 20, gap: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
              <Feather name="arrow-left" size={22} color={colors.foreground} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pageTitle, { color: colors.foreground }]}>Legacy Letters</Text>
              <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>Words that outlive the moment.</Text>
            </View>
            <Pressable onPress={() => { setEditingLetter(null); setWriteOpen(true); }} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
              <Feather name="plus" size={20} color={colors.primaryForeground} />
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          isLoading ? <View style={styles.empty}><ActivityIndicator color={colors.primary} /></View> : (
            <View style={styles.empty}>
              <Feather name="mail" size={40} color={colors.mutedForeground + "50"} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No letters yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Write words for the people who matter most.</Text>
            </View>
          )
        }
        renderItem={({ item }) => <LetterCard letter={item} onPress={() => setSelected(item)} />}
      />

      {selected ? (
        <LetterDetailModal
          letter={selected}
          onClose={() => setSelected(null)}
          onSeal={() => handleSeal(selected.id)}
          onUnseal={() => handleUnseal(selected.id)}
          onEdit={() => handleEditFromDetail(selected)}
          onDelete={() => confirmDelete(selected.id)}
          isBusy={isBusy}
        />
      ) : null}

      <WriteModal
        visible={writeOpen}
        letter={editingLetter}
        onClose={() => { setWriteOpen(false); setEditingLetter(null); }}
        onSave={handleSave}
        isSaving={createLetter.isPending || updateLetter.isPending}
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
  card: { flexDirection: "row", alignItems: "flex-start", gap: 14, borderRadius: 16, borderWidth: 1, padding: 14 },
  letterIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center" },
  cardTitle: { fontFamily: fonts.serif, fontSize: 16, flex: 1 },
  cardMeta: { fontFamily: fonts.sub, fontSize: 12, marginTop: 3 },
  preview: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, marginTop: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1, marginLeft: 6 },
  statusText: { fontFamily: fonts.sub, fontSize: 10, textTransform: "capitalize" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20 },
  emptySub: { fontFamily: fonts.sub, fontSize: 14, textAlign: "center" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, paddingTop: 60 },
  modalTitle: { fontFamily: fonts.serif, fontSize: 18, flex: 1, textAlign: "center" },
  metaCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 6 },
  metaRow: { fontFamily: fonts.sub, fontSize: 13 },
  contentCard: { borderRadius: 14, borderWidth: 1, padding: 20 },
  letterContent: { fontFamily: fonts.body, fontSize: 15, lineHeight: 24 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, borderWidth: 1, paddingVertical: 14 },
  actionBtnText: { fontFamily: fonts.subSemibold, fontSize: 14 },
  voiceNote: { borderRadius: 14, borderWidth: 1, borderStyle: "dashed", padding: 20, alignItems: "center" },
  voiceNoteTitle: { fontFamily: fonts.serif, fontSize: 17, marginBottom: 6 },
  voiceNoteSub: { fontFamily: fonts.sub, fontSize: 13, textAlign: "center", lineHeight: 18 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontFamily: fonts.body, fontSize: 14 },
  textArea: { minHeight: 220, textAlignVertical: "top" },
  fieldLabel: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  pillText: { fontFamily: fonts.sub, fontSize: 12 },
  saveBtn: { borderRadius: 999, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { fontFamily: fonts.subSemibold, fontSize: 15 },
});
