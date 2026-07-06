import { useState } from "react";
import {
  useGetDashboard,
  useUpdateIntention,
  useCreateIntention,
  useDeleteIntention,
  useGetTodayGratitudeEntry,
  useGetIntentionHistory,
  getGetDashboardQueryKey,
} from "@workspace/api-client-react";
import type { Intention } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CheckCircle2, Circle, MessageSquare, Shield, Heart,
  Flame, Sparkles, Sunrise, Loader2, ArrowRight, Check,
  Pencil, Trash2, X, Trophy,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export default function Home() {
  const { data: dashboard, isLoading } = useGetDashboard();
  const { data: todayEntry } = useGetTodayGratitudeEntry();

  if (isLoading) {
    return (
      <div className="p-6 md:p-12 max-w-5xl mx-auto w-full space-y-12">
        <div className="space-y-4">
          <Skeleton className="h-12 w-64 bg-muted/50" />
          <Skeleton className="h-6 w-48 bg-muted/50" />
        </div>
        <Skeleton className="h-56 w-full rounded-2xl bg-muted/30" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48 rounded-xl bg-muted/30" />
          <Skeleton className="h-48 rounded-xl bg-muted/30" />
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto w-full space-y-14 animate-in fade-in duration-700 slide-in-from-bottom-4">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-4xl md:text-5xl tracking-tight text-foreground">
          Good Morning, <span className="text-primary">{dashboard.userName || "James"}</span>.
        </h1>
        <p className="text-muted-foreground font-subheading text-lg">
          {format(new Date(), "EEEE, MMMM do")}
        </p>
      </header>

      {/* Daily Intentions — the 333 Method, front and center */}
      <DailyIntentions
        intentions={dashboard.todayIntentions ?? []}
        streak={dashboard.intentionsStreak ?? 0}
      />

      {/* Intention streak history & best run */}
      <IntentionStreakHistory />

      {/* Affirmation Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/30 p-8 md:p-12 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
        <div className="relative z-10 max-w-3xl">
          <p className="text-sm font-subheading tracking-widest text-primary uppercase mb-6">Today's Truth</p>
          <blockquote className="text-2xl md:text-4xl leading-relaxed text-foreground/90 font-serif italic">
            "Your private space. Secure. Encrypted. Yours."
          </blockquote>
        </div>
      </section>

      {/* Today's Gratitude Widget */}
      <section>
        {todayEntry ? (
          <div className="bg-card/40 border border-primary/20 p-6 rounded-2xl backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -z-10" />
            <div className="flex items-center gap-2 text-primary mb-4">
              <Heart className="w-4 h-4 fill-primary/20" />
              <h2 className="font-serif text-lg">Today's Gratitude</h2>
            </div>
            <ul className="space-y-2">
              <li className="flex gap-3"><span className="text-primary/50 font-serif">1.</span><span className="text-foreground/90">{todayEntry.item1}</span></li>
              {todayEntry.item2 && <li className="flex gap-3"><span className="text-primary/50 font-serif">2.</span><span className="text-foreground/90">{todayEntry.item2}</span></li>}
              {todayEntry.item3 && <li className="flex gap-3"><span className="text-primary/50 font-serif">3.</span><span className="text-foreground/90">{todayEntry.item3}</span></li>}
            </ul>
            <Link href="/gratitude" className="absolute inset-0 z-10 block opacity-0"><span className="sr-only">View Gratitude</span></Link>
          </div>
        ) : (
          <div className="bg-card/20 border border-dashed border-border/50 p-6 rounded-2xl text-center">
            <Heart className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm mb-3">You haven't logged gratitude today.</p>
            <Link href="/gratitude" className="text-primary text-sm font-medium hover:underline inline-flex items-center gap-1">
              Log Today's Gratitude
            </Link>
          </div>
        )}
      </section>

      {/* Growth + Horizons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Growth & Habits */}
        <div className="space-y-6">
          <h2 className="text-xl font-serif flex items-center gap-2 border-b border-border/50 pb-4">
            <span className="w-2 h-2 rounded-full bg-secondary" />
            Growth
          </h2>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2 font-subheading text-muted-foreground">
                <span>Daily Completion</span>
                <span className="text-secondary">{dashboard.habitCompletionToday}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-secondary transition-all duration-1000 ease-out rounded-full"
                  style={{ width: `${dashboard.habitCompletionToday}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card/50 border border-border/50 rounded-xl p-4 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-subheading">Streak</span>
                <span className="text-2xl font-serif text-foreground">{dashboard.streakDays} <span className="text-sm font-sans text-muted-foreground">days</span></span>
              </div>
              <div className="bg-card/50 border border-border/50 rounded-xl p-4 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-subheading">Active Goals</span>
                <span className="text-2xl font-serif text-foreground">{dashboard.goalsActive}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule & Future */}
        <div className="space-y-6">
          <h2 className="text-xl font-serif flex items-center gap-2 border-b border-border/50 pb-4">
            <span className="w-2 h-2 rounded-full bg-accent" />
            Horizons
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-4 bg-card/50 border border-border/50 p-4 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{dashboard.upcomingMessages.length} Messages</p>
                <p className="text-xs text-muted-foreground">Waiting to be unlocked</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-card/50 border border-border/50 p-4 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{dashboard.vaultCount} Vault Items</p>
                <p className="text-xs text-muted-foreground">Secured and encrypted</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntentionStreakHistory() {
  const { data, isLoading } = useGetIntentionHistory();

  if (isLoading) {
    return <Skeleton className="h-56 w-full rounded-2xl bg-muted/30" />;
  }
  if (!data) return null;

  const completedSet = new Set(data.completedDays);
  const hasHistory = data.completedDays.length > 0;

  // Build a GitHub-style grid of the last 18 weeks, columns = weeks (Sun→Sat).
  const WEEKS = 18;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = format(today, "yyyy-MM-dd");

  const end = new Date(today);
  end.setDate(end.getDate() + (6 - end.getDay())); // Saturday of this week
  const start = new Date(end);
  start.setDate(start.getDate() - (WEEKS * 7 - 1));

  const columns: Date[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < WEEKS; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    columns.push(week);
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card/40 p-7 md:p-9 backdrop-blur-sm">
      <div className="absolute top-0 right-0 w-56 h-56 bg-primary/10 rounded-bl-[120px] -z-10 blur-2xl" />

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-subheading tracking-widest text-primary uppercase">Your Legacy, One Day at a Time</p>
            <h2 className="text-2xl font-serif text-foreground">Intention Streak</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8 max-w-sm">
        <div className="bg-card/50 border border-border/50 rounded-xl p-4 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-subheading">Current</span>
          <span className="text-2xl font-serif text-foreground flex items-baseline gap-1.5">
            {data.currentStreak}
            <span className="text-sm font-sans text-muted-foreground">day{data.currentStreak === 1 ? "" : "s"}</span>
          </span>
        </div>
        <div className="bg-primary/[0.06] border border-primary/25 rounded-xl p-4 flex flex-col gap-1">
          <span className="text-xs text-primary/80 uppercase tracking-wider font-subheading flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" /> Best Run
          </span>
          <span className="text-2xl font-serif text-foreground flex items-baseline gap-1.5">
            {data.longestStreak}
            <span className="text-sm font-sans text-muted-foreground">day{data.longestStreak === 1 ? "" : "s"}</span>
          </span>
        </div>
      </div>

      {hasHistory ? (
        <div className="space-y-3">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {columns.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const isFuture = key > todayKey;
                  const isComplete = completedSet.has(key);
                  const isToday = key === todayKey;
                  return (
                    <div
                      key={key}
                      title={`${format(day, "MMM d, yyyy")}${isComplete ? " — all 3 complete" : isFuture ? "" : " — not completed"}`}
                      className={cn(
                        "w-3.5 h-3.5 rounded-[3px] transition-colors",
                        isFuture
                          ? "bg-transparent"
                          : isComplete
                            ? "bg-primary"
                            : "bg-muted/40",
                        isToday && "ring-1 ring-primary/60 ring-offset-1 ring-offset-background",
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-subheading">
            <span>Less</span>
            <span className="w-3 h-3 rounded-[3px] bg-muted/40" />
            <span className="w-3 h-3 rounded-[3px] bg-primary/40" />
            <span className="w-3 h-3 rounded-[3px] bg-primary" />
            <span>More</span>
            <span className="ml-auto">Each filled square is a day you completed all three intentions.</span>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-border/50 rounded-xl bg-card/20 p-6 text-center">
          <Sparkles className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">
            Complete all three intentions in a day to begin your streak history.
          </p>
        </div>
      )}
    </section>
  );
}

function CompletionRing({ completed, total }: { completed: number; total: number }) {
  const size = 116;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circumference = r * 2 * Math.PI;
  const progress = total > 0 ? completed / total : 0;
  const offset = circumference - progress * circumference;
  const allDone = total > 0 && completed === total;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          className="text-muted/40"
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          r={r}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={cn("transition-all duration-700 ease-out", allDone ? "text-primary" : "text-primary/80")}
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset: offset }}
          r={r}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {allDone ? (
          <Sparkles className="w-9 h-9 text-primary" />
        ) : (
          <span className="text-3xl font-serif text-foreground leading-none">
            {completed}
            <span className="text-lg text-muted-foreground">/{total}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function DailyIntentions({ intentions, streak }: { intentions: Intention[]; streak: number }) {
  const qc = useQueryClient();
  const createIntention = useCreateIntention();
  const updateIntention = useUpdateIntention();
  const deleteIntention = useDeleteIntention();
  const [drafts, setDrafts] = useState<string[]>(["", "", ""]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const sorted = [...intentions].sort((a, b) => a.order - b.order);
  const total = sorted.length;
  const completed = sorted.filter((i) => i.isCompleted).length;
  // The 333 Method requires all three intentions to be set for the day.
  const isSet = total >= 3;
  const allDone = isSet && completed === total;

  // Orders (0..2) not yet taken by an existing intention — the slots left to fill.
  const usedOrders = new Set(sorted.map((i) => i.order));
  const freeOrders = [0, 1, 2].filter((o) => !usedOrders.has(o));
  const missingCount = freeOrders.length;

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
  }

  async function handleSet(e: React.FormEvent) {
    e.preventDefault();
    const toCreate = freeOrders
      .map((order, idx) => ({ order, text: (drafts[idx] ?? "").trim() }))
      .filter((d) => d.text.length > 0);
    // Enforce the full set: only save once every remaining slot is filled.
    if (toCreate.length < missingCount) return;
    try {
      await Promise.all(
        toCreate.map((d) => createIntention.mutateAsync({ data: { text: d.text, order: d.order } }))
      );
      setDrafts(["", "", ""]);
    } finally {
      invalidate();
    }
  }

  function toggle(intention: Intention) {
    updateIntention.mutate(
      { id: intention.id, data: { isCompleted: !intention.isCompleted } },
      { onSuccess: invalidate }
    );
  }

  function startEdit(intention: Intention) {
    setEditingId(intention.id);
    setEditText(intention.text);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  function saveEdit(intention: Intention) {
    const text = editText.trim();
    if (text.length === 0 || text === intention.text) {
      cancelEdit();
      return;
    }
    updateIntention.mutate(
      { id: intention.id, data: { text } },
      {
        onSuccess: () => {
          invalidate();
          cancelEdit();
        },
      }
    );
  }

  function remove(intention: Intention) {
    deleteIntention.mutate(
      { id: intention.id },
      {
        onSuccess: () => {
          invalidate();
          if (editingId === intention.id) cancelEdit();
          setConfirmingId((id) => (id === intention.id ? null : id));
        },
      }
    );
  }

  const StreakBadge = () =>
    streak > 0 ? (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25">
        <Flame className="w-4 h-4 text-primary" />
        <span className="text-sm font-subheading text-primary">
          {streak} day{streak === 1 ? "" : "s"}
        </span>
      </div>
    ) : null;

  // ---- Setup state: the full set of three isn't in place yet ----
  if (!isSet) {
    const canSave =
      !createIntention.isPending &&
      drafts.slice(0, missingCount).every((d) => d.trim().length > 0);
    const placeholders = [
      "e.g. Call Mom and really listen",
      "e.g. Finish the proposal draft",
      "e.g. Move my body for 30 minutes",
    ];
    return (
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card/40 p-7 md:p-9 backdrop-blur-sm">
        <div className="absolute top-0 right-0 w-56 h-56 bg-primary/10 rounded-bl-[120px] -z-10 blur-2xl" />
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary">
              <Sunrise className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-subheading tracking-widest text-primary uppercase">The 333 Method</p>
              <h2 className="text-2xl font-serif text-foreground">
                {total === 0 ? "Set Your 3 Intentions" : "Finish Your 3 Intentions"}
              </h2>
            </div>
          </div>
          <StreakBadge />
        </div>
        <p className="text-muted-foreground font-subheading text-sm mb-6 max-w-lg">
          {total === 0
            ? "What are the three things that matter most today? Name all three, then move through your day with purpose."
            : `You've named ${total} of 3 — add the ${missingCount === 1 ? "last one" : "rest"} to begin your day.`}
        </p>

        <form onSubmit={handleSet} className="space-y-3">
          {[0, 1, 2].map((slot) => {
            const existing = sorted[slot];
            if (existing) {
              return (
                <div key={existing.id} className="flex items-center gap-3">
                  <span className="w-7 h-7 shrink-0 rounded-full bg-primary/15 border border-primary/30 text-primary flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </span>
                  <div className="flex-1 rounded-lg px-4 py-2.5 text-sm text-foreground bg-primary/[0.04] border border-primary/15">
                    {existing.text}
                  </div>
                </div>
              );
            }
            const draftIdx = slot - total;
            return (
              <div key={slot} className="flex items-center gap-3">
                <span className="w-7 h-7 shrink-0 rounded-full border border-primary/30 text-primary/70 flex items-center justify-center font-serif text-sm">
                  {slot + 1}
                </span>
                <input
                  value={drafts[draftIdx] ?? ""}
                  onChange={(e) =>
                    setDrafts((d) => d.map((v, idx) => (idx === draftIdx ? e.target.value : v)))
                  }
                  placeholder={placeholders[slot]}
                  className="flex-1 bg-background/60 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            );
          })}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!canSave}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground font-subheading text-sm rounded-full px-6 py-2.5 transition-colors"
            >
              {createIntention.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Setting...</>
              ) : (
                <>Set My Intentions <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </form>
      </section>
    );
  }

  // ---- Active state: track today's intentions ----
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border p-7 md:p-9 backdrop-blur-sm transition-colors",
        allDone ? "border-primary/40 bg-primary/[0.06]" : "border-primary/20 bg-card/40"
      )}
    >
      <div className="absolute top-0 right-0 w-56 h-56 bg-primary/10 rounded-bl-[120px] -z-10 blur-2xl" />

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary">
            <Sunrise className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-subheading tracking-widest text-primary uppercase">The 333 Method</p>
            <h2 className="text-2xl font-serif text-foreground">Today's Intentions</h2>
          </div>
        </div>
        <StreakBadge />
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <CompletionRing completed={completed} total={total} />
          <p className="text-xs font-subheading text-muted-foreground uppercase tracking-wider">
            {allDone ? "All complete" : `${completed} of ${total} done`}
          </p>
        </div>

        <div className="flex-1 w-full space-y-2">
          {sorted.map((intention) => {
            const isEditing = editingId === intention.id;
            const isBusy =
              (updateIntention.isPending && updateIntention.variables?.id === intention.id) ||
              (deleteIntention.isPending && deleteIntention.variables?.id === intention.id);

            if (isEditing) {
              return (
                <div key={intention.id} className="flex items-center gap-3 rounded-xl p-3 bg-muted/20">
                  <div className="mt-0.5 text-primary/70 shrink-0">
                    <Circle className="w-5 h-5" />
                  </div>
                  <input
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(intention);
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="flex-1 bg-background/60 border border-primary/40 rounded-lg px-3 py-2 text-base text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                  <button
                    onClick={() => saveEdit(intention)}
                    disabled={isBusy}
                    aria-label="Save intention"
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-primary/15 disabled:opacity-40 transition-colors"
                  >
                    {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={cancelEdit}
                    aria-label="Cancel edit"
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/40 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={intention.id}
                className="flex items-start gap-3 w-full group rounded-xl p-3 hover:bg-muted/30 transition-colors"
              >
                <button
                  onClick={() => toggle(intention)}
                  className="flex items-start gap-3 flex-1 text-left"
                >
                  <div className={cn("mt-0.5 transition-colors", intention.isCompleted ? "text-primary" : "text-muted-foreground group-hover:text-primary/70")}>
                    {intention.isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </div>
                  <span className={cn("text-base transition-all", intention.isCompleted ? "text-muted-foreground line-through" : "text-foreground")}>
                    {intention.text}
                  </span>
                </button>
                {confirmingId === intention.id ? (
                  <div className="flex items-center gap-2 shrink-0" role="group" aria-label="Confirm removal">
                    <span className="hidden sm:inline text-xs font-subheading text-muted-foreground">Remove?</span>
                    <button
                      onClick={() => remove(intention)}
                      disabled={isBusy}
                      autoFocus
                      aria-label="Confirm remove intention"
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-full text-xs font-subheading bg-destructive/15 text-destructive hover:bg-destructive/25 disabled:opacity-40 transition-colors"
                    >
                      {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmingId(null)}
                      disabled={isBusy}
                      aria-label="Cancel remove intention"
                      className="inline-flex items-center h-8 px-3 rounded-full text-xs font-subheading text-muted-foreground hover:bg-muted/40 disabled:opacity-40 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(intention)}
                      disabled={isBusy}
                      aria-label="Edit intention"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-40 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmingId(intention.id)}
                      disabled={isBusy}
                      aria-label="Remove intention"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-40 transition-colors"
                    >
                      {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {allDone && (
            <div className="flex items-center gap-2 pt-3 mt-1 border-t border-primary/15 text-primary">
              <Sparkles className="w-4 h-4" />
              <p className="font-serif italic text-sm">
                All three, complete. That's how legacies get built — one day at a time.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
