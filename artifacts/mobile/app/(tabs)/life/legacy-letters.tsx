import { Feather } from "@expo/vector-icons";
import {
  useGetLegacyLetters,
  useCreateLegacyLetter,
  useUpdateLegacyLetter,
  useDeleteLegacyLetter,
  useSealLegacyLetter,
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

const TRIGGER_TYPES = ["date", "milestone", "if_gone", "manual"] as const;
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
        { backgroundColor: colors.card, borderColor: letter.isSealed ? colors.accent + "40" : colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.letterIcon, { backgroundColor: letter.isSealed ? colors.accent + "1A" : colors.muted + "40" }]}>
        <Feather name={letter.isSealed ? "lock" : "mail"} size={20} color={letter.isSealed ? colors.accent : colors.mutedForeground} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.row}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{letter.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: letter.isSealed ? colors.accent + "1A" : colors.muted + "40", borderColor: letter.isSealed ? colors.accent + "40" : colors.border }]}>
            <Text style={[styles.statusText, { color: letter.isSealed ? colors.accent : colors.mutedForeground }]}>
              {letter.status}
            </Text>
          </View>
        </View>
        <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
          To: {letter.recipientName}{letter.recipientRelation ? ` · ${letter.recipientRelation}` : ""}
        </Text>
        <View style={styles.row}>
          <Feather name={triggerIcon} size={12} color={colors.mutedForeground} />
          <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>{trigger}</Text>
        </View>
        {letter.content ? <Text style={[styles.preview, { color: colors.mutedForeground }]} numberOfLines={2}>{letter.content}</Text> : null}
      </View>
    </Pressable>
  );
}

function LetterDetailModal({ letter, onClose, onSeal, onDelete }: {
  letter: LegacyLetter;
  onClose: () => void;
  onSeal: () => void;
  onDelete: () => void;
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
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          <View style={[styles.metaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.metaRow, { color: colors.mutedForeground }]}>To: <Text style={{ color: colors.foreground }}>{letter.recipientName}</Text></Text>
            {letter.recipientRelation ? <Text style={[styles.metaRow, { color: colors.mutedForeground }]}>Relation: <Text style={{ color: colors.foreground }}>{letter.recipientRelation}</Text></Text> : null}
            <Text style={[styles.metaRow, { color: colors.mutedForeground }]}>Delivery: <Text style={{ color: colors.foreground }}>{TRIGGER_LABELS[letter.triggerType as TriggerType] ?? letter.triggerType}</Text></Text>
            {letter.triggerDate ? <Text style={[styles.metaRow, { color: colors.mutedForeground }]}>Date: <Text style={{ color: colors.foreground }}>{new Date(letter.triggerDate + "T12:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</Text></Text> : null}
          </View>

          {letter.content ? (
            <View style={[styles.contentCard, { backgroundColor: colors.card, borderColor: letter.isSealed ? colors.accent + "30" : colors.border }]}>
              {letter.isSealed ? <Feather name="lock" size={14} color={colors.accent} style={{ marginBottom: 8 }} /> : null}
              <Text style={[styles.letterContent, { color: colors.foreground }]}>{letter.content}</Text>
            </View>
          ) : null}

          {!letter.isSealed ? (
            <Pressable
              onPress={onSeal}
              style={({ pressed }) => [styles.sealBtn, { backgroundColor: colors.accent + "1A", borderColor: colors.accent + "50", opacity: pressed ? 0.85 : 1 }]}
            >
              <Feather name="lock" size={16} color={colors.accent} />
              <Text style={[styles.sealBtnText, { color: colors.accent }]}>Seal This Letter</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function WriteModal({ visible, onClose, onSave, isSaving }: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
}) {
  const colors = useColors();
  const [title, setTitle] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientRelation, setRecipientRelation] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>("date");
  const [content, setContent] = useState("");

  function reset() { setTitle(""); setRecipientName(""); setRecipientRelation(""); setTriggerType("date"); setContent(""); }

  function submit() {
    if (!title.trim() || !recipientName.trim() || !content.trim()) return;
    onSave({ title: title.trim(), recipientName: recipientName.trim(), recipientRelation: recipientRelation.trim() || undefined, triggerType, content: content.trim(), status: "draft", isSealed: false });
    reset();
  }

  return (
    <Modal visible={visible} animationType="slide">
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => { reset(); onClose(); }} hitSlop={8}>
            <Feather name="x" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Write a Letter</Text>
          <View style={{ width: 22 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          <TextInput value={title} onChangeText={setTitle} placeholder="Letter title" placeholderTextColor={colors.mutedForeground + "99"}
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />
          <View style={styles.row}>
            <TextInput value={recipientName} onChangeText={setRecipientName} placeholder="To (name)" placeholderTextColor={colors.mutedForeground + "99"}
              style={[styles.input, { flex: 1, backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />
            <TextInput value={recipientRelation} onChangeText={setRecipientRelation} placeholder="Relationship" placeholderTextColor={colors.mutedForeground + "99"}
              style={[styles.input, { flex: 1, backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />
          </View>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>When to deliver</Text>
          <View style={[styles.pills, { marginBottom: 12 }]}>
            {TRIGGER_TYPES.map(t => (
              <Pressable key={t} onPress={() => setTriggerType(t)}
                style={[styles.pill, { borderColor: triggerType === t ? colors.primary : colors.border, backgroundColor: triggerType === t ? colors.primary + "1A" : "transparent" }]}>
                <Text style={[styles.pillText, { color: triggerType === t ? colors.primary : colors.mutedForeground }]}>{TRIGGER_LABELS[t]}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput value={content} onChangeText={setContent} placeholder="Write your letter…" placeholderTextColor={colors.mutedForeground + "99"} multiline numberOfLines={12} textAlignVertical="top"
            style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />
          <Pressable onPress={submit} disabled={!title.trim() || !recipientName.trim() || !content.trim() || isSaving}
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: !title.trim() || !recipientName.trim() || !content.trim() || isSaving ? 0.5 : 1 }]}>
            {isSaving ? <ActivityIndicator color="#000" size="small" /> : <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save as Draft</Text>}
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
  const deleteLetter = useDeleteLegacyLetter();
  const sealLetter = useSealLegacyLetter();
  const [writeOpen, setWriteOpen] = useState(false);
  const [selected, setSelected] = useState<LegacyLetter | null>(null);

  function invalidate() { qc.invalidateQueries({ queryKey: getGetLegacyLettersQueryKey() }); }

  async function handleSave(data: any) {
    try {
      await createLetter.mutateAsync({ data: { ...data, userId: 0 } as any });
      invalidate();
      setWriteOpen(false);
    } catch { Alert.alert("Couldn't save letter", "Please try again."); }
  }

  async function handleSeal(id: number) {
    try { await sealLetter.mutateAsync({ id }); invalidate(); }
    catch { Alert.alert("Couldn't seal letter", "Please try again."); }
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
            <Pressable onPress={() => setWriteOpen(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
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
          onSeal={() => { handleSeal(selected.id); setSelected(null); }}
          onDelete={() => confirmDelete(selected.id)}
        />
      ) : null}

      <WriteModal visible={writeOpen} onClose={() => setWriteOpen(false)} onSave={handleSave} isSaving={createLetter.isPending} />
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
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardTitle: { fontFamily: fonts.serif, fontSize: 16, flex: 1 },
  cardMeta: { fontFamily: fonts.sub, fontSize: 12, marginTop: 3 },
  preview: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, marginTop: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  statusText: { fontFamily: fonts.sub, fontSize: 10, textTransform: "capitalize" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20 },
  emptySub: { fontFamily: fonts.sub, fontSize: 14, textAlign: "center" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, paddingTop: 60 },
  modalTitle: { fontFamily: fonts.serif, fontSize: 18, flex: 1, textAlign: "center" },
  metaCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 6, marginBottom: 16 },
  metaRow: { fontFamily: fonts.sub, fontSize: 13 },
  contentCard: { borderRadius: 14, borderWidth: 1, padding: 20, marginBottom: 20 },
  letterContent: { fontFamily: fonts.body, fontSize: 15, lineHeight: 24 },
  sealBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, borderWidth: 1, paddingVertical: 14 },
  sealBtnText: { fontFamily: fonts.subSemibold, fontSize: 14 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontFamily: fonts.body, fontSize: 14, marginBottom: 12 },
  textArea: { minHeight: 200, textAlignVertical: "top" },
  fieldLabel: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  pillText: { fontFamily: fonts.sub, fontSize: 12 },
  saveBtn: { borderRadius: 999, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { fontFamily: fonts.subSemibold, fontSize: 15 },
});
