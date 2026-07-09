import { useMemo, useState } from "react";
import {
  useGetMe,
  useGetMyFeedback,
  useCreateFeedback,
  useGetAllFeedback,
  useUpdateFeedback,
  getGetMyFeedbackQueryKey,
  getGetAllFeedbackQueryKey,
} from "@workspace/api-client-react";
import type { AdminFeedbackItem, FeedbackItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  MessageSquarePlus,
  Bug,
  Lightbulb,
  Wrench,
  Inbox,
  ClipboardList,
  Loader2,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type FeedbackType = FeedbackItem["type"];
type FeedbackStatus = FeedbackItem["status"];

const TYPE_OPTIONS: Array<{ value: FeedbackType; label: string; icon: typeof Bug }> = [
  { value: "feature", label: "New idea", icon: Lightbulb },
  { value: "improvement", label: "Improvement", icon: Wrench },
  { value: "bug", label: "Bug report", icon: Bug },
];

const APP_AREAS = [
  "Home", "Tasks", "Future", "Vault", "Growth", "Gratitude", "People",
  "Legacy Letters", "Workouts", "Voice Memos", "Shop", "Community",
  "Calendar", "Profile", "Mobile app", "Other",
];

const STATUS_META: Record<FeedbackStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-secondary/15 text-secondary border-secondary/30" },
  planned: { label: "Planned", className: "bg-primary/15 text-primary border-primary/30" },
  done: { label: "Done", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  declined: { label: "Not planned", className: "bg-muted text-muted-foreground border-border" },
};

function StatusChip({ status }: { status: FeedbackStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-subheading uppercase tracking-wider", meta.className)}>
      {meta.label}
    </span>
  );
}

function TypeBadge({ type }: { type: FeedbackType }) {
  const opt = TYPE_OPTIONS.find((o) => o.value === type)!;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-subheading uppercase tracking-wider">
      <opt.icon className="w-3.5 h-3.5" />
      {opt.label}
    </span>
  );
}

function SubmitForm() {
  const createFeedback = useCreateFeedback();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [type, setType] = useState<FeedbackType>("feature");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [appArea, setAppArea] = useState("");

  const canSubmit = title.trim().length > 0 && details.trim().length > 0 && !createFeedback.isPending;

  const handleSubmit = () => {
    createFeedback.mutate(
      { data: { type, title: title.trim(), details: details.trim(), ...(appArea ? { appArea } : {}) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyFeedbackQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAllFeedbackQueryKey() });
          setTitle("");
          setDetails("");
          setAppArea("");
          toast({ title: "Thank you", description: "Your feedback is in the queue for the next monthly review." });
        },
        onError: () => toast({ variant: "destructive", title: "Couldn't submit", description: "Please try again." }),
      },
    );
  };

  return (
    <div className="bg-card/40 border border-border/50 rounded-2xl p-6 space-y-5 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <MessageSquarePlus className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-serif text-foreground">Share your thoughts</h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setType(opt.value)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-subheading transition-colors",
              type === opt.value
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border/50 bg-background/40 text-muted-foreground hover:text-foreground",
            )}
          >
            <opt.icon className="w-4 h-4" />
            {opt.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-subheading uppercase tracking-wider text-muted-foreground">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder={type === "bug" ? "What went wrong?" : "What would make 333 Lives better?"}
          className="bg-background border-border/50"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-subheading uppercase tracking-wider text-muted-foreground">Details</label>
        <Textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={5000}
          placeholder={
            type === "bug"
              ? "What did you do, what did you expect, and what happened instead?"
              : "Describe the idea and why it matters to you."
          }
          className="bg-background border-border/50 resize-none h-28"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-subheading uppercase tracking-wider text-muted-foreground">
          Area of the app <span className="normal-case text-muted-foreground/60">(optional)</span>
        </label>
        <select
          value={appArea}
          onChange={(e) => setAppArea(e.target.value)}
          className="w-full h-10 px-3 rounded-md bg-background border border-border/50 text-sm text-foreground"
        >
          <option value="">Choose an area…</option>
          {APP_AREAS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <Button onClick={handleSubmit} disabled={!canSubmit} className="bg-primary text-primary-foreground hover:bg-primary/90">
        {createFeedback.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Submit feedback
      </Button>
    </div>
  );
}

function MyFeedbackList() {
  const { data: items, isLoading } = useGetMyFeedback();

  if (isLoading) {
    return <Skeleton className="h-40 w-full rounded-2xl bg-muted/30" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Inbox className="w-5 h-5 text-secondary" />
        <h2 className="text-xl font-serif text-foreground">My feedback</h2>
      </div>
      {!items || items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Nothing yet. Anything you submit shows up here with its status.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-card/30 border border-border/50 rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-foreground font-medium truncate">{item.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <TypeBadge type={item.type} />
                    {item.appArea && <span className="text-xs text-muted-foreground">{item.appArea}</span>}
                  </div>
                </div>
                <StatusChip status={item.status} />
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{item.details}</p>
              <p className="text-[11px] text-muted-foreground/60">
                Submitted {new Date(item.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminQueueRow({ item }: { item: AdminFeedbackItem }) {
  const updateFeedback = useUpdateFeedback();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [noteDraft, setNoteDraft] = useState<string | null>(null);

  const save = (data: { status?: FeedbackStatus; adminNote?: string | null }) => {
    updateFeedback.mutate(
      { id: item.id, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAllFeedbackQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMyFeedbackQueryKey() });
        },
        onError: () => toast({ variant: "destructive", title: "Couldn't update", description: "Please try again." }),
      },
    );
  };

  return (
    <div className="bg-card/30 border border-border/50 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-foreground font-medium">{item.title}</p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <TypeBadge type={item.type} />
            {item.appArea && <span className="text-xs text-muted-foreground">{item.appArea}</span>}
            <span className="text-xs text-muted-foreground/70">
              from {item.submitterName ?? "Unknown"}
            </span>
          </div>
        </div>
        <select
          value={item.status}
          onChange={(e) => save({ status: e.target.value as FeedbackStatus })}
          disabled={updateFeedback.isPending}
          className="h-8 px-2 rounded-md bg-background border border-border/50 text-xs text-foreground"
        >
          {(Object.keys(STATUS_META) as FeedbackStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
      </div>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.details}</p>
      <p className="text-[11px] text-muted-foreground/60">
        Submitted {new Date(item.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
      </p>

      {noteDraft === null ? (
        <button
          onClick={() => setNoteDraft(item.adminNote ?? "")}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-subheading"
        >
          <StickyNote className="w-3.5 h-3.5" />
          {item.adminNote ? "Edit private note" : "Add private note"}
        </button>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            maxLength={5000}
            placeholder="Private note — only you can see this."
            className="bg-background border-border/50 resize-none h-20 text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setNoteDraft(null)}>Cancel</Button>
            <Button
              size="sm"
              disabled={updateFeedback.isPending}
              onClick={() => {
                const trimmed = noteDraft.trim();
                save({ adminNote: trimmed.length > 0 ? trimmed : null });
                setNoteDraft(null);
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Save note
            </Button>
          </div>
        </div>
      )}
      {noteDraft === null && item.adminNote && (
        <p className="text-xs text-foreground/70 bg-primary/5 border border-primary/20 rounded-lg p-3 whitespace-pre-wrap">
          {item.adminNote}
        </p>
      )}
    </div>
  );
}

function AdminQueue() {
  const { data: items, isLoading } = useGetAllFeedback();
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<FeedbackType | "all">("all");

  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter(
      (i) => (statusFilter === "all" || i.status === statusFilter) && (typeFilter === "all" || i.type === typeFilter),
    );
  }, [items, statusFilter, typeFilter]);

  const newCount = items?.filter((i) => i.status === "new").length ?? 0;

  return (
    <div className="space-y-4 border-t border-border/50 pt-10" data-testid="triage-queue">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-serif text-foreground">Triage queue</h2>
          {newCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/30 text-[11px] font-subheading">
              {newCount} new
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FeedbackStatus | "all")}
            className="h-8 px-2 rounded-md bg-background border border-border/50 text-xs text-foreground"
          >
            <option value="all">All statuses</option>
            {(Object.keys(STATUS_META) as FeedbackStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as FeedbackType | "all")}
            className="h-8 px-2 rounded-md bg-background border border-border/50 text-xs text-foreground"
          >
            <option value="all">All types</option>
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Everything members have sent in, for your end-of-month update pass.
      </p>
      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl bg-muted/30" />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No feedback matches these filters.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <AdminQueueRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Feedback() {
  const { data: me } = useGetMe();

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto w-full space-y-10 animate-in fade-in duration-700 slide-in-from-bottom-4">
      <header className="space-y-2 border-b border-border/50 pb-8">
        <h1 className="text-3xl md:text-4xl font-serif text-foreground">Feedback</h1>
        <p className="text-muted-foreground font-subheading text-base">
          Ideas and bug reports go straight into the monthly review — updates land at the end of each month.
        </p>
      </header>

      <SubmitForm />
      <MyFeedbackList />
      {me?.isOwner && <AdminQueue />}
    </div>
  );
}
