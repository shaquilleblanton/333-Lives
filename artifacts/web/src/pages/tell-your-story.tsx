import { useEffect, useRef, useState } from "react";
import {
  useGetStoryAnswers,
  useUpsertStoryAnswer,
  useDeleteStoryAnswer,
  getGetStoryAnswersQueryKey,
  requestUploadUrl,
  type StoryAnswer,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Mic,
  MicOff,
  Play,
  Pause,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Loader2,
  X,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

type Chapter = {
  id: string;
  title: string;
  emoji: string;
  subtitle: string;
  prompts: { id: string; text: string }[];
};

const CHAPTERS: Chapter[] = [
  {
    id: "origins",
    title: "Origins",
    emoji: "🌍",
    subtitle: "Where it all began",
    prompts: [
      { id: "origins_birthplace", text: "Where were you born, and what do you know about that place?" },
      { id: "origins_parents", text: "Tell me about your parents — who were they, where did they come from?" },
      { id: "origins_culture", text: "What cultural traditions or heritage were you raised with?" },
      { id: "origins_earliest", text: "What is your earliest memory?" },
    ],
  },
  {
    id: "growing_up",
    title: "Growing Up",
    emoji: "🌱",
    subtitle: "The years that shaped you",
    prompts: [
      { id: "growing_up_home", text: "What was your childhood home like? Describe it in detail." },
      { id: "growing_up_happiest", text: "What was your happiest memory growing up?" },
      { id: "growing_up_challenge", text: "What was the biggest challenge you faced as a child?" },
      { id: "growing_up_dream", text: "What did you want to be when you grew up, and why?" },
    ],
  },
  {
    id: "love_family",
    title: "Love & Family",
    emoji: "💛",
    subtitle: "The people who matter most",
    prompts: [
      { id: "love_first", text: "Tell me about your first real experience of love." },
      { id: "love_partner", text: "How did you meet your partner or closest companion? What drew you to them?" },
      { id: "love_parenting", text: "What has parenthood or being a caregiver taught you?" },
      { id: "love_family_moments", text: "What family moment are you most grateful to have lived?" },
    ],
  },
  {
    id: "career_purpose",
    title: "Career & Purpose",
    emoji: "⚡",
    subtitle: "What you built and why",
    prompts: [
      { id: "career_start", text: "How did your career begin? What was your very first job?" },
      { id: "career_proudest", text: "What professional achievement are you most proud of?" },
      { id: "career_pivot", text: "Was there a turning point that changed your direction?" },
      { id: "career_purpose_q", text: "What gives — or gave — your work its meaning?" },
    ],
  },
  {
    id: "beliefs_values",
    title: "Beliefs & Values",
    emoji: "🧭",
    subtitle: "What you stand for",
    prompts: [
      { id: "beliefs_core", text: "What are the core values you try to live by?" },
      { id: "beliefs_faith", text: "What role has faith, spirituality, or philosophy played in your life?" },
      { id: "beliefs_changed", text: "What belief did you hold strongly that you later changed?" },
      { id: "beliefs_world", text: "If you could change one thing about the world, what would it be?" },
    ],
  },
  {
    id: "lessons_learned",
    title: "Lessons Learned",
    emoji: "📖",
    subtitle: "Wisdom from your journey",
    prompts: [
      { id: "lessons_failure", text: "What failure taught you the most important lesson?" },
      { id: "lessons_advice", text: "What advice would you give your 20-year-old self?" },
      { id: "lessons_regret", text: "Is there something you wish you had done differently?" },
      { id: "lessons_wisdom", text: "What is the single most important thing you've learned about life?" },
    ],
  },
  {
    id: "my_legacy",
    title: "My Legacy",
    emoji: "✨",
    subtitle: "What you want to leave behind",
    prompts: [
      { id: "legacy_remember", text: "How do you hope to be remembered by those who knew you?" },
      { id: "legacy_impact", text: "What impact do you most want to have had on the world?" },
      { id: "legacy_message", text: "What message do you most want to leave for the generations that come after you?" },
      { id: "legacy_life", text: "If you could describe your life in one sentence, what would it be?" },
    ],
  },
];

const TOTAL_PROMPTS = CHAPTERS.reduce((sum, c) => sum + c.prompts.length, 0);

function useStoryRecorder() {
  const [recording, setRecording] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = async (promptId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start();
      recorderRef.current = mr;
      setRecording(promptId);
      setIsRecording(true);
    } catch {
      // permission denied or device error — do nothing
    }
  };

  const stop = (): Promise<Blob | null> =>
    new Promise((resolve) => {
      const mr = recorderRef.current;
      if (!mr) { resolve(null); return; }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        recorderRef.current?.stream.getTracks().forEach(t => t.stop());
        recorderRef.current = null;
        setRecording(null);
        setIsRecording(false);
        resolve(blob);
      };
      mr.stop();
    });

  return { recording, isRecording, isSaving, setIsSaving, start, stop };
}

type ViewMode = "chapters" | "timeline";

export default function TellYourStory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: answers, isLoading } = useGetStoryAnswers();
  const upsert = useUpsertStoryAnswer();
  const del = useDeleteStoryAnswer();

  const [viewMode, setViewMode] = useState<ViewMode>("chapters");
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const rec = useStoryRecorder();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetStoryAnswersQueryKey() });

  const answerMap = new Map<string, StoryAnswer>(
    (answers ?? []).map((a) => [`${a.chapterId}:${a.promptId}`, a]),
  );

  const chapterAnsweredCount = (chapter: Chapter) =>
    chapter.prompts.filter((p) => {
      const a = answerMap.get(`${chapter.id}:${p.id}`);
      return a && (a.textAnswer || a.audioUrl);
    }).length;

  const totalAnswered = (answers ?? []).filter((a) => a.textAnswer || a.audioUrl).length;

  const startEdit = (chapterId: string, promptId: string) => {
    const key = `${chapterId}:${promptId}`;
    const existing = answerMap.get(key);
    setEditingPrompt(key);
    setDraftText(existing?.textAnswer ?? "");
  };

  const saveText = async (chapterId: string, promptId: string) => {
    const key = `${chapterId}:${promptId}`;
    const existing = answerMap.get(key);
    const text = draftText.trim() || null;
    if (text === (existing?.textAnswer ?? null)) {
      setEditingPrompt(null);
      return;
    }
    await upsert.mutateAsync({
      chapterId,
      promptId,
      data: { textAnswer: text, audioUrl: existing?.audioUrl ?? undefined },
    });
    invalidate();
    setEditingPrompt(null);
  };

  const deleteAnswer = async (chapterId: string, promptId: string) => {
    if (!confirm("Remove this answer?")) return;
    await del.mutateAsync({ chapterId, promptId });
    invalidate();
    toast({ title: "Answer removed" });
  };

  const handleRecord = async (chapterId: string, promptId: string) => {
    const key = `${chapterId}:${promptId}`;
    if (rec.isRecording && rec.recording === key) {
      rec.setIsSaving(true);
      const blob = await rec.stop();
      if (!blob) { rec.setIsSaving(false); return; }
      try {
        const ext = blob.type.includes("ogg") ? "ogg" : "webm";
        const upload = await requestUploadUrl({
          name: `story-${Date.now()}.${ext}`,
          size: blob.size,
          contentType: blob.type,
        });
        const res = await fetch(upload.uploadURL, {
          method: "PUT",
          headers: { "Content-Type": blob.type },
          body: blob,
        });
        if (!res.ok) throw new Error("upload failed");
        const existing = answerMap.get(key);
        await upsert.mutateAsync({
          chapterId,
          promptId,
          data: { textAnswer: existing?.textAnswer ?? undefined, audioUrl: upload.objectPath },
        });
        invalidate();
        toast({ title: "Voice answer saved" });
      } catch {
        toast({ variant: "destructive", title: "Upload failed", description: "Please try again." });
      } finally {
        rec.setIsSaving(false);
      }
    } else {
      await rec.start(key);
    }
  };

  const togglePlay = (objectPath: string) => {
    const url = `/api/storage${objectPath}`;
    if (playingUrl === url) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingUrl(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setPlayingUrl(null);
    audio.play().then(() => setPlayingUrl(url), () => setPlayingUrl(null));
  };

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const progressPct = TOTAL_PROMPTS > 0 ? Math.round((totalAnswered / TOTAL_PROMPTS) * 100) : 0;

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto w-full space-y-10 animate-in fade-in duration-700 slide-in-from-bottom-4">
      {/* Header */}
      <header className="space-y-4 border-b border-border/50 pb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-3xl md:text-4xl font-serif text-foreground">Tell Your Story</h1>
            <p className="text-muted-foreground font-subheading text-base">
              A living autobiography — answer in your own time, at your own pace.
            </p>
          </div>
          <div className="shrink-0 text-center">
            <p className="text-3xl font-serif text-primary">{progressPct}%</p>
            <p className="text-xs font-subheading uppercase tracking-wider text-muted-foreground mt-0.5">complete</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-border/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground font-subheading">
          {totalAnswered} of {TOTAL_PROMPTS} prompts answered · {CHAPTERS.filter(c => chapterAnsweredCount(c) > 0).length} of {CHAPTERS.length} chapters started
        </p>
      </header>

      {/* View toggle */}
      <div className="flex gap-2">
        {(["chapters", "timeline"] as const).map(v => (
          <button key={v} onClick={() => setViewMode(v)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-subheading transition-colors border",
              viewMode === v ? "bg-foreground text-background border-foreground" : "bg-card/50 text-muted-foreground border-border/50 hover:bg-muted/50"
            )}
          >
            {v === "chapters" ? "Chapters" : "Timeline"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : viewMode === "timeline" ? (
        <TimelineView chapters={CHAPTERS} answerMap={answerMap} />
      ) : (
        <div className="space-y-4">
          {CHAPTERS.map((chapter) => {
            const answered = chapterAnsweredCount(chapter);
            const isExpanded = expandedChapter === chapter.id;
            return (
              <div key={chapter.id} className="border border-border/50 rounded-2xl overflow-hidden">
                {/* Chapter header */}
                <button
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-muted/20 transition-colors"
                  onClick={() => setExpandedChapter(isExpanded ? null : chapter.id)}
                >
                  <span className="text-2xl shrink-0">{chapter.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-lg text-foreground">{chapter.title}</p>
                    <p className="text-sm text-muted-foreground font-subheading">{chapter.subtitle}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-subheading text-muted-foreground">
                        {answered}/{chapter.prompts.length}
                      </p>
                    </div>
                    {/* Mini progress ring */}
                    <svg width="32" height="32" className="rotate-[-90deg]">
                      <circle cx="16" cy="16" r="12" fill="none" strokeWidth="3" className="stroke-border/50" />
                      <circle cx="16" cy="16" r="12" fill="none" strokeWidth="3"
                        className="stroke-primary transition-all duration-500"
                        strokeDasharray={`${2 * Math.PI * 12}`}
                        strokeDashoffset={`${2 * Math.PI * 12 * (1 - answered / chapter.prompts.length)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Prompts */}
                {isExpanded && (
                  <div className="border-t border-border/50 divide-y divide-border/30">
                    {chapter.prompts.map((prompt) => {
                      const key = `${chapter.id}:${prompt.id}`;
                      const answer = answerMap.get(key);
                      const hasText = !!answer?.textAnswer;
                      const hasAudio = !!answer?.audioUrl;
                      const isAnswered = hasText || hasAudio;
                      const isEditing = editingPrompt === key;
                      const isThisRecording = rec.recording === key;

                      return (
                        <div key={prompt.id} className="p-5 space-y-3">
                          <div className="flex items-start gap-3">
                            {isAnswered ? (
                              <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            ) : (
                              <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0 mt-0.5" />
                            )}
                            <p className="text-sm font-subheading text-foreground leading-relaxed flex-1">{prompt.text}</p>
                          </div>

                          {/* Existing answer display */}
                          {!isEditing && answer?.textAnswer && (
                            <div className="ml-8 bg-card/40 border border-border/40 rounded-xl p-4 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-body">
                              {answer.textAnswer}
                            </div>
                          )}

                          {/* Audio playback */}
                          {!isEditing && answer?.audioUrl && (
                            <div className="ml-8 flex items-center gap-3">
                              <button
                                onClick={() => togglePlay(answer.audioUrl!)}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-subheading hover:bg-primary/20 transition-colors"
                              >
                                {playingUrl === `/api/storage${answer.audioUrl}` ? (
                                  <><Pause className="w-3 h-3" /> Playing…</>
                                ) : (
                                  <><Play className="w-3 h-3" /> Play voice answer</>
                                )}
                              </button>
                            </div>
                          )}

                          {/* Edit / record actions */}
                          {isEditing ? (
                            <div className="ml-8 space-y-3">
                              <textarea
                                value={draftText}
                                onChange={e => setDraftText(e.target.value)}
                                rows={5}
                                placeholder="Write your answer here…"
                                className="w-full bg-background border border-border/60 rounded-xl p-4 text-sm text-foreground placeholder:text-muted-foreground/60 resize-y focus:outline-none focus:ring-1 focus:ring-primary/60 font-body"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => saveText(chapter.id, prompt.id)} disabled={upsert.isPending}>
                                  {upsert.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingPrompt(null)}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="ml-8 flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => startEdit(chapter.id, prompt.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-subheading border border-border/50 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                              >
                                <Pencil className="w-3 h-3" />
                                {hasText ? "Edit answer" : "Write answer"}
                              </button>
                              <button
                                onClick={() => handleRecord(chapter.id, prompt.id)}
                                disabled={rec.isSaving || (rec.isRecording && !isThisRecording)}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-subheading border transition-colors disabled:opacity-50",
                                  isThisRecording
                                    ? "border-destructive text-destructive bg-destructive/10 animate-pulse"
                                    : "border-border/50 text-muted-foreground hover:text-foreground hover:border-foreground/30"
                                )}
                              >
                                {rec.isSaving && isThisRecording ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : isThisRecording ? (
                                  <><MicOff className="w-3 h-3" /> Stop recording</>
                                ) : (
                                  <><Mic className="w-3 h-3" /> {hasAudio ? "Re-record voice" : "Record voice"}</>
                                )}
                              </button>
                              {isAnswered && (
                                <button
                                  onClick={() => deleteAnswer(chapter.id, prompt.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-subheading border border-border/50 text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" /> Clear
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TimelineView({
  chapters,
  answerMap,
}: {
  chapters: Chapter[];
  answerMap: Map<string, StoryAnswer>;
}) {
  const answered = chapters.flatMap((c) =>
    c.prompts
      .map((p) => ({ chapter: c, prompt: p, answer: answerMap.get(`${c.id}:${p.id}`) }))
      .filter(({ answer }) => answer && (answer.textAnswer || answer.audioUrl))
  );

  if (answered.length === 0) {
    return (
      <div className="bg-card/30 border border-border/50 rounded-2xl p-12 text-center space-y-3">
        <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto" />
        <p className="text-muted-foreground font-subheading">
          Your answered prompts will appear here as a timeline of your life story.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {answered.map(({ chapter, prompt, answer }) => (
        <div key={`${chapter.id}:${prompt.id}`} className="flex gap-4">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xl">{chapter.emoji}</span>
            <div className="w-px flex-1 bg-border/40 min-h-4" />
          </div>
          <div className="flex-1 pb-4 min-w-0">
            <p className="text-xs font-subheading uppercase tracking-wider text-muted-foreground mb-1">{chapter.title}</p>
            <p className="text-sm font-subheading text-foreground/80 mb-2">{prompt.text}</p>
            {answer?.textAnswer && (
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-body bg-card/30 border border-border/40 rounded-xl p-4">
                {answer.textAnswer}
              </p>
            )}
            {answer?.audioUrl && (
              <p className="text-xs text-muted-foreground font-subheading mt-1.5 flex items-center gap-1">
                <Mic className="w-3 h-3" /> Voice answer recorded
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
