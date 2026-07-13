import { useState } from "react";
import {
  useGetHabits,
  useCheckInHabit,
  useCreateHabit,
  getGetHabitsQueryKey,
  useGetGoals,
  useCreateGoal,
  getGetGoalsQueryKey,
  useGetJournalEntries,
  useCreateJournalEntry,
  getGetJournalEntriesQueryKey,
} from "@workspace/api-client-react";
import { Check, Target, BookOpen, Flame, PenLine, Plus, Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ─── Prompt bank ─────────────────────────────────────────────────────────────

const DAILY_PROMPTS = [
  { id: 0,  category: "Reflection",    text: "What was the most meaningful part of your day?" },
  { id: 1,  category: "Reflection",    text: "What emotion showed up most today, and what triggered it?" },
  { id: 2,  category: "Reflection",    text: "What would you do differently if you could replay today?" },
  { id: 3,  category: "Reflection",    text: "What did you learn about yourself today?" },
  { id: 4,  category: "Reflection",    text: "Where did your energy go today — and was it worth it?" },
  { id: 5,  category: "Gratitude",     text: "Name three things — one small, one surprising, one person — you're grateful for today." },
  { id: 6,  category: "Gratitude",     text: "Who made your day a little better? What did they do?" },
  { id: 7,  category: "Gratitude",     text: "What's something you normally overlook that actually matters?" },
  { id: 8,  category: "Gratitude",     text: "What privilege or blessing are you carrying that you often forget?" },
  { id: 9,  category: "Gratitude",     text: "What moment today deserves a second look?" },
  { id: 10, category: "Growth",        text: "What habit or pattern did you notice in yourself today?" },
  { id: 11, category: "Growth",        text: "What are you working to get better at, and did today move the needle?" },
  { id: 12, category: "Growth",        text: "What belief did today challenge or confirm?" },
  { id: 13, category: "Growth",        text: "What would the best version of you have done differently today?" },
  { id: 14, category: "Growth",        text: "Where are you playing it safe when you know you should push?" },
  { id: 15, category: "Relationships", text: "Who haven't you talked to in too long? What would you say to them right now?" },
  { id: 16, category: "Relationships", text: "Who in your life deserves more of your presence?" },
  { id: 17, category: "Relationships", text: "What did someone say or do today that you want to remember?" },
  { id: 18, category: "Relationships", text: "How did you show up for the people who matter most today?" },
  { id: 19, category: "Relationships", text: "Is there a conversation you've been avoiding? What's the first sentence?" },
  { id: 20, category: "Future Self",   text: "What would your future self thank you for doing today?" },
  { id: 21, category: "Future Self",   text: "What are you building right now that your future self will inherit?" },
  { id: 22, category: "Future Self",   text: "If today were the last ordinary day before everything changed, what would you want to have done?" },
  { id: 23, category: "Future Self",   text: "What story are you telling yourself about your future — is it true?" },
  { id: 24, category: "Future Self",   text: "What would you write to yourself to open in 10 years?" },
  { id: 25, category: "Challenges",    text: "What challenged you most today, and what did it reveal?" },
  { id: 26, category: "Challenges",    text: "What are you carrying right now that you need to put down?" },
  { id: 27, category: "Challenges",    text: "Where are you resisting something that might be good for you?" },
  { id: 28, category: "Challenges",    text: "What fear is keeping you from something you actually want?" },
  { id: 29, category: "Challenges",    text: "What's the hardest thing you're avoiding saying — to yourself or someone else?" },
];

function getTodayPrompt() {
  const epoch = new Date("2024-01-01").getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSinceEpoch = Math.floor((today.getTime() - epoch) / (1000 * 60 * 60 * 24));
  return DAILY_PROMPTS[((daysSinceEpoch % DAILY_PROMPTS.length) + DAILY_PROMPTS.length) % DAILY_PROMPTS.length];
}

const CATEGORY_COLORS: Record<string, string> = {
  Reflection:    "text-sky-400 bg-sky-400/10 border-sky-400/20",
  Gratitude:     "text-amber-400 bg-amber-400/10 border-amber-400/20",
  Growth:        "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Relationships: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  "Future Self": "text-violet-400 bg-violet-400/10 border-violet-400/20",
  Challenges:    "text-orange-400 bg-orange-400/10 border-orange-400/20",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type GoalCategory = "personal" | "financial" | "health" | "relationships" | "career" | "spiritual";
type Mood = "great" | "good" | "okay" | "rough" | "struggling";

const GOAL_CATEGORIES: GoalCategory[] = ["personal", "financial", "health", "relationships", "career", "spiritual"];
const MOODS: Mood[] = ["great", "good", "okay", "rough", "struggling"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Growth() {
  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto w-full space-y-10 animate-in fade-in duration-700 slide-in-from-bottom-4">
      <header className="space-y-2 border-b border-border/50 pb-8">
        <h1 className="text-3xl md:text-4xl font-serif text-foreground">Growth Hub</h1>
        <p className="text-muted-foreground font-subheading text-base max-w-md">
          Small, disciplined steps leading to monumental change. Track your evolution.
        </p>
      </header>

      <Tabs defaultValue="habits" className="w-full">
        <TabsList className="bg-card/50 border border-border/50 p-1 rounded-xl mb-8">
          <TabsTrigger value="habits" className="rounded-lg data-[state=active]:bg-secondary/20 data-[state=active]:text-secondary">
            Habits
          </TabsTrigger>
          <TabsTrigger value="goals" className="rounded-lg data-[state=active]:bg-accent/20 data-[state=active]:text-accent">
            Goals
          </TabsTrigger>
          <TabsTrigger value="journal" className="rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            Journal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="habits"><HabitsTab /></TabsContent>
        <TabsContent value="goals"><GoalsTab /></TabsContent>
        <TabsContent value="journal"><JournalTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function TabHeader({ title, actionLabel, onAction }: { title: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-serif text-foreground">{title}</h2>
      <Button onClick={onAction} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5">
        <Plus className="w-4 h-4 mr-1.5" />
        {actionLabel}
      </Button>
    </div>
  );
}

// ─── Habits ───────────────────────────────────────────────────────────────────

function HabitsTab() {
  const { data: habits, isLoading } = useGetHabits();
  const checkIn = useCheckInHabit();
  const createHabit = useCreateHabit();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCheckIn = (id: number) => {
    checkIn.mutate({ id, data: { status: "great" } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() }),
      onError: () => toast({ variant: "destructive", title: "Couldn't check in", description: "Please try again." }),
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createHabit.mutate({ data: { name: name.trim(), description: description.trim() || undefined } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() });
        setName(""); setDescription(""); setIsOpen(false);
      },
      onError: () => toast({ variant: "destructive", title: "Couldn't create habit", description: "Please try again." }),
    });
  };

  if (isLoading) return <Skeleton className="h-64 w-full bg-muted/30 rounded-xl" />;

  return (
    <div>
      <TabHeader title="Daily Habits" actionLabel="New Habit" onAction={() => setIsOpen(true)} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {habits?.map((habit) => (
          <div key={habit.id} className="bg-card/40 border border-border/50 p-6 rounded-2xl flex flex-col gap-6 backdrop-blur-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-xl text-foreground">{habit.name}</h3>
                <p className="text-sm text-muted-foreground font-subheading">{habit.description || "Daily practice"}</p>
              </div>
              <div className="flex items-center gap-1.5 text-secondary bg-secondary/10 px-3 py-1.5 rounded-full border border-secondary/20">
                <Flame className="w-4 h-4" />
                <span className="font-medium text-sm">{habit.currentStreak}</span>
              </div>
            </div>
            <button
              onClick={() => !habit.checkedInToday && handleCheckIn(habit.id)}
              disabled={habit.checkedInToday || checkIn.isPending}
              className={cn(
                "w-full py-3 rounded-xl font-subheading text-sm transition-all flex items-center justify-center gap-2",
                habit.checkedInToday
                  ? "bg-secondary/10 text-secondary border border-secondary/20 cursor-not-allowed"
                  : "bg-muted/50 text-foreground hover:bg-secondary hover:text-secondary-foreground"
              )}
            >
              {habit.checkedInToday ? <><Check className="w-4 h-4" /> Completed Today</> : "Check In"}
            </button>
          </div>
        ))}
        {habits?.length === 0 && (
          <div className="col-span-full text-center py-12 border border-dashed border-border/50 rounded-xl bg-card/20">
            <p className="text-muted-foreground">No habits established yet.</p>
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[480px] bg-background border-border">
          <DialogHeader><DialogTitle className="font-serif text-2xl">New Habit</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-subheading text-muted-foreground">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-card border-border" placeholder="Morning meditation, read 10 pages…" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-subheading text-muted-foreground">Description <span className="opacity-60">(optional)</span></label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-card border-border min-h-[80px] resize-none" placeholder="Why does this matter to you?" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!name.trim() || createHabit.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {createHabit.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Habit
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Goals ────────────────────────────────────────────────────────────────────

function GoalsTab() {
  const { data: goals, isLoading } = useGetGoals();
  const createGoal = useCreateGoal();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<GoalCategory>("personal");
  const [progress, setProgress] = useState(0);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createGoal.mutate({ data: { title: title.trim(), description: description.trim() || undefined, category, progress } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetGoalsQueryKey() });
        setTitle(""); setDescription(""); setCategory("personal"); setProgress(0); setIsOpen(false);
      },
      onError: () => toast({ variant: "destructive", title: "Couldn't create goal", description: "Please try again." }),
    });
  };

  if (isLoading) return <Skeleton className="h-64 w-full bg-muted/30 rounded-xl" />;

  return (
    <div>
      <TabHeader title="Goals" actionLabel="New Goal" onAction={() => setIsOpen(true)} />
      <div className="space-y-6">
        {goals?.map((goal) => (
          <div key={goal.id} className="bg-card/40 border border-border/50 p-6 rounded-2xl backdrop-blur-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-serif text-xl text-foreground">{goal.title}</h3>
                <p className="text-sm text-muted-foreground font-subheading capitalize">{goal.category}</p>
              </div>
              <span className="text-2xl font-serif text-accent">{goal.progress}%</span>
            </div>
            <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
              <div className="h-full bg-accent transition-all duration-1000 ease-out rounded-full" style={{ width: `${goal.progress}%` }} />
            </div>
          </div>
        ))}
        {goals?.length === 0 && (
          <div className="text-center py-12 border border-dashed border-border/50 rounded-xl bg-card/20">
            <Target className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No active goals.</p>
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[480px] bg-background border-border">
          <DialogHeader><DialogTitle className="font-serif text-2xl">New Goal</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-subheading text-muted-foreground">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-card border-border" placeholder="Run a half marathon…" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-subheading text-muted-foreground">Category</label>
              <Select value={category} onValueChange={(v: GoalCategory) => setCategory(v)}>
                <SelectTrigger className="bg-card border-border capitalize"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GOAL_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-subheading text-muted-foreground">Description <span className="opacity-60">(optional)</span></label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-card border-border min-h-[80px] resize-none" placeholder="What does success look like?" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-subheading text-muted-foreground">Starting progress: {progress}%</label>
              <input type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full accent-accent" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!title.trim() || createGoal.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {createGoal.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Goal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Journal ──────────────────────────────────────────────────────────────────

function JournalTab() {
  const { data: entries, isLoading } = useGetJournalEntries();
  const createEntry = useCreateJournalEntry();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<Mood>("good");
  const [pendingPrompt, setPendingPrompt] = useState<{ id: number; text: string } | null>(null);

  const todayPrompt = getTodayPrompt();
  const categoryColor = CATEGORY_COLORS[todayPrompt.category] ?? "text-primary bg-primary/10 border-primary/20";

  const openFreeWrite = () => {
    setPendingPrompt(null);
    setContent("");
    setMood("good");
    setIsOpen(true);
  };

  const openPrompted = () => {
    setPendingPrompt({ id: todayPrompt.id, text: todayPrompt.text });
    setContent("");
    setMood("good");
    setIsOpen(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    createEntry.mutate(
      {
        data: {
          content: content.trim(),
          mood,
          date: format(new Date(), "yyyy-MM-dd"),
          ...(pendingPrompt ? { promptId: pendingPrompt.id, promptText: pendingPrompt.text } : {}),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetJournalEntriesQueryKey() });
          setContent(""); setMood("good"); setPendingPrompt(null); setIsOpen(false);
        },
        onError: () => toast({ variant: "destructive", title: "Couldn't save entry", description: "Please try again." }),
      }
    );
  };

  if (isLoading) return <Skeleton className="h-64 w-full bg-muted/30 rounded-xl" />;

  return (
    <div className="space-y-8">
      {/* Daily prompt card */}
      <div className="relative rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card/60 to-card/30 p-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-primary/5 -translate-y-1/2 translate-x-1/4 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-subheading text-primary uppercase tracking-wider">Today's Prompt</span>
            <span className={cn("ml-auto text-xs font-subheading px-2 py-0.5 rounded-full border", categoryColor)}>
              {todayPrompt.category}
            </span>
          </div>
          <blockquote className="font-serif text-xl md:text-2xl text-foreground leading-snug mb-5">
            "{todayPrompt.text}"
          </blockquote>
          <div className="flex items-center gap-3">
            <Button
              onClick={openPrompted}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5"
            >
              <PenLine className="w-4 h-4 mr-2" />
              Answer this prompt
            </Button>
            <Button
              variant="ghost"
              onClick={openFreeWrite}
              className="text-muted-foreground hover:text-foreground rounded-full px-4"
            >
              Free write instead
            </Button>
          </div>
        </div>
      </div>

      {/* Entry list header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif text-foreground">Past Entries</h2>
        <Button onClick={openFreeWrite} size="sm" variant="outline" className="rounded-full px-4">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> New Entry
        </Button>
      </div>

      {/* Timeline */}
      <div className="space-y-8 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/50 before:to-transparent">
        {entries?.map((entry) => (
          <div key={entry.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-background bg-card border-border/50 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-card/40 border border-border/50 p-6 rounded-2xl backdrop-blur-sm">
              <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                <span className="text-xs font-subheading text-muted-foreground uppercase tracking-wider">
                  {format(new Date(entry.date), "MMM do, yyyy")}
                </span>
                <div className="flex items-center gap-2">
                  {entry.promptText && (
                    <span className="text-xs font-subheading px-2 py-0.5 bg-primary/10 text-primary rounded-full flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> Prompted
                    </span>
                  )}
                  <span className="text-xs font-subheading px-2 py-1 bg-primary/10 text-primary rounded-full capitalize">
                    {entry.mood}
                  </span>
                </div>
              </div>
              {entry.promptText && (
                <p className="text-xs text-muted-foreground font-subheading italic mb-2 border-l-2 border-primary/30 pl-2">
                  {entry.promptText}
                </p>
              )}
              <p className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap">{entry.content}</p>
            </div>
          </div>
        ))}
        {entries?.length === 0 && (
          <div className="text-center py-12">
            <PenLine className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">Your journal is waiting.</p>
          </div>
        )}
      </div>

      {/* Write dialog */}
      <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) setPendingPrompt(null); }}>
        <DialogContent className="sm:max-w-[520px] bg-background border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {pendingPrompt ? "Answer Today's Prompt" : "New Journal Entry"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-4">
            {pendingPrompt && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-xs font-subheading text-primary mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Today's Prompt
                </p>
                <p className="text-sm font-serif text-foreground leading-relaxed">"{pendingPrompt.text}"</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-subheading text-muted-foreground">How are you feeling?</label>
              <Select value={mood} onValueChange={(v: Mood) => setMood(v)}>
                <SelectTrigger className="bg-card border-border capitalize"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOODS.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-subheading text-muted-foreground">
                {pendingPrompt ? "Your answer" : "Entry"}
              </label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="bg-card border-border min-h-[160px] resize-none"
                placeholder={pendingPrompt ? "Write your answer here…" : "What's on your mind today?"}
                required
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => { setIsOpen(false); setPendingPrompt(null); }}>Cancel</Button>
              <Button type="submit" disabled={!content.trim() || createEntry.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {createEntry.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Entry
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
