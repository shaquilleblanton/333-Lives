import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetWorkouts,
  useCreateWorkout,
  useUpdateWorkout,
  useDeleteWorkout,
  useAddWorkoutBlock,
  useUpdateWorkoutBlock,
  useDeleteWorkoutBlock,
  useReorderWorkoutBlocks,
  getGetWorkoutsQueryKey,
} from "@workspace/api-client-react";
import type { WorkoutSession, WorkoutBlock } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dumbbell, Plus, X, ChevronLeft, ChevronRight, Trash2, Check,
  Activity, HeartPulse, Coffee, Droplet, Clock, CalendarDays,
  ArrowUp, ArrowDown, CheckCircle2, Circle, Flame, Waves, Wind, Sparkles, Timer, Pencil,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isSameMonth, parseISO,
} from "date-fns";

type ViewMode = "day" | "week" | "month";

const FOCUS_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  strength: { label: "Strength", icon: Dumbbell,   color: "text-primary   bg-primary/10   border-primary/30" },
  cardio:   { label: "Cardio",   icon: HeartPulse, color: "text-rose-400  bg-rose-400/10  border-rose-400/30" },
  mobility: { label: "Mobility", icon: Wind,       color: "text-secondary bg-secondary/10 border-secondary/30" },
  hiit:     { label: "HIIT",     icon: Flame,      color: "text-amber-400 bg-amber-400/10 border-amber-400/30" },
  recovery: { label: "Recovery", icon: Waves,      color: "text-accent    bg-accent/10    border-accent/30" },
  mixed:    { label: "Mixed",    icon: Sparkles,   color: "text-primary   bg-primary/10   border-primary/30" },
};

const BLOCK_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  exercise:  { label: "Exercise",  icon: Dumbbell, color: "text-primary   bg-primary/10   border-primary/30" },
  cardio:    { label: "Cardio",    icon: Activity, color: "text-rose-400  bg-rose-400/10  border-rose-400/30" },
  break:     { label: "Rest",      icon: Coffee,   color: "text-muted-foreground bg-muted/40 border-border" },
  hydration: { label: "Hydration", icon: Droplet,  color: "text-sky-400   bg-sky-400/10   border-sky-400/30" },
};

const DURATION_PRESETS = [15, 30, 45, 60];

function fmtDuration(min: number): string {
  if (!min) return "0m";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function sessionDuration(s: WorkoutSession): number {
  return (s.blocks || []).reduce((sum, b) => sum + (b.durationMin || 0), 0);
}

function toISODate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export default function Workouts() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [openSessionId, setOpenSessionId] = useState<number | null>(null);
  const [creating, setCreating] = useState<{ date: string } | null>(null);

  const range = (() => {
    if (viewMode === "day") return { start: anchor, end: anchor };
    if (viewMode === "week") return { start: startOfWeek(anchor, { weekStartsOn: 1 }), end: endOfWeek(anchor, { weekStartsOn: 1 }) };
    return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
  })();

  const { data: sessions = [], isLoading } = useGetWorkouts({
    start: toISODate(range.start),
    end: toISODate(range.end),
  });

  const createWorkout = useCreateWorkout();
  const updateWorkout = useUpdateWorkout();
  const deleteWorkout = useDeleteWorkout();

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetWorkoutsQueryKey() });
  }

  function fail(action: string) {
    toast({ title: "Something went wrong", description: `Couldn't ${action}. Please try again.`, variant: "destructive" });
  }

  function shift(dir: 1 | -1) {
    if (viewMode === "day") setAnchor(d => addDays(d, dir));
    else if (viewMode === "week") setAnchor(d => addDays(d, dir * 7));
    else setAnchor(d => (dir === 1 ? addDays(endOfMonth(d), 1) : addDays(startOfMonth(d), -1)));
  }

  const openSession = sessions.find(s => s.id === openSessionId) || null;

  const totalMinutes = sessions.reduce((sum, s) => sum + sessionDuration(s), 0);
  const completedCount = sessions.filter(s => s.status === "completed").length;

  const rangeLabel = (() => {
    if (viewMode === "day") return format(anchor, "EEEE, MMMM d");
    if (viewMode === "week") return `${format(range.start, "MMM d")} – ${format(range.end, "MMM d")}`;
    return format(anchor, "MMMM yyyy");
  })();

  async function handleToggleSession(s: WorkoutSession) {
    try {
      await updateWorkout.mutateAsync({ id: s.id, data: { status: s.status === "completed" ? "planned" : "completed" } });
      invalidate();
    } catch { fail("update the session"); }
  }

  async function handleDeleteSession(id: number) {
    try {
      await deleteWorkout.mutateAsync({ id });
      invalidate();
      if (openSessionId === id) setOpenSessionId(null);
    } catch { fail("delete the session"); }
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/50 pb-8">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground">Workout Planner</h1>
          <p className="text-muted-foreground font-subheading text-sm max-w-md">
            Build your training, block by block. Movement is a promise you keep to your future self.
          </p>
        </div>
        <Button
          onClick={() => setCreating({ date: toISODate(viewMode === "day" ? anchor : new Date()) })}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-subheading gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> Plan a Session
        </Button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Sessions", value: sessions.length, icon: Dumbbell, color: "text-primary" },
          { label: "Completed", value: completedCount, icon: CheckCircle2, color: "text-accent" },
          { label: "Total Time", value: fmtDuration(totalMinutes), icon: Clock, color: "text-secondary" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
            <Icon className={cn("w-5 h-5 mx-auto mb-2", color)} />
            <p className="text-2xl font-serif text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground font-subheading mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Controls: view toggle + date nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-1 bg-card border border-border rounded-full p-1 w-fit">
          {(["day", "week", "month"] as ViewMode[]).map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-subheading capitalize transition-all",
                viewMode === m ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-subheading text-foreground min-w-[180px] text-center">{rangeLabel}</span>
          <button onClick={() => shift(1)} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setAnchor(new Date())} className="ml-1 px-3 py-2 rounded-lg border border-border text-xs font-subheading text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
            Today
          </button>
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : viewMode === "month" ? (
        <MonthGrid
          anchor={anchor}
          sessions={sessions}
          onPickDay={(d) => { setAnchor(d); setViewMode("day"); }}
          onCreate={(d) => setCreating({ date: toISODate(d) })}
        />
      ) : viewMode === "week" ? (
        <WeekView
          range={range}
          sessions={sessions}
          onOpen={(s) => setOpenSessionId(s.id)}
          onCreate={(d) => setCreating({ date: toISODate(d) })}
        />
      ) : (
        <DayView
          date={anchor}
          sessions={sessions}
          onOpen={(s) => setOpenSessionId(s.id)}
          onCreate={() => setCreating({ date: toISODate(anchor) })}
          onToggle={handleToggleSession}
        />
      )}

      {/* Create modal */}
      <AnimatePresence>
        {creating && (
          <CreateSessionModal
            defaultDate={creating.date}
            isPending={createWorkout.isPending}
            onClose={() => setCreating(null)}
            onCreate={async (payload) => {
              try {
                await createWorkout.mutateAsync({ data: payload as Parameters<typeof createWorkout.mutateAsync>[0]["data"] });
                invalidate();
                setCreating(null);
              } catch { fail("create the session"); }
            }}
          />
        )}
      </AnimatePresence>

      {/* Detail modal */}
      <AnimatePresence>
        {openSession && (
          <SessionDetailModal
            session={openSession}
            onClose={() => setOpenSessionId(null)}
            onInvalidate={invalidate}
            onToggle={() => handleToggleSession(openSession)}
            onDelete={() => handleDeleteSession(openSession.id)}
            onFail={fail}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Day view ---------- */

function DayView({ date, sessions, onOpen, onCreate, onToggle }: {
  date: Date;
  sessions: WorkoutSession[];
  onOpen: (s: WorkoutSession) => void;
  onCreate: () => void;
  onToggle: (s: WorkoutSession) => void;
}) {
  const daySessions = sessions.filter(s => isSameDay(parseISO(s.date), date));
  if (daySessions.length === 0) return <EmptyState onCreate={onCreate} />;
  return (
    <div className="space-y-3">
      <AnimatePresence>
        {daySessions.map((s, i) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.04 }}>
            <SessionCard session={s} onOpen={() => onOpen(s)} onToggle={() => onToggle(s)} expanded />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Week view ---------- */

function WeekView({ range, sessions, onOpen, onCreate }: {
  range: { start: Date; end: Date };
  sessions: WorkoutSession[];
  onOpen: (s: WorkoutSession) => void;
  onCreate: (d: Date) => void;
}) {
  const days = eachDayOfInterval({ start: range.start, end: range.end });
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
      {days.map(day => {
        const daySessions = sessions.filter(s => isSameDay(parseISO(s.date), day));
        const isToday = isSameDay(day, new Date());
        return (
          <div key={day.toISOString()} className={cn("bg-card border rounded-xl p-3 min-h-[140px] flex flex-col", isToday ? "border-primary/40" : "border-border")}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className={cn("text-xs font-subheading uppercase tracking-wide", isToday ? "text-primary" : "text-muted-foreground")}>{format(day, "EEE")}</p>
                <p className="text-lg font-serif text-foreground leading-none">{format(day, "d")}</p>
              </div>
              <button onClick={() => onCreate(day)} className="text-muted-foreground hover:text-primary transition-colors" aria-label="Add session">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 flex-1">
              {daySessions.map(s => {
                const meta = FOCUS_META[s.focus] || FOCUS_META.mixed;
                const Icon = meta.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => onOpen(s)}
                    className={cn(
                      "w-full text-left rounded-lg border p-2 transition-all hover:border-primary/40 group",
                      s.status === "completed" ? "bg-accent/5 border-accent/30" : "bg-background border-border"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className={cn("w-3 h-3 shrink-0", meta.color.split(" ")[0])} />
                      <span className={cn("text-xs font-subheading truncate flex-1", s.status === "completed" ? "text-muted-foreground line-through" : "text-foreground")}>{s.title}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground font-subheading">
                      <Clock className="w-2.5 h-2.5" /> {fmtDuration(sessionDuration(s))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Month view ---------- */

function MonthGrid({ anchor, sessions, onPickDay, onCreate }: {
  anchor: Date;
  sessions: WorkoutSession[];
  onPickDay: (d: Date) => void;
  onCreate: (d: Date) => void;
}) {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div>
      <div className="grid grid-cols-7 gap-2 mb-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
          <div key={d} className="text-center text-xs font-subheading text-muted-foreground uppercase tracking-wide">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const daySessions = sessions.filter(s => isSameDay(parseISO(s.date), day));
          const inMonth = isSameMonth(day, anchor);
          const isToday = isSameDay(day, new Date());
          return (
            <button
              key={day.toISOString()}
              onDoubleClick={() => onCreate(day)}
              onClick={() => onPickDay(day)}
              className={cn(
                "aspect-square rounded-lg border p-1.5 flex flex-col text-left transition-all hover:border-primary/40",
                inMonth ? "bg-card" : "bg-card/40",
                isToday ? "border-primary/50" : "border-border"
              )}
            >
              <span className={cn("text-xs font-subheading", isToday ? "text-primary" : inMonth ? "text-foreground" : "text-muted-foreground/50")}>{format(day, "d")}</span>
              <div className="flex-1 flex flex-col gap-0.5 mt-0.5 overflow-hidden">
                {daySessions.slice(0, 3).map(s => {
                  const meta = FOCUS_META[s.focus] || FOCUS_META.mixed;
                  return (
                    <span key={s.id} className={cn("text-[9px] leading-tight rounded px-1 py-0.5 truncate border", meta.color)}>
                      {s.title}
                    </span>
                  );
                })}
                {daySessions.length > 3 && (
                  <span className="text-[9px] text-muted-foreground font-subheading">+{daySessions.length - 3} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground font-subheading mt-3 text-center">Tap a day to view it · double-tap to plan a session</p>
    </div>
  );
}

/* ---------- Session card (day view) ---------- */

function SessionCard({ session, onOpen, onToggle, expanded }: {
  session: WorkoutSession;
  onOpen: () => void;
  onToggle: () => void;
  expanded?: boolean;
}) {
  const meta = FOCUS_META[session.focus] || FOCUS_META.mixed;
  const Icon = meta.icon;
  const done = session.status === "completed";
  return (
    <div className={cn("bg-card border rounded-xl p-5 transition-all hover:border-primary/40 cursor-pointer group", done ? "border-accent/30 bg-accent/5" : "border-border")} onClick={onOpen}>
      <div className="flex items-start gap-4">
        <div className={cn("p-3 rounded-xl border shrink-0", meta.color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className={cn("font-serif text-lg group-hover:text-primary transition-colors truncate", done ? "text-muted-foreground line-through" : "text-foreground")}>{session.title}</h3>
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-subheading border transition-all", done ? "bg-accent/10 border-accent/30 text-accent" : "bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-primary")}
            >
              {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
              {done ? "Completed" : "Mark done"}
            </button>
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className={cn("flex items-center gap-1 text-xs font-subheading px-2 py-0.5 rounded-full border", meta.color)}>
              <Icon className="w-3 h-3" /> {meta.label}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground font-subheading">
              <Clock className="w-3 h-3" /> {fmtDuration(sessionDuration(session))}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground font-subheading">
              <CalendarDays className="w-3 h-3" /> {format(parseISO(session.date), "MMM d")}
            </span>
          </div>

          {expanded && session.blocks && session.blocks.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {session.blocks.map(b => {
                const bm = BLOCK_META[b.kind] || BLOCK_META.exercise;
                const BIcon = bm.icon;
                return (
                  <div key={b.id} className="flex items-center gap-2 text-sm">
                    <BIcon className={cn("w-3.5 h-3.5 shrink-0", bm.color.split(" ")[0])} />
                    <span className={cn("flex-1 truncate font-subheading", b.completed ? "text-muted-foreground line-through" : "text-foreground/90")}>{b.name}</span>
                    <span className="text-xs text-muted-foreground">{fmtDuration(b.durationMin)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Create session modal ---------- */

function CreateSessionModal({ defaultDate, isPending, onClose, onCreate }: {
  defaultDate: string;
  isPending: boolean;
  onClose: () => void;
  onCreate: (payload: { title: string; date: string; focus: string; notes: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [focus, setFocus] = useState("mixed");
  const [notes, setNotes] = useState("");

  return (
    <ModalShell onClose={onClose} title="Plan a Session" subtitle="Name it, pick a day, set the intention.">
      <form
        onSubmit={(e) => { e.preventDefault(); if (title.trim()) onCreate({ title: title.trim(), date, focus, notes }); }}
        className="space-y-5"
      >
        <div>
          <label className="text-xs text-muted-foreground font-subheading mb-1 block">Title *</label>
          <input
            required autoFocus
            placeholder="e.g. Morning Strength"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-subheading"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-subheading mb-1 block">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary font-subheading"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-subheading mb-1 block">Focus</label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(FOCUS_META).map(([key, meta]) => {
              const Icon = meta.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFocus(key)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-center transition-all",
                    focus === key ? cn("border-primary/50", meta.color) : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[11px] font-subheading">{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-subheading mb-1 block">Notes</label>
          <textarea
            placeholder="Optional — how you want this session to feel."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-subheading resize-none"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1 font-subheading">Cancel</Button>
          <Button type="submit" disabled={isPending || !title.trim()} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-subheading">
            {isPending ? "Creating…" : "Create Session"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ---------- Session detail modal (blocks) ---------- */

function SessionDetailModal({ session, onClose, onInvalidate, onToggle, onDelete, onFail }: {
  session: WorkoutSession;
  onClose: () => void;
  onInvalidate: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onFail: (action: string) => void;
}) {
  const addBlock = useAddWorkoutBlock();
  const updateBlock = useUpdateWorkoutBlock();
  const deleteBlock = useDeleteWorkoutBlock();
  const reorderBlocks = useReorderWorkoutBlocks();

  const [editingBlockId, setEditingBlockId] = useState<number | null>(null);

  const meta = FOCUS_META[session.focus] || FOCUS_META.mixed;
  const blocks = [...(session.blocks || [])].sort((a, b) => a.position - b.position);
  const done = session.status === "completed";

  async function handleAdd(payload: { kind: string; name: string; durationMin: number }) {
    try { await addBlock.mutateAsync({ id: session.id, data: payload as Parameters<typeof addBlock.mutateAsync>[0]["data"] }); onInvalidate(); }
    catch { onFail("add the block"); }
  }
  async function handleEditBlock(blockId: number, payload: { kind: string; name: string; durationMin: number }) {
    try {
      await updateBlock.mutateAsync({ id: session.id, blockId, data: payload as Parameters<typeof updateBlock.mutateAsync>[0]["data"] });
      setEditingBlockId(null);
      onInvalidate();
    } catch { onFail("update the block"); }
  }
  async function toggleBlock(b: WorkoutBlock) {
    try { await updateBlock.mutateAsync({ id: session.id, blockId: b.id, data: { completed: !b.completed } }); onInvalidate(); }
    catch { onFail("update the block"); }
  }
  async function removeBlock(b: WorkoutBlock) {
    try { await deleteBlock.mutateAsync({ id: session.id, blockId: b.id }); onInvalidate(); }
    catch { onFail("delete the block"); }
  }
  async function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= blocks.length) return;
    const ids = blocks.map(b => b.id);
    [ids[idx], ids[target]] = [ids[target], ids[idx]];
    try { await reorderBlocks.mutateAsync({ id: session.id, data: { blockIds: ids } }); onInvalidate(); }
    catch { onFail("reorder the blocks"); }
  }

  return (
    <ModalShell onClose={onClose} wide
      title={session.title}
      subtitle={`${meta.label} · ${format(parseISO(session.date), "EEEE, MMM d")} · ${fmtDuration(sessionDuration(session))}`}
    >
      <div className="space-y-5">
        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onToggle}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-subheading border transition-all", done ? "bg-accent/10 border-accent/30 text-accent" : "bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-primary")}
          >
            {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
            {done ? "Completed" : "Mark session done"}
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-subheading border border-border text-muted-foreground hover:text-rose-400 hover:border-rose-400/40 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>

        {session.notes && (
          <p className="text-sm text-muted-foreground font-subheading italic border-l-2 border-primary/30 pl-3">{session.notes}</p>
        )}

        {/* Blocks */}
        <div className="space-y-2">
          <h3 className="text-sm font-subheading text-muted-foreground uppercase tracking-wider">Blocks</h3>
          {blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground font-subheading py-4 text-center border border-dashed border-border rounded-xl">
              No blocks yet. Add exercises, cardio, rest, or hydration below.
            </p>
          ) : (
            <div className="space-y-2">
              {blocks.map((b, idx) => {
                const bm = BLOCK_META[b.kind] || BLOCK_META.exercise;
                const BIcon = bm.icon;
                if (editingBlockId === b.id) {
                  return (
                    <BlockForm
                      key={b.id}
                      isPending={updateBlock.isPending}
                      initial={b}
                      heading="Edit block"
                      submitLabel="Save Changes"
                      SubmitIcon={Check}
                      onSubmit={(payload) => handleEditBlock(b.id, payload)}
                      onCancel={() => setEditingBlockId(null)}
                    />
                  );
                }
                return (
                  <div key={b.id} className={cn("flex items-center gap-3 rounded-xl border p-3 transition-all", b.completed ? "bg-accent/5 border-accent/30" : "bg-background border-border")}>
                    <button onClick={() => toggleBlock(b)} className={cn("shrink-0 transition-colors", b.completed ? "text-accent" : "text-muted-foreground hover:text-primary")}>
                      {b.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </button>
                    <div className={cn("p-1.5 rounded-lg border shrink-0", bm.color)}>
                      <BIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-subheading truncate", b.completed ? "text-muted-foreground line-through" : "text-foreground")}>{b.name}</p>
                      <p className="text-xs text-muted-foreground">{bm.label} · {fmtDuration(b.durationMin)}</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => move(idx, -1)} disabled={idx === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"><ArrowUp className="w-4 h-4" /></button>
                      <button onClick={() => move(idx, 1)} disabled={idx === blocks.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"><ArrowDown className="w-4 h-4" /></button>
                      <button onClick={() => setEditingBlockId(b.id)} className="p-1 text-muted-foreground hover:text-primary transition-colors"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => removeBlock(b)} className="p-1 text-muted-foreground hover:text-rose-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add block */}
        <BlockForm isPending={addBlock.isPending} onSubmit={handleAdd} />
      </div>
    </ModalShell>
  );
}

/* ---------- Block form (add + edit) ---------- */

function BlockForm({ isPending, onSubmit, initial, heading, submitLabel, SubmitIcon, onCancel }: {
  isPending: boolean;
  onSubmit: (payload: { kind: string; name: string; durationMin: number }) => Promise<void>;
  initial?: WorkoutBlock;
  heading?: string;
  submitLabel?: string;
  SubmitIcon?: LucideIcon;
  onCancel?: () => void;
}) {
  const isEdit = !!initial;
  const initialPreset = initial && DURATION_PRESETS.includes(initial.durationMin);
  const [kind, setKind] = useState<string>(initial?.kind ?? "exercise");
  const [name, setName] = useState(initial?.name ?? "");
  const [duration, setDuration] = useState(initial && initialPreset ? initial.durationMin : 30);
  const [customMode, setCustomMode] = useState(!!initial && !initialPreset);
  const [custom, setCustom] = useState(initial && !initialPreset ? String(initial.durationMin) : "");

  const kindDefaults: Record<string, string> = {
    exercise: "", cardio: "", break: "Rest break", hydration: "Hydration break",
  };
  const SubmitBtnIcon = SubmitIcon ?? Plus;

  function pickKind(k: string) {
    setKind(k);
    if (!isEdit && (!name || Object.values(kindDefaults).includes(name))) setName(kindDefaults[k] || "");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const dur = customMode ? Number(custom) : duration;
    if (!name.trim() || !dur || dur <= 0) return;
    await onSubmit({ kind, name: name.trim(), durationMin: dur });
    if (!isEdit) {
      setName(kindDefaults[kind] || "");
      setCustom("");
      setCustomMode(false);
      setDuration(30);
    }
  }

  return (
    <form onSubmit={submit} className="bg-card border border-border rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-subheading text-muted-foreground uppercase tracking-wider">{heading ?? "Add a block"}</h3>

      <div className="grid grid-cols-4 gap-2">
        {Object.entries(BLOCK_META).map(([key, meta]) => {
          const Icon = meta.icon;
          return (
            <button
              key={key}
              type="button"
              onClick={() => pickKind(key)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all",
                kind === key ? cn("border-primary/50", meta.color) : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-subheading">{meta.label}</span>
            </button>
          );
        })}
      </div>

      <input
        placeholder={kind === "exercise" ? "e.g. Barbell Squats · 4×8" : kind === "cardio" ? "e.g. Treadmill run" : kind === "break" ? "Rest break" : "Water + electrolytes"}
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-subheading"
      />

      <div className="flex items-center gap-2 flex-wrap">
        <Timer className="w-4 h-4 text-muted-foreground" />
        {DURATION_PRESETS.map(p => (
          <button
            key={p}
            type="button"
            onClick={() => { setCustomMode(false); setDuration(p); }}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-subheading border transition-all",
              !customMode && duration === p ? "bg-primary/15 border-primary/50 text-primary" : "bg-background border-border text-muted-foreground hover:border-primary/30"
            )}
          >
            {p}m
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomMode(true)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-subheading border transition-all",
            customMode ? "bg-primary/15 border-primary/50 text-primary" : "bg-background border-border text-muted-foreground hover:border-primary/30"
          )}
        >
          Custom
        </button>
        {customMode && (
          <input
            type="number"
            min={1}
            autoFocus
            placeholder="min"
            value={custom}
            onChange={e => setCustom(e.target.value)}
            className="w-20 bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary font-subheading"
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending || !name.trim()} className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-subheading gap-2">
          <SubmitBtnIcon className="w-4 h-4" /> {submitLabel ?? "Add Block"}
        </Button>
        {onCancel && (
          <Button type="button" onClick={onCancel} variant="ghost" className="text-muted-foreground hover:text-foreground font-subheading">
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

/* ---------- Shared modal shell ---------- */

function ModalShell({ children, title, subtitle, onClose, wide }: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-0 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className={cn("bg-card border border-border w-full rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto", wide ? "max-w-2xl" : "max-w-lg")}
      >
        <div className="sticky top-0 bg-card/95 backdrop-blur-md border-b border-border/50 px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            <h2 className="text-xl font-serif text-foreground truncate">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground font-subheading mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/50 transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </motion.div>
    </motion.div>
  );
}

/* ---------- Empty state ---------- */

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 gap-4">
      <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
        <Dumbbell className="w-8 h-8 text-primary" />
      </div>
      <div className="space-y-1">
        <h3 className="text-xl font-serif text-foreground">Nothing planned yet</h3>
        <p className="text-sm text-muted-foreground font-subheading max-w-xs">Every strong day starts with a plan. Build your first session.</p>
      </div>
      <Button onClick={onCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground font-subheading gap-2">
        <Plus className="w-4 h-4" /> Plan a Session
      </Button>
    </div>
  );
}
