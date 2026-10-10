import { Feather } from "@expo/vector-icons";
import {
  useGetLegacyLetters,
  useCreateLegacyLetter,
  useUpdateLegacyLetter,
  useDeleteLegacyLetter,
  useSealLegacyLetter,
  useUnsealLegacyLetter,
  getGetLegacyLettersQueryKey,
  requestUploadUrl,
  cleanupLegacyLetterUpload,
} from "@workspace/api-client-react";
import type { LegacyLetter } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as Sharing from "expo-sharing";
import { useAuth } from "@clerk/expo";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
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
import { ErrorRetryView } from "@/components/ErrorRetryView";
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
            <Feather name="trash-2" size={18} color={colors.destructive} />
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

          <LetterMedia letter={letter} />

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

type MediaType = "text" | "voice" | "video";
type PendingMedia = { uri: string; name: string; mimeType: string; size?: number };
type UploadedPendingMedia = { uri: string; mediaType: MediaType; objectPath: string; saveAmbiguous: boolean };

function storageUrl(objectPath: string) {
  return `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/storage${objectPath}`;
}

function notifyError(title: string, message: string) {
  if (Platform.OS === "web") window.alert(`${title}\n${message}`);
  else Alert.alert(title, message);
}

function isDefinitiveSaveRejection(error: unknown) {
  const status = error && typeof error === "object" && "status" in error
    ? (error as { status?: unknown }).status
    : undefined;
  return typeof status === "number" && status >= 400 && status < 500;
}

function isAssociationConflict(error: unknown) {
  return !!error && typeof error === "object" && "status" in error &&
    (error as { status?: unknown }).status === 409;
}

function mediaMimeType(type: MediaType, uri: string, provided?: string | null) {
  if (provided) return provided;
  const ext = uri.split("?")[0].split(".").pop()?.toLowerCase();
  if (type === "video") {
    if (ext === "mov") return "video/quicktime";
    if (ext === "webm") return "video/webm";
    if (ext === "mkv") return "video/x-matroska";
    if (ext === "avi") return "video/x-msvideo";
    if (ext === "3gp") return "video/3gpp";
    return "video/mp4";
  }
  if (ext === "wav") return "audio/wav";
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "aac") return "audio/aac";
  if (ext === "ogg" || ext === "oga" || ext === "opus") return "audio/ogg";
  if (ext === "flac") return "audio/flac";
  if (ext === "amr") return "audio/amr";
  if (ext === "wma") return "audio/x-ms-wma";
  return "audio/mp4";
}

function LetterMedia({ letter }: { letter: LegacyLetter }) {
  const colors = useColors();
  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);
  const { getToken } = useAuth();
  const [isOpening, setIsOpening] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (status.didJustFinish) setPlaying(false);
  }, [status.didJustFinish]);

  async function toggleAudio() {
    try {
      if (playing) {
        player.pause();
        setPlaying(false);
        return;
      }
      const token = await getToken();
      if (!token) throw new Error("Sign in to listen to this recording.");
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      player.replace({ uri: storageUrl(letter.mediaUrl!), headers: { Authorization: `Bearer ${token}` } });
      player.play();
      setPlaying(true);
    } catch {
      notifyError("Couldn't play recording", "Please check your connection and try again.");
    }
  }

  async function openVideo() {
    if (!letter.mediaUrl || isOpening) return;
    setIsOpening(true);
    let localUri: string | null = null;
    try {
      const token = await getToken();
      if (!token) throw new Error("Sign in to open this attachment.");
      if (!FileSystem.cacheDirectory) throw new Error("Device cache is unavailable.");
      const ext = letter.mediaUrl.toLowerCase().includes(".mov") ? ".mov" : ".mp4";
      localUri = `${FileSystem.cacheDirectory}legacy-letter-${letter.id}-${Date.now()}${ext}`;
      const result = await FileSystem.downloadAsync(storageUrl(letter.mediaUrl), localUri, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (result.status < 200 || result.status >= 300) throw new Error(`Download failed (${result.status}).`);
      if (!(await Sharing.isAvailableAsync())) throw new Error("File sharing is not available on this device.");
      await Sharing.shareAsync(result.uri, { mimeType: result.mimeType ?? "video/mp4", dialogTitle: letter.title });
    } catch {
      notifyError("Couldn't open video", "Please check your connection and try again.");
    } finally {
      if (localUri) FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
      setIsOpening(false);
    }
  }

  if (!letter.mediaUrl || letter.mediaType === "text") return null;
  return (
    <View style={[styles.mediaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {letter.mediaType === "voice" ? (
        <Pressable accessibilityLabel={playing ? "Pause voice letter" : "Play voice letter"} onPress={toggleAudio} style={styles.mediaAction}>
          <Feather name={playing ? "pause" : "play"} size={17} color={colors.primary} />
          <Text style={[styles.actionBtnText, { color: colors.primary }]}>{playing ? "Pause Voice Letter" : "Play Voice Letter"}</Text>
        </Pressable>
      ) : (
        <Pressable accessibilityLabel="Open video letter" onPress={openVideo} disabled={isOpening} style={styles.mediaAction}>
          {isOpening ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="video" size={17} color={colors.primary} />}
          <Text style={[styles.actionBtnText, { color: colors.primary }]}>{isOpening ? "Opening…" : "Open Video Letter"}</Text>
        </Pressable>
      )}
    </View>
  );
}

function WriteModal({ visible, letter, onClose, onSave, isSaving }: {
  visible: boolean;
  letter: LegacyLetter | null;
  onClose: () => void;
  onSave: (data: any) => Promise<boolean>;
  isSaving: boolean;
}) {
  const colors = useColors();
  const isEditing = !!letter;
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPickingAttachment, setIsPickingAttachment] = useState(false);
  const [isRecordingActionBusy, setIsRecordingActionBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [microphonePermission, setMicrophonePermission] = useState<{ granted: boolean; canAskAgain?: boolean } | null>(null);
  const uploadedPendingMedia = useRef<UploadedPendingMedia[]>([]);
  const recordingDuration = useRef(0);
  recordingDuration.current = recorderState.durationMillis ?? 0;

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
      setPendingMedia(null);
      setUploadProgress(0);
    }
  }, [visible, letter]);

  function forgetUploadedPendingMedia(uri: string, type: MediaType) {
    uploadedPendingMedia.current = uploadedPendingMedia.current.filter(
      item => item.uri !== uri || item.mediaType !== type,
    );
  }

  function forgetUploadedObjectPath(objectPath: string) {
    uploadedPendingMedia.current = uploadedPendingMedia.current.filter(
      item => item.objectPath !== objectPath,
    );
  }

  async function cleanupUploadedPendingMedia(uri: string, type: MediaType, retainIfAssociated = false) {
    const uploaded = uploadedPendingMedia.current.find(
      item => item.uri === uri && item.mediaType === type,
    );
    if (!uploaded) return;
    if (uploaded.saveAmbiguous) {
      throw new Error("The save outcome is unknown, so this upload cannot be safely removed yet.");
    }
    try {
      const result = await cleanupLegacyLetterUpload({ objectPath: uploaded.objectPath });
      if (!result.success) throw new Error("The server did not confirm attachment cleanup.");
    } catch (error) {
      if (isAssociationConflict(error)) {
        // The object remains valid for a save retry, but is not cleanup-eligible.
        if (!retainIfAssociated) forgetUploadedPendingMedia(uri, type);
        return;
      }
      throw error;
    }
    forgetUploadedPendingMedia(uri, type);
  }

  async function cleanupAllUploadedPendingMedia() {
    let ambiguousCount = 0;
    for (const uploaded of [...uploadedPendingMedia.current]) {
      if (uploaded.saveAmbiguous) {
        ambiguousCount++;
        continue;
      }
      await cleanupUploadedPendingMedia(uploaded.uri, uploaded.mediaType);
    }
    return ambiguousCount;
  }

  async function cleanupPendingMedia() {
    let recordingUri = recorder.uri;
    if (recorder.isRecording) {
      await recorder.stop().catch(() => {});
      recordingUri = recorder.uri;
    }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    if (pendingMedia?.uri) await FileSystem.deleteAsync(pendingMedia.uri, { idempotent: true }).catch(() => {});
    if (recordingUri && recordingUri !== pendingMedia?.uri) {
      await FileSystem.deleteAsync(recordingUri, { idempotent: true }).catch(() => {});
    }
  }

  async function closeAndCleanup() {
    if (isUploading || isSaving || isPickingAttachment || isRecordingActionBusy) return;
    try {
      const retainedCount = await cleanupAllUploadedPendingMedia();
      if (retainedCount > 0) {
        notifyError(
          "Upload retained to protect your letter",
          "A previous save may have reached the server, so its uploaded media was kept rather than risk deleting an attachment that may already be saved.",
        );
      }
    } catch {
      notifyError("Couldn't remove uploaded attachment", "The unsaved upload could not be safely removed. Your letter and attachment are still available; retry the save or try closing again.");
      return;
    }
    await cleanupPendingMedia();
    onClose();
  }

  function reset() {
    setTitle("");
    setRecipientName("");
    setRecipientRelation("");
    setTriggerType("date");
    setMediaType("text");
    setContent("");
    setPendingMedia(null);
    setUploadProgress(0);
  }

  async function pickAttachment() {
    if (mediaType === "text" || isPickingAttachment) return;
    setIsPickingAttachment(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: mediaType === "voice" ? "audio/*" : "video/*",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (pendingMedia?.uri && pendingMedia.uri !== asset.uri) {
        const previousUpload = uploadedPendingMedia.current.find(
          item => item.uri === pendingMedia.uri && item.mediaType === mediaType,
        );
        if (previousUpload?.saveAmbiguous) {
          await FileSystem.deleteAsync(asset.uri, { idempotent: true }).catch(() => {});
          notifyError("Couldn't replace attachment", "A previous save may have reached the server. Retry saving with the current attachment or close the editor; the upload will not be deleted while its association is uncertain.");
          return;
        }
        try {
          await cleanupUploadedPendingMedia(pendingMedia.uri, mediaType);
        } catch {
          await FileSystem.deleteAsync(asset.uri, { idempotent: true }).catch(() => {});
          notifyError("Couldn't replace attachment", "The previous uploaded attachment could not be safely removed. Keep it selected and retry the save or try replacing it again.");
          return;
        }
        await FileSystem.deleteAsync(pendingMedia.uri, { idempotent: true }).catch(() => {});
      }
      setPendingMedia({
        uri: asset.uri,
        name: asset.name,
        mimeType: mediaMimeType(mediaType, asset.uri, asset.mimeType),
        size: asset.size,
      });
    } catch {
      notifyError("Couldn't open files", "Please try choosing the attachment again.");
    } finally {
      setIsPickingAttachment(false);
    }
  }

  async function startRecording() {
    setIsRecordingActionBusy(true);
    try {
      if (Platform.OS === "web") throw new Error("Audio recording is only available on a mobile device.");
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      setMicrophonePermission(permission);
      if (!permission.granted) {
        notifyError("Microphone needed", "Allow microphone access to record your voice letter.");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (error) {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      notifyError("Recording failed", error instanceof Error ? error.message : "Couldn't start recording.");
    } finally {
      setIsRecordingActionBusy(false);
    }
  }

  async function stopRecording() {
    setIsRecordingActionBusy(true);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = recorder.uri;
      if (!uri) throw new Error("The recording file wasn't created.");
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) throw new Error("The recording file is missing.");
      const ext = uri.split("?")[0].split(".").pop()?.toLowerCase() || "m4a";
      if (pendingMedia?.uri && pendingMedia.uri !== uri) {
        const previousUpload = uploadedPendingMedia.current.find(
          item => item.uri === pendingMedia.uri && item.mediaType === mediaType,
        );
        if (previousUpload?.saveAmbiguous) {
          throw new Error("A previous save may have reached the server; retry or close before replacing this recording.");
        }
        await cleanupUploadedPendingMedia(pendingMedia.uri, mediaType);
        await FileSystem.deleteAsync(pendingMedia.uri, { idempotent: true }).catch(() => {});
      }
      setPendingMedia({
        uri,
        name: `legacy-voice-${Date.now()}.${ext}`,
        mimeType: mediaMimeType("voice", uri),
        size: "size" in info && typeof info.size === "number" ? info.size : undefined,
      });
    } catch (error) {
      if (recorder.uri && recorder.uri !== pendingMedia?.uri) {
        await FileSystem.deleteAsync(recorder.uri, { idempotent: true }).catch(() => {});
      }
      notifyError("Couldn't finish recording", error instanceof Error ? error.message : "Please try again.");
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    } finally {
      setIsRecordingActionBusy(false);
    }
  }

  async function removeAttachment() {
    if (pendingMedia?.uri) {
      try {
        await cleanupUploadedPendingMedia(pendingMedia.uri, mediaType);
      } catch {
        notifyError("Couldn't remove attachment", "The uploaded attachment could not be safely removed. Your selected media is still available; retry the save or try removing it again.");
        return false;
      }
      await FileSystem.deleteAsync(pendingMedia.uri, { idempotent: true }).catch(() => {});
    }
    setPendingMedia(null);
    return true;
  }

  async function changeMediaType(next: MediaType) {
    if (next !== mediaType && !(await removeAttachment())) return;
    setMediaType(next);
  }

  async function submit() {
    if (!title.trim() || !recipientName.trim() || isPickingAttachment || isRecordingActionBusy || recorder.isRecording) return;
    const existingMediaUrl = letter?.mediaType === mediaType ? letter.mediaUrl : null;
    if (mediaType === "text" && !content.trim()) return;
    if (mediaType !== "text" && !pendingMedia && !existingMediaUrl) {
      notifyError("Attachment required", mediaType === "voice" ? "Record or attach an audio file before saving." : "Attach a video before saving.");
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    let uploadedObjectPath: string | null = null;
    try {
      let mediaUrl = existingMediaUrl ?? undefined;
      let mediaDurationSec: number | undefined;
      if (pendingMedia) {
        const reusableUpload = uploadedPendingMedia.current.find(
          item => item.uri === pendingMedia.uri && item.mediaType === mediaType,
        );
        if (reusableUpload) {
          mediaUrl = reusableUpload.objectPath;
        } else {
          const info = await FileSystem.getInfoAsync(pendingMedia.uri);
          if (!info.exists) throw new Error("The selected attachment is no longer available.");
          let size = pendingMedia.size ?? 0;
          if (!size) {
            if ("size" in info && typeof info.size === "number") size = info.size;
          }
          const upload = await requestUploadUrl({
            name: pendingMedia.name,
            size,
            contentType: pendingMedia.mimeType,
            purpose: "legacy-letter",
          });
          const task = FileSystem.createUploadTask(
            upload.uploadURL,
            pendingMedia.uri,
            { httpMethod: "PUT", headers: { "Content-Type": pendingMedia.mimeType } },
            progress => {
              const total = progress.totalBytesExpectedToSend;
              if (total > 0) setUploadProgress(Math.min(100, Math.round((progress.totalBytesSent / total) * 100)));
            },
          );
          const result = await task.uploadAsync();
          if (!result || result.status < 200 || result.status >= 300) {
            throw new Error(`Upload failed${result ? ` (${result.status})` : ""}.`);
          }
          mediaUrl = upload.objectPath;
          uploadedPendingMedia.current.push({
            uri: pendingMedia.uri,
            mediaType,
            objectPath: upload.objectPath,
            saveAmbiguous: false,
          });
        }
        uploadedObjectPath = mediaUrl ?? null;
        if (mediaType === "voice" && recorderState.durationMillis > 0) {
          mediaDurationSec = Math.max(1, Math.round(recordingDuration.current / 1000));
        }
      }
      const saved = await onSave({
        title: title.trim(),
        recipientName: recipientName.trim(),
        recipientRelation: recipientRelation.trim() || undefined,
        triggerType,
        mediaType,
        content: content.trim() || "",
        mediaUrl: mediaType === "text" ? null : mediaUrl,
        mediaDurationSec: mediaType === "text" ? null : mediaDurationSec,
        status: "draft",
        isSealed: false,
      });
      if (saved) {
        if (pendingMedia?.uri) await FileSystem.deleteAsync(pendingMedia.uri, { idempotent: true }).catch(() => {});
        if (uploadedObjectPath) forgetUploadedObjectPath(uploadedObjectPath);
        if (uploadedPendingMedia.current.some(item => item.saveAmbiguous)) {
          notifyError("Previous upload retained", "A prior save had an unknown outcome. Its upload was kept because it may already be attached to saved media.");
        }
        reset();
      }
    } catch (error) {
      let message = error instanceof Error ? error.message : "Please try again.";
      const uploaded = uploadedObjectPath
        ? uploadedPendingMedia.current.find(item => item.objectPath === uploadedObjectPath)
        : undefined;
      if (uploaded) uploaded.saveAmbiguous = !isDefinitiveSaveRejection(error);
      if (
        uploadedObjectPath &&
        uploadedObjectPath !== existingMediaUrl &&
        isDefinitiveSaveRejection(error)
      ) {
        try {
          const uploaded = uploadedPendingMedia.current.find(
            item => item.objectPath === uploadedObjectPath,
          );
          if (uploaded) await cleanupUploadedPendingMedia(uploaded.uri, uploaded.mediaType, true);
        } catch {
          message += " The uploaded attachment could not be removed; it has been retained to avoid deleting media that may already be associated with a saved letter.";
        }
      }
      notifyError("Couldn't save letter", message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={closeAndCleanup}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable accessibilityLabel="Close letter editor" onPress={closeAndCleanup} disabled={isUploading || isSaving || isPickingAttachment || isRecordingActionBusy} hitSlop={8}>
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
            {(["text", "voice", "video"] as MediaType[]).map(m => (
              <Pressable key={m} onPress={() => changeMediaType(m)} disabled={isUploading || isSaving || isPickingAttachment || isRecordingActionBusy}
                style={[styles.pill, { borderColor: mediaType === m ? colors.primary : colors.border, backgroundColor: mediaType === m ? colors.primary + "1A" : "transparent" }]}>
                <Feather name={m === "text" ? "file-text" : m === "voice" ? "mic" : "video"} size={12} color={mediaType === m ? colors.primary : colors.mutedForeground} style={{ marginRight: 4 }} />
                <Text style={[styles.pillText, { color: mediaType === m ? colors.primary : colors.mutedForeground }]}>{m === "text" ? "Written" : m === "voice" ? "Voice Recording" : "Video"}</Text>
              </Pressable>
            ))}
          </View>

          {mediaType === "text" ? (
            <TextInput value={content} onChangeText={setContent} placeholder="Write your letter…" placeholderTextColor={colors.mutedForeground + "99"} multiline numberOfLines={14} textAlignVertical="top"
              style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} />
          ) : (
            <View style={[styles.voiceNote, { backgroundColor: colors.card, borderColor: colors.primary + "40" }]}>
              <Feather name={mediaType === "voice" ? "mic" : "video"} size={28} color={colors.primary} style={{ marginBottom: 8 }} />
              <Text style={[styles.voiceNoteTitle, { color: colors.foreground }]}>{mediaType === "voice" ? "Voice Letter" : "Video Letter"}</Text>
              <Text style={[styles.voiceNoteSub, { color: colors.mutedForeground }]}>
                {mediaType === "voice" ? "Record now or attach an audio file." : "Attach a video file from your device."}
              </Text>
              {mediaType === "voice" ? (
              <Pressable
                  accessibilityLabel={recorderState.isRecording ? "Stop voice letter recording" : "Start voice letter recording"}
                  onPress={recorderState.isRecording ? stopRecording : startRecording}
                disabled={isUploading || isSaving || isRecordingActionBusy || isPickingAttachment}
                style={[styles.mediaAction, { borderColor: colors.border, marginTop: 12, opacity: isUploading || isSaving || isRecordingActionBusy || isPickingAttachment ? 0.6 : 1 }]}
                >
                  <Feather name={recorderState.isRecording ? "square" : "mic"} size={16} color={recorderState.isRecording ? "#f87171" : colors.primary} />
                  <Text style={[styles.actionBtnText, { color: recorderState.isRecording ? "#f87171" : colors.primary }]}>
                    {recorderState.isRecording ? `Stop Recording · ${Math.floor(recordingDuration.current / 1000)}s` : "Record Voice Letter"}
                  </Text>
                </Pressable>
              ) : null}
              {Platform.OS !== "web" && microphonePermission?.granted === false && microphonePermission.canAskAgain === false ? (
                <Pressable onPress={() => Linking.openSettings().catch(() => notifyError("Settings unavailable", "Open your device settings to enable microphone access."))} style={[styles.mediaAction, { marginTop: 8 }]}>
                  <Feather name="settings" size={15} color={colors.primary} />
                  <Text style={[styles.actionBtnText, { color: colors.primary }]}>Open Settings</Text>
                </Pressable>
              ) : null}
              <Pressable accessibilityLabel={mediaType === "voice" ? "Attach audio file" : "Attach video file"} onPress={pickAttachment} disabled={isPickingAttachment || isUploading || isSaving || isRecordingActionBusy} style={[styles.mediaAction, { borderColor: colors.border, marginTop: 8, opacity: isPickingAttachment ? 0.6 : 1 }]}>
                {isPickingAttachment ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="paperclip" size={15} color={colors.primary} />}
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>{isPickingAttachment ? "Opening files…" : mediaType === "voice" ? "Choose Audio File" : "Choose Video File"}</Text>
              </Pressable>
              {pendingMedia ? (
                <View style={[styles.mediaAction, { marginTop: 8 }]}>
                  <Text style={[styles.voiceNoteSub, { color: colors.foreground, flex: 1 }]} numberOfLines={1}>{pendingMedia.name}</Text>
                    <Pressable accessibilityLabel="Remove media attachment" onPress={removeAttachment} disabled={isUploading || isSaving || isPickingAttachment || isRecordingActionBusy} hitSlop={8}>
                    <Feather name="x" size={16} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              ) : letter?.mediaType === mediaType && letter.mediaUrl ? (
                <Text style={[styles.voiceNoteSub, { color: colors.primary, marginTop: 10 }]}>An attachment is already saved. Choose a file to replace it.</Text>
              ) : null}
              <TextInput value={content} onChangeText={setContent} placeholder={mediaType === "voice" ? "Describe or transcribe this voice letter…" : "Add a note about this video…"} placeholderTextColor={colors.mutedForeground + "99"} multiline numberOfLines={4} textAlignVertical="top"
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 12 }]} />
              {isUploading ? (
                <View style={[styles.row, { marginTop: 12, gap: 8 }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.voiceNoteSub, { color: colors.primary }]}>Uploading… {uploadProgress}%</Text>
                </View>
              ) : null}
            </View>
          )}
          <Pressable onPress={submit} disabled={!title.trim() || !recipientName.trim() || (mediaType === "text" && !content.trim()) || isSaving || isUploading || isPickingAttachment || isRecordingActionBusy || recorderState.isRecording || recorder.isRecording}
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: !title.trim() || !recipientName.trim() || (mediaType === "text" && !content.trim()) || isSaving || isUploading || isPickingAttachment || isRecordingActionBusy || recorderState.isRecording || recorder.isRecording ? 0.5 : 1 }]}>
            {isSaving || isUploading ? <ActivityIndicator color={colors.primaryForeground} size="small" /> : <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>{isEditing ? "Save Changes" : "Save as Draft"}</Text>}
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
  const { data: letters, isLoading, isError, refetch, isRefetching } = useGetLegacyLetters();
  const createLetter = useCreateLegacyLetter();
  const updateLetter = useUpdateLegacyLetter();
  const deleteLetter = useDeleteLegacyLetter();
  const sealLetter = useSealLegacyLetter();
  const unsealLetter = useUnsealLegacyLetter();

  const [writeOpen, setWriteOpen] = useState(false);
  const [editingLetter, setEditingLetter] = useState<LegacyLetter | null>(null);
  const [selected, setSelected] = useState<LegacyLetter | null>(null);

  function invalidate() { qc.invalidateQueries({ queryKey: getGetLegacyLettersQueryKey() }); }

  async function handleSave(data: any): Promise<boolean> {
    if (editingLetter) {
      await updateLetter.mutateAsync({ id: editingLetter.id, data });
    } else {
      await createLetter.mutateAsync({ data });
    }
    invalidate();
    setWriteOpen(false);
    setEditingLetter(null);
    return true;
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

  if (isError) {
    return (
      <ErrorRetryView
        message="We couldn't load your legacy letters. Check your connection and try again."
        onRetry={refetch}
      />
    );
  }

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
            <Pressable accessibilityLabel="Create legacy letter" onPress={() => { setEditingLetter(null); setWriteOpen(true); }} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
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
  mediaCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  mediaAction: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontFamily: fonts.body, fontSize: 14 },
  textArea: { minHeight: 220, textAlignVertical: "top" },
  fieldLabel: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  pillText: { fontFamily: fonts.sub, fontSize: 12 },
  saveBtn: { borderRadius: 999, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { fontFamily: fonts.subSemibold, fontSize: 15 },
});
