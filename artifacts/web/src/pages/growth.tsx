import { useState } from "react";
import { 
  useGetHabits, 
  useCheckInHabit, 
  getGetHabitsQueryKey,
  useGetGoals,
  useGetJournalEntries
} from "@workspace/api-client-react";
import { Check, Target, BookOpen, Flame, PenLine } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

        <TabsContent value="habits">
          <HabitsTab />
        </TabsContent>
        <TabsContent value="goals">
          <GoalsTab />
        </TabsContent>
        <TabsContent value="journal">
          <JournalTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HabitsTab() {
  const { data: habits, isLoading } = useGetHabits();
  const checkIn = useCheckInHabit();
  const queryClient = useQueryClient();

  const handleCheckIn = (id: number) => {
    checkIn.mutate({
      habitId: id,
      data: { status: "great" }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() });
      }
    });
  };

  if (isLoading) return <Skeleton className="h-64 w-full bg-muted/30 rounded-xl" />;

  return (
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
            {habit.checkedInToday ? (
              <>
                <Check className="w-4 h-4" /> Completed Today
              </>
            ) : (
              "Check In"
            )}
          </button>
        </div>
      ))}
      
      {habits?.length === 0 && (
        <div className="col-span-full text-center py-12 border border-dashed border-border/50 rounded-xl bg-card/20">
          <p className="text-muted-foreground">No habits established yet.</p>
        </div>
      )}
    </div>
  );
}

function GoalsTab() {
  const { data: goals, isLoading } = useGetGoals();

  if (isLoading) return <Skeleton className="h-64 w-full bg-muted/30 rounded-xl" />;

  return (
    <div className="space-y-6">
      {goals?.map((goal) => (
        <div key={goal.id} className="bg-card/40 border border-border/50 p-6 rounded-2xl backdrop-blur-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-serif text-xl text-foreground">{goal.title}</h3>
              <p className="text-sm text-muted-foreground font-subheading capitalize">{goal.category}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-serif text-accent">{goal.progress}%</span>
            </div>
          </div>
          <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent transition-all duration-1000 ease-out rounded-full"
              style={{ width: `${goal.progress}%` }}
            />
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
  );
}

function JournalTab() {
  const { data: entries, isLoading } = useGetJournalEntries();

  if (isLoading) return <Skeleton className="h-64 w-full bg-muted/30 rounded-xl" />;

  return (
    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/50 before:to-transparent">
      {entries?.map((entry) => (
        <div key={entry.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-background bg-card border-border/50 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 text-primary">
            <BookOpen className="w-5 h-5" />
          </div>
          
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-card/40 border border-border/50 p-6 rounded-2xl backdrop-blur-sm">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-subheading text-muted-foreground uppercase tracking-wider">
                {format(new Date(entry.date), "MMM do, yyyy")}
              </span>
              <span className="text-xs font-subheading px-2 py-1 bg-primary/10 text-primary rounded-full capitalize">
                {entry.mood}
              </span>
            </div>
            <p className="text-foreground/90 text-sm leading-relaxed">{entry.content}</p>
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
  );
}
