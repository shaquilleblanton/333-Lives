import { Feather } from "@expo/vector-icons";
import {
  getGetStoryAnswersQueryKey,
  requestUploadUrl,
  useDeleteStoryAnswer,
  useGetStoryAnswers,
  useUpsertStoryAnswer,
  type StoryAnswer,
} from "@workspace/api-client-react";
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
import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

type Prompt = { id: string; text: string };
type Chapter = { id: string; title: string; emoji: string; subtitle: string; prompts: Prompt[] };

const CHAPTERS: Chapter[] = [
  {
    id: "origins", title: "Origins", emoji: "🌍", subtitle: "Where it all began",
    prompts: [
      { id: "origins_birthplace", text: "Where were you born, and what do you know about that place?" },
      { id: "origins_parents", text: "Tell me about your parents — who were they, where did they come from?" },
      { id: "origins_culture", text: "What cultural traditions or heritage were you raised with?" },
      { id: "origins_earliest", text: "What is your earliest memory?" },
    ],
  },
  {
    id: "growing_up", title: "Growing Up", emoji: "🌱", subtitle: "The years that shaped you",
    prompts: [
      { id: "growing_up_home", text: "What was your childhood home like? Describe it in detail." },
      { id: "growing_up_happiest", text: "What was your happiest memory growing up?" },
      { id: "growing_up_challenge", text: "What was the biggest challenge you faced as a child?" },
      { id: "growing_up_dream", text: "What did you want to be when you grew up, and why?" },
    ],
  },
  {
    id: "love_family", title: "Love & Family", emoji: "💛", subtitle: "The people who matter most",
    prompts: [
      { id: "love_first", text: "Tell me about your first real experience of love." },
      { id: "love_partner", text: "How did you meet your partner or closest companion? What drew you to them?" },
      { id: "love_parenting", text: "What has parenthood or being a caregiver taught you?" },
      { id: "love_family_moments", text: "What family moment are you most grateful to have lived?" },
    ],
  },
  {
    id: "career_purpose", title: "Career & Purpose", emoji: "⚡", subtitle: "What you built and why",
    prompts: [
      { id: "career_start", text: "How did your career begin? What was your very first job?" },
      { id: "career_proudest", text: "What professional achievement are you most proud of?" },
      { id: "career_pivot", text: "Was there a turning point that changed your direction?" },
      { id: "career_purpose_q", text: "What gives — or gave — your work its meaning?" },
    ],
  },
  {
    id: "beliefs_values", title: "Beliefs & Values", emoji: "🧭", subtitle: "What you stand for",
    prompts: [
      { id: "beliefs_core", text: "What are the core values you try to live by?" },
      { id: "beliefs_faith", text: "What role has faith, spirituality, or philosophy played in your life?" },
      { id: "beliefs_changed", text: "What belief did you hold strongly that you later changed?" },
      { id: "beliefs_world", text: "If you could change one thing about the world, what would it be?" },
    ],
  },
  {
    id: "lessons_learned", title: "Lessons Learned", emoji: "📖", subtitle: "Wisdom from your journey",
    prompts: [
      { id: "lessons_failure", text: "What failure taught you the most important lesson?" },
      { id: "lessons_advice", text: "What advice would you give your 20-year-old self?" },
      { id: "lessons_regret", text: "Is there something you wish you had done differently?" },
      { id: "lessons_wisdom", text: "What is the single most important thing you've learned about life?" },
    ],
  },
  {
    id: "my_legacy", title: "My Legacy", emoji: "✨", subtitle: "What you want to leave behind",
    prompts: [
      { id: "legacy_remember", text: "How do you hope to be remembered by those who knew you?" },
      { id: "legacy_impact", text: "What impact do you most want to have had on the world?" },
      { id: "legacy_message", text: "What message do you most want to leave for the generations that come after you?" },
      { id: "legacy_life", text: "If you could describe your life in one sentence, what would it be?" },
    ],
  },
];

const TOTAL_PROMPTS = CHAPTERS.reduce((s, c) => s + c.prompts.length, 0);

type AnswerModal = {
  chapterId: string;
  promptId: string;
  promptText: string;
  currentAnswer: StoryAnswer | undefined;
};

function formatClock(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export default function TellYourStoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: answers, isLoading } = useGetStoryAnswers();
  const upsert = useUpsertStoryAnswer();
  const del = useDeleteStoryAnswer();

  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  const [modal, setModal] = useState<AnswerModal | null>(null);
  const [draftText, setDraftText] = useState("");
  const [isSavingText, setIsSavingText] = useState(false);
  const [isSavingAudio, setIsSavingAudio] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const player = useAudioPlayer();
  const playerStatus = useAudioPlayerStatus(player);
  const [playingPromptId, setPlayingPromptId] = useState<string | null>(null);
  const durationRef = useRef(0);
  durationRef.current = recorderState.durationMillis ?? 0;

  useEffect(() => {
    if (playerStatus.didJustFinish) setPlayingPromptId(null);
  }, [playerStatus.didJustFinish]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetStoryAnswersQueryKey() });

  const answerMap = new Map<string, StoryAnswer>(
    (answers ?? []).map((a) => [`${a.chapterId}:${a.promptId}`, a]),
  );
  const totalAnswered = (answers ?? []).filter((a) => a.textAnswer || a.audioUrl).length;
  const progressPct = Math.round((totalAnswered / TOTAL_PROMPTS) * 100);

  const chapterAnswered = (chapter: Chapter) =>
    chapter.prompts.filter((p) => {
      const a = answerMap.get(`${chapter.id}:${p.id}`);
      return a && (a.textAnswer || a.audioUrl);
    }).length;

  const openModal = (chapter: Chapter, prompt: Prompt) => {
    const key = `${chapter.id}:${prompt.id}`;
    setModal({ chapterId: chapter.id, promptId: prompt.id, promptText: prompt.text, currentAnswer: answerMap.get(key) });
    setDraftText(answerMap.get(key)?.textAnswer ?? "");
  };

  const closeModal = () => {
    if (recorderState.isRecording) recorder.stop().catch(() => {});
    setModal(null);
  };

  const saveText = async () => {
    if (!modal) return;
    const text = draftText.trim() || null;
    const hasAudio = !!modal.currentAnswer?.audioUrl;
    if (!text && !hasAudio) {
      setModal(null);
      return;
    }
    setIsSavingText(true);
    try {
      await upsert.mutateAsync({
        chapterId: modal.chapterId,
        promptId: modal.promptId,
        data: { textAnswer: text, audioUrl: modal.currentAnswer?.audioUrl ?? undefined },
      });
      invalidate();
      setModal(null);
    } catch {
      notifyError("Couldn't save", "Please try again.");
    } finally {
      setIsSavingText(false);
    }
  };

  const startRecord = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        notifyError("Microphone needed", "Allow microphone access to record voice answers.");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      notifyError("Recording failed", "Couldn't start recording.");
    }
  };

  const stopRecord = async () => {
    if (!modal) return;
    setIsSavingAudio(true);
    try {
      const durationSeconds = Math.max(0, Math.round(durationRef.current / 1000));
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = recorder.uri;
      if (!uri) throw new Error("no uri");
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) throw new Error("file missing");
      const size = "size" in info && typeof info.size === "number" ? info.size : 0;
      const ext = uri.split(".").pop()?.toLowerCase() || "m4a";
      const contentType = ext === "m4a" || ext === "mp4" ? "audio/mp4" : `audio/${ext}`;
      const upload = await requestUploadUrl({ name: `story-${Date.now()}.${ext}`, size, contentType });
      const result = await FileSystem.uploadAsync(upload.uploadURL, uri, {
        httpMethod: "PUT",
        headers: { "Content-Type": contentType },
      });
      if (result.status < 200 || result.status >= 300) throw new Error("upload failed");
      await upsert.mutateAsync({
        chapterId: modal.chapterId,
        promptId: modal.promptId,
        data: { textAnswer: draftText.trim() || modal.currentAnswer?.textAnswer || undefined, audioUrl: upload.objectPath },
      });
      invalidate();
      setModal(prev => prev ? { ...prev, currentAnswer: { ...(prev.currentAnswer ?? {} as StoryAnswer), audioUrl: upload.objectPath } } : null);
    } catch {
      notifyError("Couldn't save voice", "The recording wasn't saved.");
    } finally {
      setIsSavingAudio(false);
    }
  };

  const deleteAnswer = (chapterId: string, promptId: string) => {
    const doDelete = () => {
      del.mutate({ chapterId, promptId }, {
        onSuccess: () => { invalidate(); setModal(null); },
        onError: () => notifyError("Couldn't remove", "Please try again."),
      });
    };
    if (Platform.OS === "web") {
      if (window.confirm("Remove this answer?")) doDelete();
    } else {
      Alert.alert("Remove answer", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const togglePlay = (objectPath: string, promptKey: string) => {
    if (playingPromptId === promptKey) {
      player.pause();
      setPlayingPromptId(null);
      return;
    }
    const url = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/storage${objectPath}`;
    player.replace({ uri: url });
    player.play();
    setPlayingPromptId(promptKey);
  };

  const notifyError = (title: string, msg: string) => {
    if (Platform.OS === "web") window.alert(`${title}\n${msg}`);
    else Alert.alert(title, msg);
  };

  const topPad = insets.top + WEB_TOP_INSET + 12;
  const botPad = insets.bottom + WEB_BOTTOM_INSET + 24;
  const isRecording = recorderState.isRecording;

  const renderChapter = ({ item: chapter }: { item: Chapter }) => {
    const answered = chapterAnswered(chapter);
    const isExpanded = expandedChapter === chapter.id;
    const circumference = 2 * Math.PI * 14;

    return (
      <View style={[styles.chapterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable
          onPress={() => setExpandedChapter(isExpanded ? null : chapter.id)}
          style={styles.chapterHeader}
        >
          <Text style={styles.chapterEmoji}>{chapter.emoji}</Text>
          <View style={styles.chapterInfo}>
            <Text style={[styles.chapterTitle, { color: colors.foreground }]}>{chapter.title}</Text>
            <Text style={[styles.chapterSub, { color: colors.mutedForeground }]}>{chapter.subtitle}</Text>
          </View>
          <View style={styles.chapterMeta}>
            <Svg width={36} height={36} style={{ transform: [{ rotate: "-90deg" }] }}>
              <Circle cx={18} cy={18} r={14} fill="none" strokeWidth={3} stroke={colors.border} />
              <Circle
                cx={18} cy={18} r={14} fill="none" strokeWidth={3} stroke={colors.primary}
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - answered / chapter.prompts.length)}
                strokeLinecap="round"
              />
            </Svg>
            <Text style={[styles.chapterCount, { color: colors.mutedForeground }]}>
              {answered}/{chapter.prompts.length}
            </Text>
            <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
          </View>
        </Pressable>

        {isExpanded && (
          <View style={[styles.promptList, { borderTopColor: colors.border }]}>
            {chapter.prompts.map((prompt) => {
              const key = `${chapter.id}:${prompt.id}`;
              const answer = answerMap.get(key);
              const hasAnswer = !!(answer?.textAnswer || answer?.audioUrl);
              return (
                <Pressable
                  key={prompt.id}
                  onPress={() => openModal(chapter, prompt)}
                  style={[styles.promptRow, { borderBottomColor: colors.border }]}
                >
                  <Feather
                    name={hasAnswer ? "check-circle" : "circle"}
                    size={16}
                    color={hasAnswer ? colors.primary : colors.mutedForeground + "60"}
                    style={{ marginTop: 2 }}
                  />
                  <View style={styles.promptContent}>
                    <Text style={[styles.promptText, { color: colors.foreground }]} numberOfLines={2}>{prompt.text}</Text>
                    {answer?.textAnswer ? (
                      <Text style={[styles.promptPreview, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {answer.textAnswer}
                      </Text>
                    ) : answer?.audioUrl ? (
                      <Text style={[styles.promptPreview, { color: colors.mutedForeground }]}>🎙 Voice answer</Text>
                    ) : null}
                  </View>
                  <Feather name="chevron-right" size={14} color={colors.mutedForeground + "60"} />
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={CHAPTERS}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: botPad, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Tell Your Story</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              A living autobiography — answer in your own time, at your own pace.
            </Text>
            {/* Progress */}
            <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.progressRow}>
                <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>Your story</Text>
                <Text style={[styles.progressPct, { color: colors.primary }]}>{progressPct}%</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.border + "60" }]}>
                <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${progressPct}%` as any }]} />
              </View>
              <Text style={[styles.progressSub, { color: colors.mutedForeground }]}>
                {totalAnswered} of {TOTAL_PROMPTS} prompts answered
              </Text>
            </View>
          </View>
        }
        renderItem={renderChapter}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      {/* Answer modal */}
      <Modal visible={!!modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView
            style={[styles.modalScreen, { backgroundColor: colors.background }]}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Modal header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalChapter, { color: colors.mutedForeground }]}>
                {CHAPTERS.find(c => c.id === modal?.chapterId)?.title}
              </Text>
              <Pressable onPress={closeModal} hitSlop={10}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <View style={{ padding: 20, gap: 20 }}>
              {/* Prompt */}
              <Text style={[styles.modalPrompt, { color: colors.foreground }]}>{modal?.promptText}</Text>

              {/* Text area */}
              <View>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>WRITTEN ANSWER</Text>
                <TextInput
                  value={draftText}
                  onChangeText={setDraftText}
                  multiline
                  numberOfLines={6}
                  placeholder="Write your answer here…"
                  placeholderTextColor={colors.mutedForeground + "80"}
                  style={[styles.textArea, {
                    color: colors.foreground,
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                  }]}
                  textAlignVertical="top"
                />
              </View>

              {/* Voice answer */}
              <View>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>VOICE ANSWER</Text>

                {modal?.currentAnswer?.audioUrl && !isRecording && !isSavingAudio && (
                  <Pressable
                    onPress={() => modal?.currentAnswer?.audioUrl && togglePlay(modal.currentAnswer.audioUrl, `${modal.chapterId}:${modal.promptId}`)}
                    style={[styles.audioBtn, { borderColor: colors.primary, backgroundColor: colors.primary + "18" }]}
                  >
                    <Feather name={playingPromptId === `${modal?.chapterId}:${modal?.promptId}` ? "pause" : "play"} size={16} color={colors.primary} />
                    <Text style={[styles.audioBtnText, { color: colors.primary }]}>
                      {playingPromptId === `${modal?.chapterId}:${modal?.promptId}` ? "Playing…" : "Play voice answer"}
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={isRecording ? stopRecord : startRecord}
                  disabled={isSavingAudio}
                  style={[
                    styles.recordBtn,
                    {
                      borderColor: isRecording ? colors.destructive : colors.border,
                      backgroundColor: isRecording ? colors.destructive + "18" : colors.card,
                    },
                  ]}
                >
                  {isSavingAudio ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <Feather name={isRecording ? "stop-circle" : "mic"} size={20} color={isRecording ? colors.destructive : colors.mutedForeground} />
                  )}
                  <Text style={[styles.recordBtnText, {
                    color: isRecording ? colors.destructive : colors.mutedForeground,
                  }]}>
                    {isSavingAudio ? "Saving…" : isRecording
                      ? `${formatClock(recorderState.durationMillis ?? 0)} — tap to stop`
                      : modal?.currentAnswer?.audioUrl ? "Re-record voice" : "Record voice answer"}
                  </Text>
                </Pressable>
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <Pressable
                  onPress={saveText}
                  disabled={isSavingText || isSavingAudio}
                  style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: isSavingText ? 0.7 : 1 }]}
                >
                  {isSavingText ? (
                    <ActivityIndicator color={colors.background} size="small" />
                  ) : (
                    <Text style={[styles.saveBtnText, { color: colors.background }]}>Save answer</Text>
                  )}
                </Pressable>
                {(modal?.currentAnswer?.textAnswer || modal?.currentAnswer?.audioUrl) && (
                  <Pressable
                    onPress={() => modal && deleteAnswer(modal.chapterId, modal.promptId)}
                    style={styles.deleteBtn}
                  >
                    <Text style={[styles.deleteBtnText, { color: colors.destructive }]}>Remove</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontSize: 30 },
  subtitle: { fontFamily: fonts.body, fontSize: 14, marginTop: 4 },
  progressCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 16, gap: 8 },
  progressRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressLabel: { fontFamily: fonts.sub, fontSize: 12, letterSpacing: 0.5 },
  progressPct: { fontFamily: fonts.serif, fontSize: 22 },
  progressTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2 },
  progressSub: { fontFamily: fonts.body, fontSize: 11 },
  chapterCard: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  chapterHeader: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  chapterEmoji: { fontSize: 24 },
  chapterInfo: { flex: 1, minWidth: 0 },
  chapterTitle: { fontFamily: fonts.subSemibold, fontSize: 16 },
  chapterSub: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  chapterMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  chapterCount: { fontFamily: fonts.sub, fontSize: 12 },
  promptList: { borderTopWidth: 1 },
  promptRow: { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  promptContent: { flex: 1, minWidth: 0 },
  promptText: { fontFamily: fonts.sub, fontSize: 13, lineHeight: 18 },
  promptPreview: { fontFamily: fonts.body, fontSize: 11, marginTop: 3 },
  modalScreen: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalChapter: { fontFamily: fonts.sub, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  modalPrompt: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 28 },
  sectionLabel: { fontFamily: fonts.sub, fontSize: 11, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" },
  textArea: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.body, fontSize: 15, minHeight: 130 },
  audioBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  audioBtnText: { fontFamily: fonts.sub, fontSize: 14 },
  recordBtn: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16, borderWidth: 1, borderRadius: 14 },
  recordBtnText: { fontFamily: fonts.sub, fontSize: 14 },
  modalActions: { flexDirection: "row", gap: 10, alignItems: "center" },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  saveBtnText: { fontFamily: fonts.subSemibold, fontSize: 15 },
  deleteBtn: { paddingHorizontal: 16, paddingVertical: 14 },
  deleteBtnText: { fontFamily: fonts.sub, fontSize: 14 },
});
