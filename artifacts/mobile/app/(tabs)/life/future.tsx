import { Feather } from "@expo/vector-icons";
import {
  useGetMessages,
  useCreateMessage,
  useUnlockMessage,
  getGetMessagesQueryKey,
} from "@workspace/api-client-react";
import type { Message, UnlockedMessage } from "@workspace/api-client-react";
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

function MessageCard({ msg }: { msg: Message }) {
  const colors = useColors();
  const [passcode, setPasscode] = useState("");
  const [revealed, setRevealed] = useState<UnlockedMessage | null>(null);
  const unlockMsg = useUnlockMessage();

  const unlockDate = new Date(msg.unlockDate);
  const dateReached = msg.dateReached;
  const requiresPasscode = msg.requiresPasscode && !revealed;
  const isOpen = msg.isUnlocked || !!revealed;
  const displayContent = revealed?.content ?? msg.content;

  async function handleUnlock() {
    try {
      const result = await unlockMsg.mutateAsync({ id: msg.id, data: { passcode } });
      setRevealed(result);
      setPasscode("");
    } catch {
      Alert.alert("Wrong passcode", "That passcode doesn't match. Please try again.");
    }
  }

  return (
    <View style={[styles.msgCard, { backgroundColor: colors.card, borderColor: isOpen ? colors.primary + "40" : colors.border }]}>
      <View style={styles.msgHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Feather
              name={isOpen ? "unlock" : requiresPasscode ? "key" : "lock"}
              size={14}
              color={isOpen ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.msgTitle, { color: isOpen ? colors.foreground : colors.mutedForeground }]}>{msg.title}</Text>
          </View>
          <Text style={[styles.msgMeta, { color: colors.mutedForeground }]}>
            Unlocks: {unlockDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </Text>
          {msg.recipientName ? <Text style={[styles.msgMeta, { color: colors.mutedForeground }]}>To: {msg.recipientName}</Text> : null}
        </View>
        <View style={[styles.typeBadge, { backgroundColor: colors.muted + "40" }]}>
          <Text style={[styles.typeText, { color: colors.mutedForeground }]}>{msg.type}</Text>
        </View>
      </View>

      {isOpen ? (
        <Text style={[styles.msgContent, { color: colors.foreground }]} numberOfLines={4}>
          {displayContent ?? "Audio/Video content"}
        </Text>
      ) : requiresPasscode && dateReached ? (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <TextInput
            value={passcode}
            onChangeText={setPasscode}
            placeholder="Enter passcode"
            placeholderTextColor={colors.mutedForeground + "99"}
            secureTextEntry
            style={[styles.input, { flex: 1, backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
          />
          <Pressable
            onPress={handleUnlock}
            disabled={!passcode || unlockMsg.isPending}
            style={[styles.revealBtn, { backgroundColor: colors.primary, opacity: !passcode ? 0.5 : 1 }]}
          >
            {unlockMsg.isPending ? <ActivityIndicator color="#000" size="small" /> : <Text style={[styles.revealBtnText, { color: colors.primaryForeground }]}>Reveal</Text>}
          </Pressable>
        </View>
      ) : (
        <View style={[styles.sealedBox, { backgroundColor: colors.muted + "20", borderColor: colors.border }]}>
          <Text style={[styles.sealedText, { color: colors.mutedForeground }]}>SEALED</Text>
        </View>
      )}
    </View>
  );
}

function ComposeModal({ visible, onClose, onSave, isSaving }: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
}) {
  const colors = useColors();
  const [title, setTitle] = useState("");
  const [recipient, setRecipient] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [content, setContent] = useState("");
  const [passcode, setPasscode] = useState("");

  function reset() { setTitle(""); setRecipient(""); setUnlockDate(""); setContent(""); setPasscode(""); }

  function submit() {
    if (!title.trim() || !unlockDate.trim()) return;
    const dateObj = new Date(unlockDate + "T12:00:00");
    if (isNaN(dateObj.getTime())) { Alert.alert("Invalid date", "Please enter a valid date (YYYY-MM-DD)."); return; }
    onSave({
      title: title.trim(),
      recipientName: recipient.trim() || undefined,
      type: "text",
      content: content.trim() || undefined,
      unlockDate: dateObj.toISOString(),
      passcode: passcode.trim() || undefined,
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
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Seal a Message</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={{ flex: 1, padding: 20, gap: 14 }}>
          <TextInput value={title} onChangeText={setTitle} placeholder="Title / Subject" placeholderTextColor={colors.mutedForeground + "99"} autoFocus
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput value={recipient} onChangeText={setRecipient} placeholder="Recipient (optional)" placeholderTextColor={colors.mutedForeground + "99"}
              style={[styles.input, { flex: 1, backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />
            <TextInput value={unlockDate} onChangeText={setUnlockDate} placeholder="Unlock date (YYYY-MM-DD)" placeholderTextColor={colors.mutedForeground + "99"}
              style={[styles.input, { flex: 1, backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />
          </View>
          <TextInput value={content} onChangeText={setContent} placeholder="Write your message…" placeholderTextColor={colors.mutedForeground + "99"} multiline numberOfLines={8} textAlignVertical="top"
            style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />
          <TextInput value={passcode} onChangeText={setPasscode} placeholder="Secret passcode (optional)" placeholderTextColor={colors.mutedForeground + "99"} secureTextEntry
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />
          <Pressable onPress={submit} disabled={!title.trim() || !unlockDate.trim() || isSaving}
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: !title.trim() || !unlockDate.trim() || isSaving ? 0.5 : 1 }]}>
            {isSaving ? <ActivityIndicator color="#000" size="small" /> : <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Seal & Lock</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function FutureScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data: messages, isLoading, refetch, isRefetching } = useGetMessages();
  const createMessage = useCreateMessage();
  const [composeOpen, setComposeOpen] = useState(false);

  function invalidate() { qc.invalidateQueries({ queryKey: getGetMessagesQueryKey() }); }

  async function handleSave(data: any) {
    try {
      await createMessage.mutateAsync({ data });
      invalidate();
      setComposeOpen(false);
    } catch { Alert.alert("Couldn't seal message", "Please try again."); }
  }

  const topPad = insets.top + WEB_TOP_INSET + 12;
  const botPad = insets.bottom + WEB_BOTTOM_INSET + 24;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={messages ?? []}
        keyExtractor={m => String(m.id)}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: botPad, paddingHorizontal: 20, gap: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
              <Feather name="arrow-left" size={22} color={colors.foreground} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pageTitle, { color: colors.foreground }]}>Future Messages</Text>
              <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>Words suspended in time.</Text>
            </View>
            <Pressable onPress={() => setComposeOpen(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
              <Feather name="plus" size={20} color={colors.primaryForeground} />
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          isLoading ? <View style={styles.empty}><ActivityIndicator color={colors.primary} /></View> : (
            <View style={styles.empty}>
              <Feather name="lock" size={40} color={colors.mutedForeground + "50"} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No messages sealed</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Plant a thought for tomorrow.</Text>
            </View>
          )
        }
        renderItem={({ item }) => <MessageCard msg={item} />}
      />
      <ComposeModal visible={composeOpen} onClose={() => setComposeOpen(false)} onSave={handleSave} isSaving={createMessage.isPending} />
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  backBtn: { padding: 4 },
  pageTitle: { fontFamily: fonts.serifBold, fontSize: 28 },
  pageSub: { fontFamily: fonts.sub, fontSize: 13, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  msgCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  msgHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  msgTitle: { fontFamily: fonts.serif, fontSize: 16 },
  msgMeta: { fontFamily: fonts.sub, fontSize: 12, marginTop: 2 },
  msgContent: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  typeText: { fontFamily: fonts.sub, fontSize: 11, textTransform: "capitalize" },
  sealedBox: { borderRadius: 10, borderWidth: 1, borderStyle: "dashed", paddingVertical: 12, alignItems: "center", marginTop: 4 },
  sealedText: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 2 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontFamily: fonts.body, fontSize: 14 },
  textArea: { minHeight: 160, textAlignVertical: "top" },
  revealBtn: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11, justifyContent: "center" },
  revealBtnText: { fontFamily: fonts.subSemibold, fontSize: 14 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20 },
  emptySub: { fontFamily: fonts.sub, fontSize: 14, textAlign: "center" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, paddingTop: 60 },
  modalTitle: { fontFamily: fonts.serif, fontSize: 20 },
  saveBtn: { borderRadius: 999, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { fontFamily: fonts.subSemibold, fontSize: 15 },
});
