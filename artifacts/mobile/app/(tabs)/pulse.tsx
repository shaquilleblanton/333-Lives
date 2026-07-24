import React, { useState, useRef, useEffect } from "react";
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
  Image,
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
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPulseFeed,
  useCreatePulsePost,
  useDeletePulsePost,
  useReactToPulsePost,
  useRemovePulseReaction,
  getGetPulseFeedQueryKey,
  requestUploadUrl,
  type PulsePost,
} from "@workspace/api-client-react";
import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

function streamUrl(proxyPath: string) {
  return `https://${process.env.EXPO_PUBLIC_DOMAIN}/api${proxyPath}`;
}

const REACTIONS = [
  { type: "fire",     emoji: "🔥" },
  { type: "pray",     emoji: "🙏" },
  { type: "love",     emoji: "❤️" },
  { type: "strength", emoji: "💪" },
] as const;

type ReactionType = "fire" | "pray" | "love" | "strength";
type PostType = "text" | "photo" | "voice";

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function expiryLabel(expiresAt: string | null | undefined, isPersistent: boolean) {
  if (isPersistent) return null;
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / 3600000);
  if (hours < 1) return "< 1h left";
  return `${hours}h left`;
}

function formatClock(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function PulseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + WEB_TOP_INSET + 12;
  const botPad = insets.bottom + WEB_BOTTOM_INSET + 24;

  const queryClient = useQueryClient();
  const { data: posts = [], isLoading } = useGetPulseFeed();
  const deletePost = useDeletePulsePost();
  const reactMutation = useReactToPulsePost();
  const unreactMutation = useRemovePulseReaction();

  const [composerOpen, setComposerOpen] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetPulseFeedQueryKey() });

  const handleReact = (postId: number, type: ReactionType, myReaction: string | null | undefined) => {
    if (myReaction === type) {
      unreactMutation.mutate({ id: postId }, { onSuccess: invalidate, onError: () => Alert.alert("Error", "Couldn't remove your reaction. Please try again.") });
    } else {
      reactMutation.mutate({ id: postId, data: { type } }, { onSuccess: invalidate, onError: () => Alert.alert("Error", "Couldn't add your reaction. Please try again.") });
    }
  };

  const confirmDelete = (id: number) => {
    Alert.alert("Delete post", "Remove this post from the feed?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deletePost.mutate({ id }, { onSuccess: invalidate, onError: () => Alert.alert("Error", "Couldn't delete this post. Please try again.") }) },
    ]);
  };

  const renderPost = ({ item }: { item: PulsePost }) => (
    <PostCard
      post={item}
      colors={colors}
      onReact={(type) => handleReact(item.id, type, item.myReaction)}
      onDelete={() => confirmDelete(item.id)}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>What's Good</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Your circle's private pulse</Text>
        </View>
        <Pressable onPress={() => setComposerOpen(true)} style={[styles.composeBtn, { backgroundColor: colors.primary }]}>
          <Feather name="plus" size={18} color="#fff" />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (posts as PulsePost[]).length === 0 ? (
        <View style={styles.empty}>
          <Feather name="zap" size={40} color={colors.mutedForeground + "60"} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Be the first to share something good today.</Text>
          <Pressable onPress={() => setComposerOpen(true)} style={[styles.emptyBtn, { borderColor: colors.primary + "40" }]}>
            <Text style={[styles.emptyBtnText, { color: colors.primary }]}>Share something</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={posts as PulsePost[]}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPost}
          contentContainerStyle={{ padding: 16, paddingBottom: botPad }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ComposerModal
        visible={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSuccess={() => { setComposerOpen(false); invalidate(); }}
        colors={colors}
      />
    </View>
  );
}

function VoicePlayer({ objectPath, colors }: { objectPath: string; colors: ReturnType<typeof useColors> }) {
  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);
  const [loaded, setLoaded] = useState(false);

  const toggle = async () => {
    if (!loaded) {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      player.replace({ uri: streamUrl(objectPath) });
      player.play();
      setLoaded(true);
      return;
    }
    if (status.playing) { player.pause(); } else { player.play(); }
  };

  const pct = (status.duration ?? 0) > 0 ? (status.currentTime ?? 0) / (status.duration ?? 1) : 0;

  return (
    <Pressable onPress={toggle} style={[styles.voicePlayer, { backgroundColor: colors.muted, borderColor: colors.border }]}>
      <Feather name={status.playing ? "pause-circle" : "play-circle"} size={22} color={colors.primary} />
      <View style={[styles.voiceTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.voiceProgress, { backgroundColor: colors.primary, width: `${Math.round(pct * 100)}%` as any }]} />
      </View>
      <Text style={[styles.voiceDuration, { color: colors.mutedForeground }]}>
        {formatClock(((status.duration ?? 0) - (status.currentTime ?? 0)) * 1000)}
      </Text>
    </Pressable>
  );
}

function PostCard({ post, colors, onReact, onDelete }: {
  post: PulsePost;
  colors: ReturnType<typeof useColors>;
  onReact: (type: ReactionType) => void;
  onDelete: () => void;
}) {
  const [showReactors, setShowReactors] = useState(false);
  const totalReactions = Object.values(post.reactions ?? {}).reduce((s: number, v) => s + (v as number), 0);
  const expiry = expiryLabel(post.expiresAt, post.isPersistent);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: post.isOwn ? colors.primary + "30" : colors.border }]}>
      {/* Author row */}
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "30" }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{getInitials(post.authorName)}</Text>
        </View>
        <View style={styles.authorInfo}>
          <Text style={[styles.authorName, { color: colors.foreground }]}>{post.authorName}</Text>
          <Text style={[styles.authorTime, { color: colors.mutedForeground }]}>{timeAgo(post.createdAt)}</Text>
        </View>
        <View style={styles.cardActions}>
          {expiry && (
            <View style={[styles.expiryBadge, { borderColor: colors.border }]}>
              <Feather name="clock" size={10} color={colors.mutedForeground} />
              <Text style={[styles.expiryText, { color: colors.mutedForeground }]}>{expiry}</Text>
            </View>
          )}
          {post.isOwn && (
            <Pressable onPress={onDelete} style={styles.actionBtn}>
              <Feather name="trash-2" size={14} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Content */}
      {!!post.content && (
        <Text style={[styles.content, { color: colors.foreground + "E0" }]}>{post.content}</Text>
      )}

      {/* Photo */}
      {post.type === "photo" && post.mediaUrl && (
        <Image
          source={{ uri: streamUrl(post.mediaUrl) }}
          style={styles.postPhoto}
          resizeMode="cover"
        />
      )}

      {/* Voice note */}
      {post.type === "voice" && post.mediaUrl && (
        <VoicePlayer objectPath={post.mediaUrl} colors={colors} />
      )}

      {/* Reactions */}
      <View style={styles.reactionsRow}>
        {REACTIONS.map(({ type, emoji }) => {
          const count = (post.reactions as unknown as Record<string, number>)?.[type] ?? 0;
          const isActive = post.myReaction === type;
          return (
            <Pressable
              key={type}
              onPress={() => onReact(type)}
              style={[
                styles.reactionBtn,
                {
                  borderColor: isActive ? colors.primary + "50" : colors.border,
                  backgroundColor: isActive ? colors.primary + "15" : "transparent",
                },
              ]}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              {count > 0 && (
                <Text style={[styles.reactionCount, { color: isActive ? colors.primary : colors.mutedForeground }]}>
                  {count}
                </Text>
              )}
            </Pressable>
          );
        })}
        {post.isOwn && totalReactions > 0 && (
          <Pressable onPress={() => setShowReactors(!showReactors)} style={styles.reactorsBtn}>
            <Text style={[styles.reactorsText, { color: colors.mutedForeground }]}>
              {totalReactions} reaction{totalReactions !== 1 ? "s" : ""}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Reactor details */}
      {showReactors && post.isOwn && Array.isArray(post.reactorNames) && post.reactorNames.length > 0 && (
        <View style={[styles.reactorList, { borderTopColor: colors.border }]}>
          {post.reactorNames.map((r: { userId: number; type: string; name: string }, i: number) => {
            const meta = REACTIONS.find((rx) => rx.type === r.type);
            return (
              <Text key={i} style={[styles.reactorItem, { color: colors.mutedForeground }]}>
                {meta?.emoji} {r.name}
              </Text>
            );
          })}
        </View>
      )}
    </View>
  );
}

function ComposerModal({ visible, onClose, onSuccess, colors }: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const insets = useSafeAreaInsets();
  const createPost = useCreatePulsePost();

  const [text, setText] = useState("");
  const [isPersistent, setIsPersistent] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{ type: PostType; objectPath: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSavingAudio, setIsSavingAudio] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const durationRef = useRef(0);
  durationRef.current = recorderState.durationMillis ?? 0;

  useEffect(() => {
    if (!visible) {
      setText("");
      setPendingMedia(null);
      setIsPersistent(false);
      if (isRecording) {
        recorder.stop().catch(() => {});
        setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
        setIsRecording(false);
      }
    }
  }, [visible]);

  const handlePickPhoto = () => {
    Alert.alert("Add Photo", "Choose source", [
      {
        text: "Camera",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") { Alert.alert("Permission needed", "Allow camera access."); return; }
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
          if (result.canceled || !result.assets[0]) return;
          await uploadImage(result.assets[0]);
        },
      },
      {
        text: "Photo Library",
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") { Alert.alert("Permission needed", "Allow photo access."); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
          if (result.canceled || !result.assets[0]) return;
          await uploadImage(result.assets[0]);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
    const name = asset.fileName ?? `pulse-photo-${Date.now()}.jpg`;
    setIsUploading(true);
    try {
      const urlRes = await requestUploadUrl({ name, size: asset.fileSize ?? 0, contentType: asset.mimeType ?? "image/jpeg" });
      await FileSystem.uploadAsync(urlRes.uploadURL, asset.uri, { httpMethod: "PUT", headers: { "Content-Type": asset.mimeType ?? "image/jpeg" } });
      setPendingMedia({ type: "photo", objectPath: urlRes.objectPath });
    } catch {
      Alert.alert("Upload failed", "Couldn't upload the photo.");
    } finally {
      setIsUploading(false);
    }
  };

  const startRecord = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) { Alert.alert("Microphone needed", "Allow microphone access to record."); return; }
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
      const name = `pulse-voice-${Date.now()}.${ext}`;
      const upload = await requestUploadUrl({ name, size, contentType });
      const result = await FileSystem.uploadAsync(upload.uploadURL, uri, { httpMethod: "PUT", headers: { "Content-Type": contentType } });
      if (result.status < 200 || result.status >= 300) throw new Error("upload failed");
      setPendingMedia({ type: "voice", objectPath: upload.objectPath });
    } catch {
      Alert.alert("Couldn't save voice note", "Please try again.");
    } finally {
      setIsRecording(false);
      setIsSavingAudio(false);
    }
  };

  const canPost = !isUploading && !isRecording && !isSavingAudio &&
    (text.trim().length > 0 || pendingMedia !== null);

  const handleShare = () => {
    if (!canPost) return;
    const type: PostType = pendingMedia?.type ?? "text";
    createPost.mutate(
      { data: { type, content: text.trim() || undefined, mediaUrl: pendingMedia?.objectPath ?? undefined, isPersistent } },
      { onSuccess, onError: () => Alert.alert("Couldn't post", "Please try again.") },
    );
  };

  const busy = createPost.isPending || isUploading || isSavingAudio;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Modal header */}
        <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
          <Pressable onPress={onClose}>
            <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Share Something</Text>
          <Pressable
            onPress={handleShare}
            disabled={!canPost || busy}
            style={[styles.modalShare, { backgroundColor: colors.primary, opacity: (!canPost || busy) ? 0.5 : 1 }]}
          >
            {createPost.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalShareText}>Share</Text>}
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="What's good today? Share a moment with your circle…"
            placeholderTextColor={colors.mutedForeground + "80"}
            multiline
            style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            maxLength={280}
            editable={!busy && !isRecording}
          />
          {text.length > 200 && (
            <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{280 - text.length} left</Text>
          )}

          {pendingMedia && (
            <View style={[styles.mediaAttached, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name={pendingMedia.type === "photo" ? "image" : "mic"} size={16} color={colors.primary} />
              <Text style={[styles.mediaAttachedText, { color: colors.foreground }]}>
                {pendingMedia.type === "photo" ? "Photo attached" : "Voice note attached"}
              </Text>
              <Pressable onPress={() => setPendingMedia(null)}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          )}

          {!pendingMedia && (
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

          <Pressable onPress={() => setIsPersistent(!isPersistent)} style={styles.persistRow}>
            <View style={[styles.checkbox, { borderColor: colors.border, backgroundColor: isPersistent ? colors.primary : "transparent" }]}>
              {isPersistent && <Feather name="check" size={10} color="#fff" />}
            </View>
            <Text style={[styles.persistLabel, { color: colors.mutedForeground }]}>Keep forever (don't expire after 24h)</Text>
          </Pressable>
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
  composeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyTitle: { fontFamily: fonts.serifBold, fontSize: 20 },
  emptyText: { fontFamily: fonts.sub, fontSize: 14, textAlign: "center" },
  emptyBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  emptyBtnText: { fontFamily: fonts.sub, fontSize: 14 },
  card: { borderRadius: 20, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, paddingBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.serifBold, fontSize: 14 },
  authorInfo: { flex: 1 },
  authorName: { fontFamily: fonts.sub, fontSize: 14, fontWeight: "600" },
  authorTime: { fontFamily: fonts.sub, fontSize: 11, marginTop: 1 },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  expiryBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  expiryText: { fontFamily: fonts.sub, fontSize: 10 },
  actionBtn: { padding: 4 },
  content: { fontFamily: fonts.sub, fontSize: 14, lineHeight: 20, paddingHorizontal: 14, paddingBottom: 8 },
  voiceIndicator: { flexDirection: "row", alignItems: "center", gap: 8, margin: 14, marginTop: 4, padding: 10, borderRadius: 10, borderWidth: 1 },
  voiceLabel: { fontFamily: fonts.sub, fontSize: 13 },
  photoIndicator: { flexDirection: "row", alignItems: "center", gap: 8, margin: 14, marginTop: 4, padding: 10, borderRadius: 10, borderWidth: 1 },
  photoLabel: { fontFamily: fonts.sub, fontSize: 13 },
  reactionsRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, flexWrap: "wrap" },
  reactionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontFamily: fonts.sub, fontSize: 12 },
  reactorsBtn: { marginLeft: "auto" as any },
  reactorsText: { fontFamily: fonts.sub, fontSize: 11 },
  reactorList: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 8, gap: 4 },
  reactorItem: { fontFamily: fonts.sub, fontSize: 12 },
  postPhoto: { width: "100%", height: 200, backgroundColor: "#111" },
  voicePlayer: { flexDirection: "row", alignItems: "center", gap: 10, margin: 14, marginTop: 4, padding: 12, borderRadius: 12, borderWidth: 1 },
  voiceTrack: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  voiceProgress: { height: 4, borderRadius: 2 },
  voiceDuration: { fontFamily: fonts.sub, fontSize: 11, minWidth: 32, textAlign: "right" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  modalCancel: { fontFamily: fonts.sub, fontSize: 15 },
  modalTitle: { fontFamily: fonts.serifBold, fontSize: 17 },
  modalShare: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, minWidth: 60, alignItems: "center" },
  modalShareText: { fontFamily: fonts.sub, fontSize: 14, color: "#fff" },
  textInput: { borderWidth: 1, borderRadius: 14, padding: 14, fontFamily: fonts.sub, fontSize: 15, minHeight: 120, textAlignVertical: "top" },
  charCount: { fontFamily: fonts.sub, fontSize: 11, textAlign: "right", marginTop: 4 },
  mediaAttached: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 12 },
  mediaAttachedText: { fontFamily: fonts.sub, fontSize: 13, flex: 1 },
  mediaButtons: { marginTop: 12, gap: 8 },
  attachBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  attachBtnText: { fontFamily: fonts.sub, fontSize: 14 },
  persistRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  persistLabel: { fontFamily: fonts.sub, fontSize: 13 },
});
