import { useState } from "react";
import {
  useGetDashboard,
  useUpdateIntention,
  useCreateIntention,
  useGetTodayGratitudeEntry,
  getGetDashboardQueryKey,
} from "@workspace/api-client-react";
import type { Intention } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CheckCircle2, Circle, MessageSquare, Shield, Heart,
  Flame, Sparkles, Sunrise, Loader2, ArrowRight,
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
  const [drafts, setDrafts] = useState<string[]>(["", "", ""]);

  const sorted = [...intentions].sort((a, b) => a.order - b.order);
  const total = sorted.length;
  const completed = sorted.filter((i) => i.isCompleted).length;
  const allDone = total > 0 && completed === total;

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
  }

  async function handleSet(e: React.FormEvent) {
    e.preventDefault();
    const filled = drafts
      .map((text, order) => ({ text: text.trim(), order }))
      .filter((d) => d.text.length > 0);
    if (filled.length === 0) return;
    try {
      await Promise.all(
        filled.map((d) => createIntention.mutateAsync({ data: { text: d.text, order: d.order } }))
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

  const StreakBadge = () =>
    streak > 0 ? (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25">
        <Flame className="w-4 h-4 text-primary" />
        <span className="text-sm font-subheading text-primary">
          {streak} day{streak === 1 ? "" : "s"}
        </span>
      </div>
    ) : null;

  // ---- Empty state: set today's intentions ----
  if (total === 0) {
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
              <h2 className="text-2xl font-serif text-foreground">Set Your 3 Intentions</h2>
            </div>
          </div>
          <StreakBadge />
        </div>
        <p className="text-muted-foreground font-subheading text-sm mb-6 max-w-lg">
          What are the three things that matter most today? Name them, then move through your day with purpose.
        </p>

        <form onSubmit={handleSet} className="space-y-3">
          {drafts.map((value, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-7 h-7 shrink-0 rounded-full border border-primary/30 text-primary/70 flex items-center justify-center font-serif text-sm">
                {i + 1}
              </span>
              <input
                value={value}
                onChange={(e) => setDrafts((d) => d.map((v, idx) => (idx === i ? e.target.value : v)))}
                placeholder={
                  i === 0 ? "e.g. Call Mom and really listen" : i === 1 ? "e.g. Ship the intentions feature" : "e.g. Move my body for 30 minutes"
                }
                className="flex-1 bg-background/60 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          ))}
          <div className="pt-2">
            <button
              type="submit"
              disabled={createIntention.isPending || drafts.every((d) => !d.trim())}
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
          {sorted.map((intention) => (
            <button
              key={intention.id}
              onClick={() => toggle(intention)}
              className="flex items-start gap-3 w-full text-left group rounded-xl p-3 hover:bg-muted/30 transition-colors"
            >
              <div className={cn("mt-0.5 transition-colors", intention.isCompleted ? "text-primary" : "text-muted-foreground group-hover:text-primary/70")}>
                {intention.isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
              </div>
              <span className={cn("text-base transition-all", intention.isCompleted ? "text-muted-foreground line-through" : "text-foreground")}>
                {intention.text}
              </span>
            </button>
          ))}

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
