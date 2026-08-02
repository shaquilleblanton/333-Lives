import { Feather } from "@expo/vector-icons";
import {
  getGetVoiceMemosQueryKey,
  requestUploadUrl,
  useCreateVoiceMemo,
  useDeleteVoiceMemo,
  useGetVoiceMemos,
  useUpdateVoiceMemo,
  type VoiceMemo,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import React, { useEffect, useRef, useState } from "react";
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

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatRecordedAt(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

function streamUrl(objectPath: string) {
  return `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/storage${objectPath}`;
}

export default function MemosScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: memos, isLoading, refetch, isRefetching } = useGetVoiceMemos();
  const createMemo = useCreateVoiceMemo();
  const updateMemo = useUpdateVoiceMemo();
  const deleteMemo = useDeleteVoiceMemo();

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const player = useAudioPlayer();
  const playerStatus = useAudioPlayerStatus(player);

  const [isSaving, setIsSaving] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [renameTarget, setRenameTarget] = useState<VoiceMemo | null>(null);
  const [renameText, setRenameText] = useState("");
  const durationRef = useRef(0);

  durationRef.current = recorderState.durationMillis ?? 0;

  useEffect(() => {
    if (playerStatus.didJustFinish) {
      setPlayingId(null);
    }
  }, [playerStatus.didJustFinish]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetVoiceMemosQueryKey() });

  const notifyError = (title: string, message: string) => {
    if (Platform.OS === "web") {
      // eslint-disable-next-line no-alert
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const startRecording = async () => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        notifyError("Microphone needed", "Allow microphone access to record memos.");
        return;
      }
      if (playingId !== null) {
        player.pause();
        setPlayingId(null);
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      notifyError("Recording failed", "Couldn't start recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    setIsSaving(true);
    try {
      const durationSeconds = Math.max(0, Math.round(durationRef.current / 1000));
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = recorder.uri;
      if (!uri) throw new Error("no recording uri");

      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) throw new Error("recording file missing");
      const size = "size" in info && typeof info.size === "number" ? info.size : 0;
      const ext = uri.split(".").pop()?.toLowerCase() || "m4a";
      const contentType = ext === "m4a" || ext === "mp4" ? "audio/mp4" : `audio/${ext}`;

      const upload = await requestUploadUrl({
        name: `memo-${Date.now()}.${ext}`,
        size,
        contentType,
      });

      const result = await FileSystem.uploadAsync(upload.uploadURL, uri, {
        httpMethod: "PUT",
        headers: { "Content-Type": contentType },
      });
      if (result.status < 200 || result.status >= 300) {
        throw new Error(`upload failed (${result.status})`);
      }

      await new Promise<void>((resolve, reject) => {
        createMemo.mutate(
          { data: { objectPath: upload.objectPath, durationSeconds } },
          {
            onSuccess: () => {
              invalidate();
              resolve();
            },
            onError: () => reject(new Error("save failed")),
          },
        );
      });
    } catch {
      notifyError("Couldn't save memo", "The recording wasn't saved. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const togglePlay = (memo: VoiceMemo) => {
    if (playingId === memo.id) {
      player.pause();
      setPlayingId(null);
      return;
    }
    player.replace({ uri: streamUrl(memo.objectPath) });
    player.play();
    setPlayingId(memo.id);
  };

  const confirmDelete = (memo: VoiceMemo) => {
    const doDelete = () =>
      deleteMemo.mutate(
        { id: memo.id },
        {
          onSuccess: () => {
            if (playingId === memo.id) {
              player.pause();
              setPlayingId(null);
            }
            invalidate();
          },
          onError: () => notifyError("Couldn't delete", "Please try again."),
        },
      );

    if (Platform.OS === "web") {
      // eslint-disable-next-line no-alert
      if (window.confirm(`Delete "${memo.title}"? This can't be undone.`)) doDelete();
    } else {
      Alert.alert("Delete memo", `Delete "${memo.title}"? This can't be undone.`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const submitRename = () => {
    const target = renameTarget;
    const title = renameText.trim();
    if (!target || !title) {
      setRenameTarget(null);
      return;
    }
    updateMemo.mutate(
      { id: target.id, data: { title } },
      {
        onSuccess: () => {
          invalidate();
          setRenameTarget(null);
        },
        onError: () => notifyError("Couldn't rename", "Please try again."),
      },
    );
  };

  const isRecording = recorderState.isRecording;
  const elapsedSeconds = Math.round((recorderState.durationMillis ?? 0) / 1000);
  const contentTopPad = insets.top + WEB_TOP_INSET + 12;
  const contentBottomPad = insets.bottom + WEB_BOTTOM_INSET + 40;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={memos ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{
          paddingTop: contentTopPad,
          paddingBottom: contentBottomPad,
          paddingHorizontal: 20,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Voice Memos</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              One tap. Completely private.
            </Text>

            <View
              style={[
                styles.recordCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Pressable
                onPress={isRecording ? stopRecording : startRecording}
                disabled={isSaving}
                style={({ pressed }) => [
                  styles.recordButton,
                  {
                    borderColor: isRecording ? colors.destructive : colors.primary,
                    backgroundColor: isRecording
                      ? `${colors.destructive}22`
                      : `${colors.primary}18`,
                    opacity: pressed || isSaving ? 0.7 : 1,
                  },
                ]}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Feather
                    name={isRecording ? "square" : "mic"}
                    size={30}
                    color={isRecording ? colors.destructive : colors.primary}
                  />
                )}
              </Pressable>
              <Text style={[styles.recordHint, { color: colors.mutedForeground }]}>
                {isSaving
                  ? "Saving your memo…"
                  : isRecording
                    ? `${formatClock(elapsedSeconds)} — tap to stop & save`
                    : "Tap to record"}
              </Text>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              YOUR RECORDINGS
            </Text>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centerFill}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Feather name="mic" size={22} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No memos yet. Your first recording will appear here.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.memoRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Pressable
              onPress={() => togglePlay(item)}
              style={[
                styles.playButton,
                { borderColor: colors.primary, backgroundColor: `${colors.primary}18` },
              ]}
            >
              <Feather
                name={playingId === item.id && playerStatus.playing ? "pause" : "play"}
                size={18}
                color={colors.primary}
              />
            </Pressable>
            <View style={styles.memoInfo}>
              <Text style={[styles.memoTitle, { color: colors.foreground }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.memoMeta, { color: colors.mutedForeground }]}>
                {formatRecordedAt(item.recordedAt)}
                {item.durationSeconds > 0 ? ` · ${formatClock(item.durationSeconds)}` : ""}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setRenameTarget(item);
                setRenameText(item.title);
              }}
              style={styles.iconButton}
              hitSlop={8}
            >
              <Feather name="edit-2" size={16} color={colors.mutedForeground} />
            </Pressable>
            <Pressable onPress={() => confirmDelete(item)} style={styles.iconButton} hitSlop={8}>
              <Feather name="trash-2" size={16} color={colors.destructive} />
            </Pressable>
          </View>
        )}
      />

      <Modal
        visible={renameTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameTarget(null)}
      >
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Rename memo</Text>
            <TextInput
              value={renameText}
              onChangeText={setRenameText}
              autoFocus
              maxLength={200}
              style={[
                styles.modalInput,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              placeholder="Memo title"
              placeholderTextColor={colors.mutedForeground}
              onSubmitEditing={submitRename}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setRenameTarget(null)} style={styles.modalButton}>
                <Text style={{ color: colors.mutedForeground, fontFamily: fonts.sub }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={submitRename}
                disabled={updateMemo.isPending || !renameText.trim()}
                style={[
                  styles.modalButton,
                  styles.modalPrimary,
                  {
                    backgroundColor: colors.primary,
                    opacity: updateMemo.isPending || !renameText.trim() ? 0.6 : 1,
                  },
                ]}
              >
                <Text style={{ color: colors.background, fontFamily: fonts.sub }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centerFill: { paddingVertical: 40, alignItems: "center" },
  header: { marginBottom: 8 },
  title: { fontFamily: fonts.serif, fontSize: 30 },
  subtitle: { fontFamily: fonts.body, fontSize: 14, marginTop: 4 },
  recordCard: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 28,
    alignItems: "center",
    marginTop: 20,
    gap: 14,
  },
  recordButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  recordHint: { fontFamily: fonts.sub, fontSize: 13, letterSpacing: 0.5 },
  sectionLabel: {
    fontFamily: fonts.sub,
    fontSize: 12,
    letterSpacing: 1.2,
    marginTop: 28,
    marginBottom: 12,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  emptyText: { fontFamily: fonts.body, fontSize: 14, textAlign: "center" },
  memoRow: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  memoInfo: { flex: 1, minWidth: 0 },
  memoTitle: { fontFamily: fonts.sub, fontSize: 15 },
  memoMeta: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  iconButton: { padding: 8 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: { borderWidth: 1, borderRadius: 20, padding: 20, gap: 14 },
  modalTitle: { fontFamily: fonts.serif, fontSize: 20 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  modalButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  modalPrimary: {},
});
