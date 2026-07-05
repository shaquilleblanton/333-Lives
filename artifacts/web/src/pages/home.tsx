import { useGetDashboard, useUpdateIntention } from "@workspace/api-client-react";
import { format } from "date-fns";
import { CheckCircle2, Circle, Clock, MessageSquare, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function Home() {
  const { data: dashboard, isLoading } = useGetDashboard();
  const updateIntention = useUpdateIntention();

  if (isLoading) {
    return (
      <div className="p-6 md:p-12 max-w-5xl mx-auto w-full space-y-12">
        <div className="space-y-4">
          <Skeleton className="h-12 w-64 bg-muted/50" />
          <Skeleton className="h-6 w-48 bg-muted/50" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl bg-muted/30" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-xl bg-muted/30" />
          <Skeleton className="h-64 rounded-xl bg-muted/30" />
          <Skeleton className="h-64 rounded-xl bg-muted/30" />
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto w-full space-y-16 animate-in fade-in duration-700 slide-in-from-bottom-4">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-4xl md:text-5xl tracking-tight text-foreground">
          Good Morning, <span className="text-primary">{dashboard.userName || "James"}</span>.
        </h1>
        <p className="text-muted-foreground font-subheading text-lg">
          {format(new Date(), "EEEE, MMMM do")}
        </p>
      </header>

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

      {/* Three Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Intentions */}
        <div className="space-y-6">
          <h2 className="text-xl font-serif flex items-center gap-2 border-b border-border/50 pb-4">
            <span className="w-2 h-2 rounded-full bg-primary" />
            3 Intentions
          </h2>
          <div className="space-y-4">
            {dashboard.todayIntentions && dashboard.todayIntentions.length > 0 ? (
              dashboard.todayIntentions.map((intention) => (
                <button 
                  key={intention.id}
                  onClick={() => updateIntention.mutate({ data: { isCompleted: !intention.isCompleted } })}
                  className="flex items-start gap-3 w-full text-left group"
                >
                  <div className={cn("mt-0.5 transition-colors", intention.isCompleted ? "text-primary" : "text-muted-foreground group-hover:text-primary/70")}>
                    {intention.isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </div>
                  <span className={cn("text-sm md:text-base transition-all", intention.isCompleted ? "text-muted-foreground line-through" : "text-foreground")}>
                    {intention.text}
                  </span>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground italic">What matters most today?</p>
            )}
          </div>
        </div>

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
