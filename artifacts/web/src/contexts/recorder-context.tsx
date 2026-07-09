import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocation } from "wouter";
import {
  useCreateVoiceMemo,
  getGetVoiceMemosQueryKey,
} from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { useQueryClient } from "@tanstack/react-query";
import { Mic, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RecorderContextValue {
  isRecording: boolean;
  isSaving: boolean;
  elapsed: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

const RecorderContext = createContext<RecorderContextValue | null>(null);

export function useRecorder() {
  const ctx = useContext(RecorderContext);
  if (!ctx) throw new Error("useRecorder must be used within RecorderProvider");
  return ctx;
}

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
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

/**
 * App-level recorder. Lives above the route switch so an in-progress
 * recording keeps capturing while the user navigates between pages
 * (it only ends when they stop it or close the tab).
 */
export function RecorderProvider({ children }: { children: React.ReactNode }) {
  const createMemo = useCreateVoiceMemo();
  const { uploadFile } = useUpload();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [location, navigate] = useLocation();

  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  // Cleanup only when the whole app unmounts (tab close handles the rest).
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startingRef = useRef(false);

  const startRecording = useCallback(async () => {
    if (mediaRecorderRef.current || startingRef.current || isSaving) return;
    startingRef.current = true;
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
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      elapsedRef.current = 0;
      setElapsed(0);
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
      }, 1000);
    } catch {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      elapsedRef.current = 0;
      setElapsed(0);
      setIsRecording(false);
      toast({
        variant: "destructive",
        title: "Microphone unavailable",
        description: "Please allow microphone access to record memos.",
      });
    } finally {
      startingRef.current = false;
    }
  }, [isSaving, toast]);

  const stopRecording = useCallback(() => {
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
                queryClient.invalidateQueries({
                  queryKey: getGetVoiceMemosQueryKey(),
                });
                toast({
                  title: "Memo saved",
                  description: "Your recording is stored privately.",
                });
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
  }, [createMemo, queryClient, toast, uploadFile]);

  return (
    <RecorderContext.Provider
      value={{ isRecording, isSaving, elapsed, startRecording, stopRecording }}
    >
      {children}
      {/* Discreet global indicator so an active recording stays visible
          (and stoppable) from any page. Hidden on the Memos page itself,
          which has its own full-size controls. */}
      {isRecording && location !== "/memos" && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex items-center gap-3 bg-card border border-destructive/40 rounded-full pl-4 pr-2 py-2 shadow-lg backdrop-blur-sm">
          <button
            onClick={() => navigate("/memos")}
            className="flex items-center gap-2 text-sm text-foreground"
            aria-label="Go to Voice Memos"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
            </span>
            <Mic className="w-4 h-4 text-destructive" />
            <span className="tabular-nums font-medium">{formatClock(elapsed)}</span>
          </button>
          <button
            onClick={stopRecording}
            className="w-8 h-8 rounded-full bg-destructive/15 text-destructive flex items-center justify-center hover:bg-destructive/25 transition-colors"
            aria-label="Stop recording and save"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      )}
    </RecorderContext.Provider>
  );
}
