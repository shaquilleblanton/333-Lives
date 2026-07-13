import { useState, useRef } from "react";
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
import { useUpload } from "@workspace/object-storage-web";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Flame, Handshake, Heart, Dumbbell,
  Image as ImageIcon, Mic, Trash2, Loader2, Clock,
  StopCircle, Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const REACTIONS = [
  { type: "fire",     emoji: "🔥", label: "Fire",     icon: Flame },
  { type: "pray",     emoji: "🙏", label: "Praying",  icon: Handshake },
  { type: "love",     emoji: "❤️", label: "Love",     icon: Heart },
  { type: "strength", emoji: "💪", label: "Strength", icon: Dumbbell },
] as const;

type ReactionType = "fire" | "pray" | "love" | "strength";
type PostType = "text" | "photo" | "voice";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function timeAgo(iso: string) {
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }); }
  catch { return ""; }
}

function expiryLabel(expiresAt: string | null, isPersistent: boolean) {
  if (isPersistent) return "Stays forever";
  if (!expiresAt) return "";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / 3600000);
  if (hours < 1) return "< 1h left";
  return `${hours}h left`;
}

export default function Pulse() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: posts = [], isLoading } = useGetPulseFeed();
  const createPost = useCreatePulsePost();
  const deletePost = useDeletePulsePost();
  const reactMutation = useReactToPulsePost();
  const unreactMutation = useRemovePulseReaction();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetPulseFeedQueryKey() });

  const handleReact = (postId: number, type: ReactionType, myReaction: string | null) => {
    if (myReaction === type) {
      unreactMutation.mutate({ id: postId }, { onSuccess: invalidate });
    } else {
      reactMutation.mutate({ id: postId, data: { type } }, { onSuccess: invalidate });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this post?")) return;
    deletePost.mutate({ id }, { onSuccess: invalidate, onError: () => toast({ variant: "destructive", title: "Couldn't delete post" }) });
  };

  return (
    <div className="p-6 md:p-12 max-w-2xl mx-auto w-full space-y-8 animate-in fade-in duration-700 slide-in-from-bottom-4">
      {/* Header */}
      <header className="border-b border-border/50 pb-8 space-y-2">
        <h1 className="text-3xl md:text-4xl font-serif text-foreground flex items-center gap-3">
          <Zap className="w-8 h-8 text-primary" />
          What's Good Today
        </h1>
        <p className="text-muted-foreground font-subheading text-sm">
          Your private pulse — share a moment with your circle.
        </p>
      </header>

      {/* Composer */}
      <PostComposer onSuccess={invalidate} />

      {/* Feed */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-2xl bg-muted/30" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border/50 rounded-2xl bg-card/20">
          <Zap className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-serif text-foreground mb-1">Nothing yet</h3>
          <p className="text-sm text-muted-foreground font-subheading">Be the first to share something good today.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(posts as PulsePost[]).map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onReact={(type) => handleReact(post.id, type, post.myReaction ?? null)}
              onDelete={() => handleDelete(post.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PostComposer({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const createPost = useCreatePulsePost();

  const [text, setText] = useState("");
  const [isPersistent, setIsPersistent] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isSavingVoice, setIsSavingVoice] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{ type: PostType; objectPath: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { uploadFile } = useUpload({
    onSuccess: (res) => {
      setPendingMedia({ type: "photo", objectPath: res.objectPath });
      setIsUploading(false);
    },
    onError: () => {
      setIsUploading(false);
      toast({ variant: "destructive", title: "Upload failed" });
    },
  });

  const clearMedia = () => setPendingMedia(null);

  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start();
      recorderRef.current = mr;
      setIsRecordingVoice(true);
    } catch {
      toast({ variant: "destructive", title: "Microphone needed", description: "Allow microphone access to record." });
    }
  };

  const stopVoice = async () => {
    const mr = recorderRef.current;
    if (!mr) return;
    setIsSavingVoice(true);
    const blob = await new Promise<Blob>((resolve) => {
      mr.onstop = () => resolve(new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" }));
      mr.stop();
      mr.stream.getTracks().forEach((t) => t.stop());
    });
    recorderRef.current = null;
    setIsRecordingVoice(false);
    try {
      const ext = blob.type.includes("ogg") ? "ogg" : "webm";
      const name = `pulse-voice-${Date.now()}.${ext}`;
      const res = await requestUploadUrl({ name, size: blob.size, contentType: blob.type });
      await fetch(res.uploadURL, { method: "PUT", headers: { "Content-Type": blob.type }, body: blob });
      setPendingMedia({ type: "voice", objectPath: res.objectPath });
      toast({ title: "Voice note ready" });
    } catch {
      toast({ variant: "destructive", title: "Upload failed" });
    } finally {
      setIsSavingVoice(false);
    }
  };

  const canPost = !isUploading && !isRecordingVoice && !isSavingVoice &&
    (text.trim().length > 0 || pendingMedia !== null);

  const handlePost = () => {
    if (!canPost) return;
    const type: PostType = pendingMedia?.type ?? "text";
    createPost.mutate(
      {
        data: {
          type,
          content: text.trim() || undefined,
          mediaUrl: pendingMedia?.objectPath ?? undefined,
          isPersistent,
        },
      },
      {
        onSuccess: () => {
          setText("");
          setPendingMedia(null);
          setIsPersistent(false);
          onSuccess();
        },
        onError: () => toast({ variant: "destructive", title: "Couldn't post", description: "Please try again." }),
      },
    );
  };

  const busy = createPost.isPending || isUploading || isSavingVoice;

  return (
    <div className="bg-card/60 border border-border/60 rounded-2xl p-5 space-y-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's good today? Share a moment with your circle…"
        className="bg-background/60 border-border/50 resize-none min-h-[80px] text-sm font-subheading"
        maxLength={280}
        disabled={busy || isRecordingVoice}
      />
      {text.length > 200 && (
        <p className="text-xs text-right text-muted-foreground font-subheading">{280 - text.length} left</p>
      )}

      {pendingMedia && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-xl border border-border/50">
          {pendingMedia.type === "photo" ? <ImageIcon className="w-4 h-4 text-primary" /> : <Mic className="w-4 h-4 text-primary" />}
          <span className="text-xs font-subheading text-foreground flex-1">
            {pendingMedia.type === "photo" ? "Photo attached" : "Voice note attached"}
          </span>
          <button onClick={clearMedia} className="text-muted-foreground hover:text-destructive p-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {!pendingMedia && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]; if (!f) return;
                setIsUploading(true); uploadFile(f); e.target.value = "";
              }} />
            <Button type="button" variant="outline" size="sm" disabled={busy || isRecordingVoice}
              onClick={() => fileInputRef.current?.click()}
              className="border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40">
              {isUploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-1" />}
              Photo
            </Button>
            {!isRecordingVoice ? (
              <Button type="button" variant="outline" size="sm" disabled={busy}
                onClick={startVoice}
                className="border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40">
                {isSavingVoice ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Mic className="w-4 h-4 mr-1" />}
                {isSavingVoice ? "Saving…" : "Voice"}
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={stopVoice}
                className="border-destructive/60 text-destructive hover:bg-destructive/10 animate-pulse">
                <StopCircle className="w-4 h-4 mr-1" />
                Stop Recording
              </Button>
            )}
          </>
        )}

        <label className="flex items-center gap-2 text-xs font-subheading text-muted-foreground cursor-pointer ml-1">
          <input type="checkbox" checked={isPersistent} onChange={(e) => setIsPersistent(e.target.checked)} className="rounded border-border" />
          Keep forever
        </label>

        <Button
          onClick={handlePost}
          disabled={!canPost || busy}
          className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5 text-sm"
        >
          {createPost.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Share"}
        </Button>
      </div>
    </div>
  );
}

function PostCard({
  post,
  onReact,
  onDelete,
}: {
  post: PulsePost;
  onReact: (type: ReactionType) => void;
  onDelete: () => void;
}) {
  const [showReactors, setShowReactors] = useState(false);
  const totalReactions = Object.values(post.reactions).reduce((s, v) => s + v, 0);
  const expiry = expiryLabel(post.expiresAt ?? null, post.isPersistent);

  return (
    <div className={cn(
      "bg-card/60 border rounded-2xl overflow-hidden transition-all hover:border-border hover:bg-card/80",
      post.isOwn ? "border-primary/25" : "border-border/50",
    )}>
      <div className="p-5 space-y-3">
        {/* Author + time */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center font-serif text-sm text-primary shrink-0">
              {getInitials(post.authorName)}
            </div>
            <div>
              <p className="text-sm font-subheading font-medium text-foreground">{post.authorName}</p>
              <p className="text-[11px] font-subheading text-muted-foreground">{timeAgo(post.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {expiry && (
              <span className="flex items-center gap-1 text-[10px] font-subheading text-muted-foreground/70 border border-border/40 rounded-full px-2 py-0.5">
                <Clock className="w-2.5 h-2.5" />
                {expiry}
              </span>
            )}
            {post.isOwn && (
              <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {post.content && (
          <p className="text-sm font-subheading text-foreground/90 leading-relaxed whitespace-pre-wrap">{post.content}</p>
        )}
        {post.mediaUrl && post.type === "photo" && (
          <a href={`/api/storage${post.mediaUrl}`} target="_blank" rel="noopener noreferrer"
            className="block rounded-xl overflow-hidden border border-border/40 bg-muted/30">
            <img src={`/api/storage${post.mediaUrl}`} alt="Post photo" className="w-full max-h-64 object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </a>
        )}
        {post.mediaUrl && post.type === "voice" && (
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/40">
            <Mic className="w-4 h-4 text-primary shrink-0" />
            <audio controls src={`/api/storage${post.mediaUrl}`} className="flex-1 h-8" />
          </div>
        )}

        {/* Reactions */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            {REACTIONS.map(({ type, emoji }) => {
              const count = post.reactions[type] ?? 0;
              const isActive = post.myReaction === type;
              return (
                <button
                  key={type}
                  onClick={() => onReact(type)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-subheading border transition-all",
                    isActive
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "border-border/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  <span>{emoji}</span>
                  {count > 0 && <span>{count}</span>}
                </button>
              );
            })}
          </div>

          {post.isOwn && totalReactions > 0 && (
            <button
              onClick={() => setShowReactors(!showReactors)}
              className="text-xs font-subheading text-muted-foreground hover:text-primary transition-colors"
            >
              {totalReactions} reaction{totalReactions !== 1 ? "s" : ""}
            </button>
          )}
        </div>

        {/* Reactor details (own posts only) */}
        {showReactors && post.isOwn && post.reactorNames && post.reactorNames.length > 0 && (
          <div className="border-t border-border/40 pt-3 space-y-1.5">
            {post.reactorNames.map((r, i) => {
              const meta = REACTIONS.find((rx) => rx.type === r.type);
              return (
                <div key={i} className="flex items-center gap-2 text-xs font-subheading text-muted-foreground">
                  <span>{meta?.emoji}</span>
                  <span className="text-foreground/80">{r.name}</span>
                  <span>{meta?.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
