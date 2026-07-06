import { useState } from "react";
import {
  useGetTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  getGetTasksQueryKey,
} from "@workspace/api-client-react";
import type { Task } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isValid } from "date-fns";
import {
  Plus, X, CheckCircle2, Circle, Trash2, Pencil, ListChecks,
  AlertTriangle, CalendarClock, Sparkles, Check,
  User, Wallet, HeartPulse, Home as HomeIcon, Briefcase, Tag, Flag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Priority = "low" | "medium" | "high";
type Category = "personal" | "finance" | "health" | "family" | "work" | "other";

const CATEGORY_META: Record<Category, { label: string; icon: LucideIcon; color: string }> = {
  personal: { label: "Personal", icon: User, color: "text-sky-300 bg-sky-500/10 border-sky-500/25" },
  finance: { label: "Finance", icon: Wallet, color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25" },
  health: { label: "Health", icon: HeartPulse, color: "text-rose-300 bg-rose-500/10 border-rose-500/25" },
  family: { label: "Family", icon: HomeIcon, color: "text-amber-300 bg-amber-500/10 border-amber-500/25" },
  work: { label: "Work", icon: Briefcase, color: "text-violet-300 bg-violet-500/10 border-violet-500/25" },
  other: { label: "Other", icon: Tag, color: "text-muted-foreground bg-muted/30 border-border" },
};

const PRIORITY_META: Record<Priority, { label: string; dot: string; text: string }> = {
  high: { label: "High", dot: "bg-rose-400", text: "text-rose-300" },
  medium: { label: "Medium", dot: "bg-amber-400", text: "text-amber-300" },
  low: { label: "Low", dot: "bg-sky-400", text: "text-sky-300" },
};

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

function todayKey() {
  return format(new Date(), "yyyy-MM-dd");
}

function fmtDue(due: string) {
  const d = parseISO(due);
  if (!isValid(d)) return due;
  return format(d, "EEE, MMM d");
}

export default function Tasks() {
  const { data: tasks, isLoading } = useGetTasks();
  const { toast } = useToast();
  const qc = useQueryClient();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetTasksQueryKey() });
  }
  function fail(action: string) {
    toast({ title: "Something went wrong", description: `We couldn't ${action}. Please try again.`, variant: "destructive" });
  }

  async function toggle(t: Task) {
    try { await updateTask.mutateAsync({ id: t.id, data: { isCompleted: !t.isCompleted } }); invalidate(); }
    catch { fail("update the task"); }
  }
  async function remove(t: Task) {
    try { await deleteTask.mutateAsync({ id: t.id }); invalidate(); }
    catch { fail("delete the task"); }
  }
  async function submit(payload: { title: string; notes: string; dueDate: string | null; priority: Priority; category: Category }) {
    try {
      if (editing) {
        await updateTask.mutateAsync({ id: editing.id, data: payload as Parameters<typeof updateTask.mutateAsync>[0]["data"] });
      } else {
        const body = {
          title: payload.title,
          priority: payload.priority,
          category: payload.category,
          ...(payload.notes ? { notes: payload.notes } : {}),
          ...(payload.dueDate ? { dueDate: payload.dueDate } : {}),
        };
        await createTask.mutateAsync({ data: body as Parameters<typeof createTask.mutateAsync>[0]["data"] });
      }
      setModalOpen(false);
      setEditing(null);
      invalidate();
    } catch { fail(editing ? "update the task" : "create the task"); }
  }

  const all = tasks ?? [];
  const active = all.filter((t) => !t.isCompleted);
  const completed = all.filter((t) => t.isCompleted);
  const tk = todayKey();

  const byPriority = (a: Task, b: Task) => PRIORITY_ORDER[a.priority as Priority] - PRIORITY_ORDER[b.priority as Priority];
  const overdue = active.filter((t) => t.dueDate && t.dueDate < tk).sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
  const dueToday = active.filter((t) => t.dueDate === tk).sort(byPriority);
  const upcoming = active.filter((t) => t.dueDate && t.dueDate > tk).sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
  const someday = active.filter((t) => !t.dueDate).sort(byPriority);

  const groups: { key: string; label: string; icon: LucideIcon; accent: string; items: Task[] }[] = [
    { key: "overdue", label: "Overdue", icon: AlertTriangle, accent: "text-rose-300", items: overdue },
    { key: "today", label: "Today", icon: CalendarClock, accent: "text-primary", items: dueToday },
    { key: "upcoming", label: "Upcoming", icon: CalendarClock, accent: "text-foreground", items: upcoming },
    { key: "someday", label: "Someday", icon: Sparkles, accent: "text-muted-foreground", items: someday },
  ];

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(t: Task) { setEditing(t); setModalOpen(true); }

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl tracking-tight text-foreground font-serif">Tasks &amp; Responsibilities</h1>
          <p className="text-muted-foreground font-subheading text-base md:text-lg mt-2 max-w-xl">
            The things that keep your life moving. Handle what matters today, and let tomorrow&apos;s wait its turn.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground font-subheading gap-2 rounded-full px-5">
          <Plus className="w-4 h-4" /> Add Task
        </Button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-10">
        <StatCard label="Overdue" value={overdue.length} tone={overdue.length > 0 ? "danger" : "muted"} />
        <StatCard label="Due Today" value={dueToday.length} tone="primary" />
        <StatCard label="Done" value={completed.length} tone="accent" />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl bg-muted/30" />)}
        </div>
      ) : all.length === 0 ? (
        <EmptyState onAdd={openCreate} />
      ) : (
        <div className="space-y-10">
          {groups.map((g) =>
            g.items.length === 0 ? null : (
              <section key={g.key}>
                <div className="flex items-center gap-2 mb-3">
                  <g.icon className={cn("w-4 h-4", g.accent)} />
                  <h2 className={cn("text-sm font-subheading uppercase tracking-wider", g.accent)}>{g.label}</h2>
                  <span className="text-xs text-muted-foreground">({g.items.length})</span>
                </div>
                <div className="space-y-2">
                  {g.items.map((t) => (
                    <TaskRow key={t.id} task={t} overdue={g.key === "overdue"} onToggle={() => toggle(t)} onEdit={() => openEdit(t)} onDelete={() => remove(t)} />
                  ))}
                </div>
              </section>
            )
          )}

          {completed.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-subheading uppercase tracking-wider text-muted-foreground">Completed</h2>
                <span className="text-xs text-muted-foreground">({completed.length})</span>
              </div>
              <div className="space-y-2">
                {completed.slice(0, 20).map((t) => (
                  <TaskRow key={t.id} task={t} overdue={false} onToggle={() => toggle(t)} onEdit={() => openEdit(t)} onDelete={() => remove(t)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {modalOpen && (
        <TaskModal
          initial={editing}
          isPending={createTask.isPending || updateTask.isPending}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSubmit={submit}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "danger" | "primary" | "accent" | "muted" }) {
  const toneClass =
    tone === "danger" ? "text-rose-300" :
    tone === "primary" ? "text-primary" :
    tone === "accent" ? "text-accent" : "text-muted-foreground";
  return (
    <div className="bg-card/50 border border-border/60 rounded-2xl p-4 md:p-5 text-center">
      <div className={cn("text-3xl md:text-4xl font-serif", toneClass)}>{value}</div>
      <div className="text-xs md:text-sm text-muted-foreground font-subheading uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function TaskRow({ task, overdue, onToggle, onEdit, onDelete }: {
  task: Task;
  overdue: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cm = CATEGORY_META[task.category as Category] ?? CATEGORY_META.other;
  const CIcon = cm.icon;
  const pm = PRIORITY_META[task.priority as Priority] ?? PRIORITY_META.medium;
  const done = task.isCompleted;

  return (
    <div className={cn(
      "group flex items-center gap-3 rounded-xl border p-3 md:p-4 transition-all",
      done ? "bg-accent/[0.04] border-border/50" : overdue ? "bg-rose-500/[0.04] border-rose-500/25" : "bg-card/40 border-border/60 hover:border-primary/30"
    )}>
      <button onClick={onToggle} className={cn("shrink-0 transition-colors", done ? "text-accent" : "text-muted-foreground hover:text-primary")}>
        {done ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", pm.dot)} title={`${pm.label} priority`} />
          <p className={cn("text-sm md:text-base font-subheading truncate", done ? "text-muted-foreground line-through" : "text-foreground")}>{task.title}</p>
        </div>
        {task.notes && <p className="text-xs text-muted-foreground truncate mt-0.5 pl-3.5">{task.notes}</p>}
        <div className="flex items-center gap-2 mt-1.5 pl-3.5 flex-wrap">
          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-subheading border", cm.color)}>
            <CIcon className="w-3 h-3" /> {cm.label}
          </span>
          {task.dueDate && (
            <span className={cn("text-[11px] font-subheading", overdue ? "text-rose-300" : "text-muted-foreground")}>
              {fmtDue(task.dueDate)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1.5 text-muted-foreground hover:text-primary transition-colors"><Pencil className="w-4 h-4" /></button>
        <button onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-rose-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="border border-dashed border-border/60 rounded-2xl bg-card/20 p-12 text-center">
      <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 text-primary">
        <ListChecks className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-serif text-foreground mb-2">A clear mind starts here</h3>
      <p className="text-muted-foreground font-subheading text-sm max-w-md mx-auto mb-6">
        Capture what you need to do — bills, calls, errands, promises. Give each a home so nothing weighs on you unspoken.
      </p>
      <Button onClick={onAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground font-subheading gap-2 rounded-full px-6">
        <Plus className="w-4 h-4" /> Add Your First Task
      </Button>
    </div>
  );
}

function TaskModal({ initial, isPending, onClose, onSubmit }: {
  initial: Task | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (payload: { title: string; notes: string; dueDate: string | null; priority: Priority; category: Category }) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [priority, setPriority] = useState<Priority>((initial?.priority as Priority) ?? "medium");
  const [category, setCategory] = useState<Category>((initial?.category as Category) ?? "personal");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), notes: notes.trim(), dueDate: dueDate || null, priority, category });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border/60">
          <h2 className="text-xl font-serif text-foreground">{initial ? "Edit Task" : "New Task"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label className="text-xs font-subheading text-muted-foreground uppercase tracking-wider">Title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Pay the electricity bill"
              className="mt-1.5 w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-subheading"
            />
          </div>

          <div>
            <label className="text-xs font-subheading text-muted-foreground uppercase tracking-wider">Notes <span className="normal-case opacity-60">(optional)</span></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any details you want to remember"
              className="mt-1.5 w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-subheading resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-subheading text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Category</label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {(Object.keys(CATEGORY_META) as Category[]).map((key) => {
                const meta = CATEGORY_META[key];
                const Icon = meta.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-subheading transition-all",
                      category === key ? meta.color : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" /> {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-subheading text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Flag className="w-3.5 h-3.5" /> Priority</label>
              <div className="mt-1.5 flex gap-1.5">
                {(Object.keys(PRIORITY_META) as Priority[]).map((key) => {
                  const meta = PRIORITY_META[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPriority(key)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-subheading transition-all",
                        priority === key ? "border-primary/50 bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} /> {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-subheading text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" /> Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1.5 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-subheading [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" disabled={isPending || !title.trim()} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-subheading gap-2">
              <Check className="w-4 h-4" /> {initial ? "Save Changes" : "Add Task"}
            </Button>
            <Button type="button" onClick={onClose} variant="ghost" className="text-muted-foreground hover:text-foreground font-subheading">Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
