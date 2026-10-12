import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  useListAnthropicConversations,
  useCreateAnthropicConversation,
  useGetAnthropicConversation,
  useDeleteAnthropicConversation,
  getListAnthropicConversationsQueryKey,
  getGetAnthropicConversationQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";
import { streamMessage } from "@/utils/aiStream";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

// ─── Conversation list ────────────────────────────────────────────────────────

function ConversationList({
  onSelect,
  onNew,
}: {
  onSelect: (id: number) => void;
  onNew: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: convos, isLoading, isError } = useListAnthropicConversations();
  const deleteConv = useDeleteAnthropicConversation();
  const qc = useQueryClient();

  const s = styles(colors);

  function handleDelete(id: number, title: string) {
    Alert.alert("Delete conversation?", `"${title}" will be gone forever.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteConv.mutate(
            { id },
            {
              onSuccess: () =>
                qc.invalidateQueries({
                  queryKey: getListAnthropicConversationsQueryKey(),
                }),
            }
          ),
      },
    ]);
  }

  return (
    <View style={{ flex: 1 }}>
      <View
        style={[
          s.header,
          { paddingTop: insets.top + WEB_TOP_INSET + 16 },
        ]}
      >
        <Text style={s.screenTitle}>AI Chat</Text>
        <Pressable
          onPress={onNew}
          style={({ pressed }) => [s.newBtn, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityLabel="New conversation"
        >
          <Feather name="plus" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <Text style={s.eyebrow}>Your conversations</Text>

      {isLoading ? (
        <ActivityIndicator
          color={colors.primary}
          style={{ marginTop: 40 }}
        />
      ) : isError ? (
        <View style={s.emptyState}>
          <Text style={s.emptyIcon}>⚠️</Text>
          <Text style={s.emptyTitle}>Couldn't load conversations</Text>
          <Text style={s.emptyBody}>Check your connection and try again.</Text>
        </View>
      ) : !convos?.length ? (
        <View style={s.emptyState}>
          <Text style={s.emptyIcon}>💬</Text>
          <Text style={s.emptyTitle}>Start a conversation</Text>
          <Text style={s.emptyBody}>
            Chat with your personal AI companion. Ask anything — habits, life
            goals, hard decisions, or just how you're feeling.
          </Text>
          <Pressable
            onPress={onNew}
            style={({ pressed }) => [
              s.startBtn,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={s.startBtnText}>New conversation</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={convos}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + WEB_BOTTOM_INSET + 20,
          }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelect(item.id)}
              onLongPress={() => handleDelete(item.id, item.title)}
              style={({ pressed }) => [
                s.convCard,
                { opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <View style={s.convIcon}>
                <Text style={{ fontSize: 18 }}>💬</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.convTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={s.convDate}>
                  {new Date(item.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={16}
                color={colors.mutedForeground}
              />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

// ─── Chat thread ──────────────────────────────────────────────────────────────

function ChatThread({
  conversationId,
  onBack,
  getToken,
}: {
  conversationId: number;
  onBack: () => void;
  getToken: () => Promise<string | null>;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const s = styles(colors);

  const { data: conv, isLoading } = useGetAnthropicConversation(conversationId);

  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  // Sync server messages to local state
  useEffect(() => {
    if (conv?.messages) {
      setLocalMessages(
        conv.messages.map((m) => ({
          id: String(m.id),
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
      );
    }
  }, [conv?.messages]);

  const allMessages: Message[] = streaming
    ? [...localMessages, { id: "streaming", role: "assistant", content: streamingText }]
    : localMessages;

  async function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Optimistic user message
    const userMsg: Message = {
      id: `local-${Date.now()}`,
      role: "user",
      content: text,
    };
    setLocalMessages((prev) => [...prev, userMsg]);
    setStreaming(true);
    setStreamingText("");

    try {
      let accumulated = "";
      for await (const chunk of streamMessage(conversationId, text, getToken)) {
        accumulated += chunk;
        setStreamingText(accumulated);
        scrollRef.current?.scrollToEnd({ animated: false });
      }

      // Refresh conversation from server
      await qc.invalidateQueries({
        queryKey: getGetAnthropicConversationQueryKey(conversationId),
      });
    } catch (err) {
      console.warn("AI chat send failed:", err);
      Alert.alert("Error", "Couldn't send message. Please try again.");
      setLocalMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setStreaming(false);
      setStreamingText("");
    }
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={insets.bottom}
    >
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + WEB_TOP_INSET + 16 }]}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }]}
          hitSlop={10}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[s.screenTitle, { flex: 1, marginLeft: 12 }]} numberOfLines={1}>
          {conv?.title ?? "Chat"}
        </Text>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 8,
          gap: 12,
        }}
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: false })
        }
      >
        {allMessages.length === 0 && (
          <View style={s.threadEmpty}>
            <Text style={s.threadEmptyText}>
              Say hello — your AI companion is here to help.
            </Text>
          </View>
        )}
        {allMessages.map((msg) => (
          <View
            key={msg.id}
            style={[
              s.bubble,
              msg.role === "user" ? s.bubbleUser : s.bubbleAssistant,
            ]}
          >
            <Text
              style={[
                s.bubbleText,
                msg.role === "user" ? { color: "#fff" } : { color: colors.foreground },
              ]}
            >
              {msg.content}
            </Text>
          </View>
        ))}
        {streaming && streamingText === "" && (
          <View style={s.bubbleAssistant}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View
        style={[
          s.inputRow,
          { paddingBottom: insets.bottom + WEB_BOTTOM_INSET + 12 },
        ]}
      >
        <TextInput
          style={[s.chatInput, { color: colors.foreground }]}
          placeholder="Message your AI companion…"
          placeholderTextColor={colors.mutedForeground}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
        />
        <Pressable
          onPress={handleSend}
          disabled={!input.trim() || streaming}
          style={({ pressed }) => [
            s.sendBtn,
            { opacity: !input.trim() || streaming ? 0.4 : pressed ? 0.7 : 1 },
          ]}
          accessibilityLabel="Send"
        >
          {streaming ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="send" size={18} color="#fff" />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── New conversation modal ───────────────────────────────────────────────────

function NewConvSheet({
  onCreated,
  onCancel,
}: {
  onCreated: (id: number) => void;
  onCancel: () => void;
}) {
  const colors = useColors();
  const s = styles(colors);
  const qc = useQueryClient();
  const createConv = useCreateAnthropicConversation();
  const [title, setTitle] = useState("");

  async function handleCreate() {
    const t = title.trim() || "New chat";
    const result = await createConv.mutateAsync({ data: { title: t } });
    await qc.invalidateQueries({
      queryKey: getListAnthropicConversationsQueryKey(),
    });
    onCreated(result.id);
  }

  return (
    <View style={s.sheet}>
      <Text style={s.sheetTitle}>New conversation</Text>
      <Text style={s.sheetLabel}>Give it a name (optional)</Text>
      <TextInput
        style={[s.sheetInput, { color: colors.foreground }]}
        placeholder="e.g. My morning routine"
        placeholderTextColor={colors.mutedForeground}
        value={title}
        onChangeText={setTitle}
        autoFocus
        maxLength={80}
        returnKeyType="done"
        onSubmitEditing={handleCreate}
      />
      <View style={s.sheetBtns}>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [
            s.sheetBtn,
            { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[s.sheetBtnText, { color: colors.mutedForeground }]}>
            Cancel
          </Text>
        </Pressable>
        <Pressable
          onPress={handleCreate}
          disabled={createConv.isPending}
          style={({ pressed }) => [
            s.sheetBtn,
            {
              backgroundColor: colors.primary,
              borderColor: colors.primary,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          {createConv.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[s.sheetBtnText, { color: "#fff" }]}>Start</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ─── Root screen ──────────────────────────────────────────────────────────────

export default function AiChatScreen() {
  const colors = useColors();
  const { getToken } = useAuth();
  const [activeConv, setActiveConv] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);

  if (showNew) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <NewConvSheet
          onCreated={(id) => {
            setShowNew(false);
            setActiveConv(id);
          }}
          onCancel={() => setShowNew(false)}
        />
      </View>
    );
  }

  if (activeConv !== null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ChatThread
          conversationId={activeConv}
          onBack={() => setActiveConv(null)}
          getToken={getToken}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ConversationList
        onSelect={(id) => setActiveConv(id)}
        onNew={() => setShowNew(true)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function styles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    screenTitle: {
      fontFamily: fonts.serif,
      fontSize: 26,
      color: colors.foreground,
    },
    newBtn: { padding: 4, marginLeft: "auto" },
    eyebrow: {
      fontFamily: fonts.subSemibold,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: colors.mutedForeground,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 4,
    },
    convCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
      gap: 12,
    },
    convIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.primary + "20",
      alignItems: "center",
      justifyContent: "center",
    },
    convTitle: {
      fontFamily: fonts.sub,
      fontSize: 15,
      color: colors.foreground,
    },
    convDate: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
    },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyTitle: {
      fontFamily: fonts.serif,
      fontSize: 22,
      color: colors.foreground,
      marginBottom: 8,
      textAlign: "center",
    },
    emptyBody: {
      fontFamily: fonts.body,
      fontSize: 15,
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 24,
    },
    startBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    startBtnText: {
      fontFamily: fonts.sub,
      fontSize: 15,
      color: "#fff",
    },
    // Thread
    threadEmpty: {
      alignItems: "center",
      paddingVertical: 40,
    },
    threadEmptyText: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: "center",
    },
    bubble: {
      maxWidth: "80%",
      borderRadius: 16,
      padding: 12,
    },
    bubbleUser: {
      backgroundColor: colors.primary,
      alignSelf: "flex-end",
      borderBottomRightRadius: 4,
    },
    bubbleAssistant: {
      backgroundColor: colors.card,
      alignSelf: "flex-start",
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bubbleText: {
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: 16,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 10,
    },
    chatInput: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontFamily: fonts.body,
      fontSize: 15,
      maxHeight: 120,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    // New conv sheet
    sheet: {
      flex: 1,
      justifyContent: "center",
      padding: 32,
    },
    sheetTitle: {
      fontFamily: fonts.serif,
      fontSize: 26,
      color: colors.foreground,
      marginBottom: 24,
    },
    sheetLabel: {
      fontFamily: fonts.subSemibold,
      fontSize: 12,
      color: colors.mutedForeground,
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    sheetInput: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontFamily: fonts.body,
      fontSize: 16,
      marginBottom: 20,
    },
    sheetBtns: { flexDirection: "row", gap: 12 },
    sheetBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
    },
    sheetBtnText: { fontFamily: fonts.sub, fontSize: 15 },
  });
}
