import { useEffect, useRef, useState } from "react";
import {
  useGetVoiceMemos,
  useCreateVoiceMemo,
  useUpdateVoiceMemo,
  useDeleteVoiceMemo,
  getGetVoiceMemosQueryKey,
  type VoiceMemo,
} from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { useQueryClient } from "@tanstack/react-query";
import {
  Mic,
  Square,
  Play,
  Pause,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatRecordedAt(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

function pickMimeType(): { mimeType: string; ext: string } {
  if (typeof MediaRecorder !== "undefined") {
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
      return { mimeType: "audio/webm;codecs=opus", ext: "webm" };
    }
    if (MediaRecorder.isTypeSupported("audio/webm")) {
      return { mimeType: "audio/webm", ext: "webm" };
    }
    if (MediaRecorder.isTypeSupported("audio/mp4")) {
      return { mimeType: "audio/mp4", ext: "m4a" };
    }
  }
  return { mimeType: "", ext: "webm" };
}

export default function Memos() {
  const { data: memos, isLoading } = useGetVoiceMemos();
  const createMemo = useCreateVoiceMemo();
  const updateMemo = useUpdateVoiceMemo();
  const deleteMemo = useDeleteVoiceMemo();
  const { uploadFile } = useUpload();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const [playingId, setPlayingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetVoiceMemosQueryKey() });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const { mimeType } = pickMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      elapsedRef.current = 0;
      setElapsed(0);
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
      }, 1000);
    } catch {
      toast({
        variant: "destructive",
        title: "Microphone unavailable",
        description: "Please allow microphone access to record memos.",
      });
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const duration = elapsedRef.current;
    setIsRecording(false);
    setIsSaving(true);

    recorder.onstop = async () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;
      try {
        const { ext } = pickMimeType();
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        chunksRef.current = [];
        if (blob.size === 0) throw new Error("empty recording");
        const file = new File([blob], `memo-${Date.now()}.${ext}`, {
          type: blob.type,
        });
        const res = await uploadFile(file);
        if (!res?.objectPath) throw new Error("upload failed");
        await new Promise<void>((resolve, reject) => {
          createMemo.mutate(
            { data: { objectPath: res.objectPath, durationSeconds: duration } },
            {
              onSuccess: () => {
                invalidate();
                toast({ title: "Memo saved", description: "Your recording is stored privately." });
                resolve();
              },
              onError: () => reject(new Error("save failed")),
            },
          );
        });
      } catch {
        toast({
          variant: "destructive",
          title: "Couldn't save memo",
          description: "The recording wasn't saved. Please try again.",
        });
      } finally {
        setIsSaving(false);
        setElapsed(0);
      }
    };
    recorder.stop();
  };

  const togglePlay = (memo: VoiceMemo) => {
    if (playingId === memo.id) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(`/api/storage${memo.objectPath}`);
    audioRef.current = audio;
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => {
      setPlayingId(null);
      toast({
        variant: "destructive",
        title: "Playback failed",
        description: "We couldn't stream this memo.",
      });
    };
    audio.play().then(
      () => setPlayingId(memo.id),
      () => setPlayingId(null),
    );
  };

  const startRename = (memo: VoiceMemo) => {
    setEditingId(memo.id);
    setEditTitle(memo.title);
    setConfirmDeleteId(null);
  };

  const saveRename = (id: number) => {
    const title = editTitle.trim();
    if (!title) return;
    updateMemo.mutate(
      { id, data: { title } },
      {
        onSuccess: () => {
          invalidate();
          setEditingId(null);
          toast({ title: "Memo renamed" });
        },
        onError: () =>
          toast({ variant: "destructive", title: "Couldn't rename", description: "Please try again." }),
      },
    );
  };

  const handleDelete = (id: number) => {
    if (playingId === id) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
    }
    deleteMemo.mutate(
      { id },
      {
        onSuccess: () => {
          invalidate();
          setConfirmDeleteId(null);
          toast({ title: "Memo deleted", description: "The recording has been removed." });
        },
        onError: () =>
          toast({ variant: "destructive", title: "Couldn't delete", description: "Please try again." }),
      },
    );
  };

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto w-full space-y-12 animate-in fade-in duration-700 slide-in-from-bottom-4">
      <header className="space-y-2 border-b border-border/50 pb-8">
        <h1 className="text-3xl md:text-4xl font-serif text-foreground">Voice Memos</h1>
        <p className="text-muted-foreground font-subheading text-base">
          Capture a thought the moment it arrives. One tap, completely private.
        </p>
      </header>

      <div className="bg-card/40 border border-border/50 rounded-2xl p-10 backdrop-blur-sm flex flex-col items-center gap-6">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isSaving}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 border-2 disabled:opacity-60 ${
            isRecording
              ? "bg-destructive/20 border-destructive text-destructive animate-pulse"
              : "bg-primary/10 border-primary/40 text-primary hover:bg-primary/20 hover:border-primary"
          }`}
        >
          {isSaving ? (
            <Loader2 className="w-9 h-9 animate-spin" />
          ) : isRecording ? (
            <Square className="w-8 h-8 fill-current" />
          ) : (
            <Mic className="w-9 h-9" />
          )}
        </button>
        <div className="text-center space-y-1">
          {isRecording ? (
            <>
              <p className="text-2xl font-serif text-foreground tabular-nums">{formatClock(elapsed)}</p>
              <p className="text-sm text-muted-foreground font-subheading uppercase tracking-wider">
                Recording — tap to stop &amp; save
              </p>
            </>
          ) : isSaving ? (
            <p className="text-sm text-muted-foreground font-subheading uppercase tracking-wider">
              Saving your memo…
            </p>
          ) : (
            <p className="text-sm text-muted-foreground font-subheading uppercase tracking-wider">
              Tap to record
            </p>
          )}
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-subheading uppercase tracking-wider text-muted-foreground">
          Your recordings
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-2xl bg-muted/30" />
            <Skeleton className="h-20 w-full rounded-2xl bg-muted/30" />
          </div>
        ) : !memos || memos.length === 0 ? (
          <div className="bg-card/30 border border-border/50 rounded-2xl p-10 text-center">
            <Mic className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No memos yet. Your first recording will appear here.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {memos.map((memo) => (
              <li
                key={memo.id}
                className="bg-card/40 border border-border/50 rounded-2xl p-4 md:p-5 flex items-center gap-4 backdrop-blur-sm"
              >
                <button
                  onClick={() => togglePlay(memo)}
                  aria-label={playingId === memo.id ? "Pause" : "Play"}
                  className="w-12 h-12 shrink-0 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                >
                  {playingId === memo.id ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  {editingId === memo.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(memo.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                        className="bg-background border-border/50 h-9"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-primary"
                        onClick={() => saveRename(memo.id)}
                        disabled={updateMemo.isPending}
                        aria-label="Save name"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9"
                        onClick={() => setEditingId(null)}
                        aria-label="Cancel rename"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-foreground font-medium truncate">{memo.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatRecordedAt(memo.recordedAt)}
                        {memo.durationSeconds > 0 && ` · ${formatClock(memo.durationSeconds)}`}
                      </p>
                    </>
                  )}
                </div>

                {editingId !== memo.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    {confirmDeleteId === memo.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(memo.id)}
                          disabled={deleteMemo.isPending}
                        >
                          {deleteMemo.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Delete"
                          )}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 text-muted-foreground hover:text-foreground"
                          onClick={() => startRename(memo)}
                          aria-label="Rename memo"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            setEditingId(null);
                            setConfirmDeleteId(memo.id);
                          }}
                          aria-label="Delete memo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
