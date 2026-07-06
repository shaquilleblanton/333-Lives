import { useState, useEffect, useRef } from "react";
import {
  useGetDashboard,
  useUpdateIntention,
  useCreateIntention,
  useDeleteIntention,
  useGetTodayGratitudeEntry,
  useGetIntentionHistory,
  useGetIntentions,
  useGetTodayAffirmation,
  useGetTasks,
  getGetDashboardQueryKey,
  getGetIntentionHistoryQueryKey,
  getGetIntentionsQueryKey,
} from "@workspace/api-client-react";
import type { Intention } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  CheckCircle2, Circle, MessageSquare, Shield, Heart,
  Flame, Sparkles, Sunrise, Loader2, ArrowRight, Check,
  Pencil, Trash2, X, Trophy, ListChecks, AlertTriangle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export default function Home() {
  const { data: dashboard, isLoading } = useGetDashboard();
  const { data: todayEntry } = useGetTodayGratitudeEntry();
  const { data: todayAffirmation } = useGetTodayAffirmation();

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
          Good Day{dashboard.userName ? <>, <span className="text-primary">{dashboard.userName}</span></> : null}.
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

      {/* Today's responsibilities at a glance */}
      <TasksSummary />

      {/* Intention streak history & best run */}
      <IntentionStreakHistory />

      {/* Affirmation Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/30 p-8 md:p-12 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
        <div className="relative z-10 max-w-3xl">
          <p className="text-sm font-subheading tracking-widest text-primary uppercase mb-6">Today's Truth</p>
          <blockquote className="text-2xl md:text-4xl leading-relaxed text-foreground/90 font-serif italic">
            &ldquo;{todayAffirmation?.text ?? "You are building a life worth remembering — one intention at a time."}&rdquo;
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

function TasksSummary() {
  const { data: tasks, isLoading } = useGetTasks();

  if (isLoading) {
    return <Skeleton className="h-28 w-full rounded-2xl bg-muted/30" />;
  }

  const all = tasks ?? [];
  const active = all.filter((t) => !t.isCompleted);
  const tk = format(new Date(), "yyyy-MM-dd");
  const overdue = active.filter((t) => t.dueDate && t.dueDate < tk).length;
  const dueToday = active.filter((t) => t.dueDate === tk).length;
  const nextUp = active
    .filter((t) => t.dueDate && t.dueDate >= tk)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))[0]
    ?? active[0];

  return (
    <Link
      href="/tasks"
      className="block relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 p-6 md:p-7 backdrop-blur-sm group hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary">
            <ListChecks className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-subheading tracking-widest text-primary uppercase">Responsibilities</p>
            <h2 className="text-2xl font-serif text-foreground">Today&apos;s Tasks</h2>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>

      {active.length === 0 ? (
        <p className="text-muted-foreground font-subheading text-sm mt-4">
          Nothing on your plate — capture what needs doing so it never slips.
        </p>
      ) : (
        <div className="flex items-center gap-6 mt-5 flex-wrap">
          {overdue > 0 && (
            <div className="flex items-center gap-2 text-rose-300">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-serif text-2xl">{overdue}</span>
              <span className="text-xs font-subheading uppercase tracking-wider text-muted-foreground">Overdue</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-primary">
            <span className="font-serif text-2xl">{dueToday}</span>
            <span className="text-xs font-subheading uppercase tracking-wider text-muted-foreground">Due today</span>
          </div>
          <div className="flex items-center gap-2 text-foreground">
            <span className="font-serif text-2xl">{active.length}</span>
            <span className="text-xs font-subheading uppercase tracking-wider text-muted-foreground">Open</span>
          </div>
          {nextUp && (
            <div className="ml-auto text-right max-w-[45%] hidden sm:block">
              <p className="text-[10px] font-subheading uppercase tracking-wider text-muted-foreground">Next up</p>
              <p className="text-sm text-foreground/90 truncate">{nextUp.title}</p>
            </div>
          )}
        </div>
      )}
    </Link>
  );
}

const RECORD_CELEBRATED_KEY = "333:intentionRecordCelebrated";

const CONFETTI_COLORS = ["#BB734A", "#8FA67A", "#C8B57C", "#F7F4EF"];

function RecordConfetti() {
  const pieces = useRef(
    Array.from({ length: 44 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.35,
      duration: 1.9 + Math.random() * 1.1,
      rotate: (Math.random() - 0.5) * 720,
      size: 6 + Math.random() * 6,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      round: Math.random() > 0.6,
    })),
  ).current;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -40, opacity: 0, rotate: 0 }}
          animate={{ y: "105vh", opacity: [0, 1, 1, 0.9, 0], rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
          style={{
            position: "absolute",
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 0.5,
            backgroundColor: p.color,
            borderRadius: p.round ? "9999px" : "2px",
          }}
        />
      ))}
    </div>
  );
}

function IntentionStreakHistory() {
  const { data, isLoading } = useGetIntentionHistory();
  const { toast } = useToast();
  const [celebrating, setCelebrating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [recordValue, setRecordValue] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (!showConfetti) return;
    const t = window.setTimeout(() => setShowConfetti(false), 3500);
    return () => window.clearTimeout(t);
  }, [showConfetti]);

  useEffect(() => {
    if (!data) return;
    const { currentStreak, longestStreak } = data;

    let lastCelebrated: number | null = null;
    try {
      const stored = window.localStorage.getItem(RECORD_CELEBRATED_KEY);
      lastCelebrated = stored === null ? null : Number(stored);
    } catch {
      lastCelebrated = null;
    }

    // First observation on this device: record the current best as the baseline
    // so we never celebrate a record the user set before this moment.
    if (lastCelebrated === null || Number.isNaN(lastCelebrated)) {
      try {
        window.localStorage.setItem(RECORD_CELEBRATED_KEY, String(longestStreak));
      } catch {
        /* ignore storage failures */
      }
      return;
    }

    // The current run is the all-time best when it equals the longest streak.
    // Celebrate only when that best value has grown beyond what we last cheered
    // for — i.e. the transition to a new record, not every completion or reload.
    const isRecordRun = currentStreak > 0 && currentStreak === longestStreak;
    if (isRecordRun && currentStreak > lastCelebrated) {
      try {
        window.localStorage.setItem(RECORD_CELEBRATED_KEY, String(currentStreak));
      } catch {
        /* ignore storage failures */
      }
      setRecordValue(currentStreak);
      setCelebrating(true);
      setShowConfetti(true);
      toast({
        title: "New record! 🎉",
        description: `${currentStreak} days of completing all three intentions — your best run yet.`,
      });
    }
  }, [data, toast]);

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
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card/40 p-7 md:p-9 backdrop-blur-sm transition-colors duration-700",
        celebrating ? "border-primary/60 shadow-[0_0_60px_-15px] shadow-primary/30" : "border-primary/20",
      )}
    >
      <div className="absolute top-0 right-0 w-56 h-56 bg-primary/10 rounded-bl-[120px] -z-10 blur-2xl" />

      <AnimatePresence>{showConfetti && <RecordConfetti key="confetti" />}</AnimatePresence>

      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mb-6 overflow-hidden"
          >
            <div className="flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/[0.08] p-4">
              <Trophy className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-serif text-lg text-foreground">
                  A new personal best — {recordValue} day{recordValue === 1 ? "" : "s"} strong.
                </p>
                <p className="text-sm text-muted-foreground font-subheading">
                  You&apos;ve never kept the 333 streak alive this long. Keep it going.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCelebrating(false)}
                aria-label="Dismiss celebration"
                className="text-muted-foreground/60 hover:text-foreground transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  if (isFuture) {
                    return (
                      <div
                        key={key}
                        className="w-3.5 h-3.5 rounded-[3px] bg-transparent"
                      />
                    );
                  }
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDay(key)}
                      title={`${format(day, "MMM d, yyyy")}${isComplete ? " — all 3 complete" : " — not completed"} · tap to view`}
                      aria-label={`View intentions for ${format(day, "MMMM d, yyyy")}`}
                      className={cn(
                        "w-3.5 h-3.5 rounded-[3px] transition-colors cursor-pointer hover:ring-2 hover:ring-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isComplete ? "bg-primary" : "bg-muted/40",
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

      <DayIntentionsDialog
        date={selectedDay}
        wasComplete={selectedDay ? completedSet.has(selectedDay) : false}
        onClose={() => setSelectedDay(null)}
      />
    </section>
  );
}

function DayIntentionsDialog({
  date,
  wasComplete,
  onClose,
}: {
  date: string | null;
  wasComplete: boolean;
  onClose: () => void;
}) {
  const { data: intentions, isLoading } = useGetIntentions(
    { date: date ?? undefined },
    {
      query: {
        enabled: !!date,
        queryKey: getGetIntentionsQueryKey({ date: date ?? undefined }),
      },
    },
  );

  const sorted = [...(intentions ?? [])].sort((a, b) => a.order - b.order);
  const completedCount = sorted.filter((i) => i.isCompleted).length;
  const heading = date
    ? format(new Date(date + "T00:00:00"), "EEEE, MMMM d, yyyy")
    : "";

  return (
    <Dialog open={!!date} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card/95 border-border/60 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            {wasComplete && <Sparkles className="w-5 h-5 text-primary" />}
            {heading}
          </DialogTitle>
          <DialogDescription className="font-subheading">
            {isLoading
              ? "Loading your intentions…"
              : sorted.length === 0
                ? "No intentions were set this day."
                : wasComplete
                  ? "You completed all three intentions this day."
                  : `${completedCount} of ${sorted.length} intention${sorted.length === 1 ? "" : "s"} completed.`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-12 w-full rounded-xl bg-muted/40" />
            <Skeleton className="h-12 w-full rounded-xl bg-muted/40" />
            <Skeleton className="h-12 w-full rounded-xl bg-muted/40" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-6 text-center">
            <Circle className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">
              Nothing was captured for this day.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5 py-1">
            {sorted.map((intention, idx) => (
              <li
                key={intention.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3.5 transition-colors",
                  intention.isCompleted
                    ? "border-primary/30 bg-primary/[0.06]"
                    : "border-border/50 bg-card/40",
                )}
              >
                {intention.isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-subheading uppercase tracking-wider text-muted-foreground">
                    Intention {idx + 1}
                  </span>
                  <p
                    className={cn(
                      "text-foreground/90 leading-snug",
                      intention.isCompleted && "line-through decoration-primary/40 text-foreground/60",
                    )}
                  >
                    {intention.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
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
  const { toast } = useToast();
  const createIntention = useCreateIntention();
  const updateIntention = useUpdateIntention();
  const deleteIntention = useDeleteIntention();

  function showError(description: string) {
    toast({
      variant: "destructive",
      title: "Something went wrong",
      description,
    });
  }
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
    qc.invalidateQueries({ queryKey: getGetIntentionHistoryQueryKey() });
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
    } catch {
      showError("We couldn't save your intentions. Please check your connection and try again.");
    } finally {
      invalidate();
    }
  }

  function toggle(intention: Intention) {
    updateIntention.mutate(
      { id: intention.id, data: { isCompleted: !intention.isCompleted } },
      {
        onSuccess: invalidate,
        onError: () =>
          showError("We couldn't update that intention. Please try again."),
      }
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
        onError: () =>
          showError("We couldn't save your changes. Please try again."),
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
        onError: () =>
          showError("We couldn't remove that intention. Please try again."),
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
