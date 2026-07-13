import { useState } from "react";
import { useGetAnnualReview } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import {
  CalendarDays, Flame, Target, BookHeart, CheckSquare, Star,
  BookOpen, Scroll, Mail, Lock, Users, TrendingUp, Smile, ArrowLeft, ChevronDown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const CURRENT_YEAR = new Date().getFullYear();
const AVAILABLE_YEARS = Array.from({ length: CURRENT_YEAR - 2023 }, (_, i) => CURRENT_YEAR - i);

const MOOD_EMOJI: Record<string, string> = {
  great: "🌟",
  good: "😊",
  okay: "😐",
  rough: "😔",
  struggling: "💙",
};

const MOOD_LABEL: Record<string, string> = {
  great: "Great",
  good: "Good",
  okay: "Okay",
  rough: "Rough",
  struggling: "Struggling",
};

function StatCard({
  icon: Icon,
  value,
  label,
  accent = false,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number | string;
  label: string;
  accent?: boolean;
  delay?: number;
}) {
  return (
    <div
      className="bg-card/40 border border-border/50 rounded-2xl p-6 flex flex-col gap-3 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? "bg-primary/20" : "bg-secondary/10"}`}>
        <Icon className={`w-5 h-5 ${accent ? "text-primary" : "text-secondary"}`} />
      </div>
      <p className="text-4xl font-serif text-foreground leading-none">{value}</p>
      <p className="text-xs font-subheading uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-subheading uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
      <span className="w-6 h-px bg-primary/40 inline-block" />
      {children}
      <span className="flex-1 h-px bg-primary/10 inline-block" />
    </h2>
  );
}

export default function ReviewPage() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [, setLocation] = useLocation();
  const { data, isLoading } = useGetAnnualReview(year);

  const moodEntries = data ? Object.entries(data.growth.moodBreakdown).sort((a, b) => b[1] - a[1]) : [];
  const totalMoodCount = moodEntries.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-12 animate-in fade-in duration-700">

        <header className="space-y-4">
          <button
            onClick={() => setLocation("/profile")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Profile
          </button>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-subheading uppercase tracking-widest text-primary mb-2">333 Lives</p>
              <h1 className="text-4xl md:text-5xl font-serif text-foreground">Your Year,<br />Wrapped.</h1>
            </div>

            <div className="relative">
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="appearance-none bg-card/60 border border-border/60 rounded-xl px-4 py-2 pr-8 text-foreground font-subheading text-sm cursor-pointer focus:outline-none focus:border-primary/60 backdrop-blur-sm"
              >
                {AVAILABLE_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-4 w-32 bg-muted/30" />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((j) => <Skeleton key={j} className="h-36 rounded-2xl bg-muted/30" />)}
                </div>
              </div>
            ))}
          </div>
        ) : !data ? null : (
          <div className="space-y-14">

            <section>
              <SectionHeader>The Numbers</SectionHeader>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard icon={CalendarDays} value={data.numbers.daysActive} label="Days Active" accent delay={0} />
                <StatCard icon={CheckSquare} value={data.numbers.intentionsCompleted} label="Intentions Completed" delay={60} />
                <StatCard icon={Flame} value={data.numbers.longestStreak} label="Longest Streak" accent delay={120} />
                <StatCard icon={BookHeart} value={data.numbers.gratitudeEntries} label="Gratitude Entries" delay={180} />
                <StatCard icon={Target} value={data.numbers.habitCheckins} label="Habit Check-ins" delay={240} />
                <StatCard icon={Star} value={data.numbers.goalsCompleted} label="Goals Completed" accent delay={300} />
              </div>
            </section>

            <section>
              <SectionHeader>Your Story</SectionHeader>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={CalendarDays} value={data.story.lifeEventsAdded} label="Life Events Added" delay={0} />
                <StatCard icon={Scroll} value={data.story.lettersWritten} label="Letters Written" accent delay={60} />
                <StatCard icon={Mail} value={data.story.futureMessagesSet} label="Future Messages" delay={120} />
                <StatCard icon={Lock} value={data.story.vaultItemsAdded} label="Vault Items Added" delay={180} />
              </div>
            </section>

            <section>
              <SectionHeader>Your People</SectionHeader>
              <div className="bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-sm space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-5xl font-serif text-foreground">{data.people.totalMoments}</p>
                    <p className="text-xs font-subheading uppercase tracking-widest text-muted-foreground mt-1">Total moments logged</p>
                  </div>
                  <Users className="w-10 h-10 text-secondary/40" />
                </div>
                {data.people.topPeople.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-border/40">
                    <p className="text-xs font-subheading uppercase tracking-wider text-muted-foreground">Your top connections</p>
                    {data.people.topPeople.map((person, i) => (
                      <div key={person.personId} className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-serif ${
                          i === 0 ? "bg-primary/20 text-primary" :
                          i === 1 ? "bg-secondary/20 text-secondary" :
                          "bg-muted/40 text-muted-foreground"
                        }`}>
                          {i + 1}
                        </div>
                        <p className="flex-1 text-sm text-foreground font-subheading">{person.name}</p>
                        <p className="text-sm text-muted-foreground">{person.momentCount} moment{person.momentCount !== 1 ? "s" : ""}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section>
              <SectionHeader>Growth</SectionHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4">
                  <BookOpen className="w-6 h-6 text-primary mb-3" />
                  <p className="text-5xl font-serif text-foreground">{data.growth.journalEntries}</p>
                  <p className="text-xs font-subheading uppercase tracking-widest text-muted-foreground mt-1">Journal entries written</p>
                </div>

                {moodEntries.length > 0 && (
                  <div className="bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
                    <Smile className="w-6 h-6 text-secondary mb-3" />
                    <p className="text-xs font-subheading uppercase tracking-wider text-muted-foreground mb-4">Mood breakdown</p>
                    <div className="space-y-2">
                      {moodEntries.map(([mood, count]) => (
                        <div key={mood} className="flex items-center gap-2">
                          <span className="text-base">{MOOD_EMOJI[mood] ?? "😐"}</span>
                          <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary/70 rounded-full transition-all duration-700"
                              style={{ width: `${Math.round((count / totalMoodCount) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground font-subheading w-16 text-right">
                            {MOOD_LABEL[mood] ?? mood} ({count})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {data.topWord && (
              <section>
                <SectionHeader>Your Word</SectionHeader>
                <div className="bg-gradient-to-br from-primary/10 to-secondary/5 border border-primary/20 rounded-2xl p-10 text-center animate-in fade-in slide-in-from-bottom-4">
                  <p className="text-xs font-subheading uppercase tracking-widest text-muted-foreground mb-4">
                    Your most-used word across all journal entries
                  </p>
                  <p className="text-6xl md:text-8xl font-serif text-primary capitalize tracking-tight">
                    {data.topWord}
                  </p>
                  <p className="text-sm text-muted-foreground mt-6 font-subheading italic">
                    "The words we use reveal the life we're living."
                  </p>
                </div>
              </section>
            )}

            <footer className="text-center pb-8">
              <p className="text-xs text-muted-foreground font-subheading uppercase tracking-widest">
                {year} — A year of intentional living
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 text-muted-foreground"
                onClick={() => setLocation("/profile")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Profile
              </Button>
            </footer>

          </div>
        )}
      </div>
    </div>
  );
}
