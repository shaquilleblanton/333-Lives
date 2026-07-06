import { useState, useMemo } from "react";
import { format, differenceInDays, startOfDay } from "date-fns";
import { motion } from "framer-motion";
import { 
  useGetGratitudeEntries, 
  useGetTodayGratitudeEntry, 
  useCreateGratitudeEntry, 
  useUpdateGratitudeEntry,
  getGetGratitudeEntriesQueryKey,
  getGetTodayGratitudeEntryQueryKey
} from "@workspace/api-client-react";
import { Heart, Sparkles, PenLine, ChevronDown, Check, Flame } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Gratitude() {
  const { data: entries, isLoading: loadingEntries } = useGetGratitudeEntries();
  const { data: todayEntry, isLoading: loadingToday } = useGetTodayGratitudeEntry();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const streak = useMemo(() => {
    if (!entries || entries.length === 0) return 0;
    
    // Sort descending by date
    const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    let currentStreak = 0;
    let expectedDate = startOfDay(new Date());

    // If today is missing, check if yesterday exists (streak might just be pending for today)
    const hasToday = sorted.some(e => startOfDay(new Date(e.date)).getTime() === expectedDate.getTime());
    
    if (!hasToday) {
      expectedDate.setDate(expectedDate.getDate() - 1);
      const hasYesterday = sorted.some(e => startOfDay(new Date(e.date)).getTime() === expectedDate.getTime());
      if (!hasYesterday) return 0;
    }

    for (const entry of sorted) {
      const entryDate = startOfDay(new Date(entry.date));
      if (entryDate.getTime() === expectedDate.getTime()) {
        currentStreak++;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else if (entryDate.getTime() > expectedDate.getTime()) {
        // Skip duplicate entries on the same day if any
        continue;
      } else {
        break; // Gap found
      }
    }
    return currentStreak;
  }, [entries]);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createEntry = useCreateGratitudeEntry();
  const updateEntry = useUpdateGratitudeEntry();

  function showError(description: string) {
    toast({
      variant: "destructive",
      title: "Something went wrong",
      description,
    });
  }

  const [formData, setFormData] = useState({
    item1: "",
    item2: "",
    item3: "",
    reflection: ""
  });

  const handleOpenForm = () => {
    if (todayEntry) {
      setFormData({
        item1: todayEntry.item1,
        item2: todayEntry.item2 || "",
        item3: todayEntry.item3 || "",
        reflection: todayEntry.reflection || ""
      });
    } else {
      setFormData({ item1: "", item2: "", item3: "", reflection: "" });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item1) return;

    if (todayEntry) {
      updateEntry.mutate(
        { id: todayEntry.id, data: formData },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetTodayGratitudeEntryQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetGratitudeEntriesQueryKey() });
            setIsFormOpen(false);
          },
          onError: () =>
            showError("We couldn't save your gratitude. Please check your connection and try again."),
        }
      );
    } else {
      createEntry.mutate(
        { data: { ...formData, date: new Date().toISOString() } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetTodayGratitudeEntryQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetGratitudeEntriesQueryKey() });
            setIsFormOpen(false);
          },
          onError: () =>
            showError("We couldn't save your gratitude. Please check your connection and try again."),
        }
      );
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto w-full space-y-10 animate-in fade-in duration-700 slide-in-from-bottom-4">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/50 pb-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground flex items-center gap-3">
            <Heart className="w-8 h-8 text-primary" />
            Daily Gratitude
          </h1>
          <p className="text-muted-foreground font-subheading text-base max-w-md">
            Three things. Every day. Watch your world shift.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-secondary/10 border border-secondary/20 text-secondary px-4 py-2 rounded-full">
          <Flame className="w-4 h-4" />
          <span className="font-serif text-lg leading-none">{streak} <span className="font-sans text-sm font-medium">Day Streak</span></span>
        </div>
      </header>

      {/* TODAY SECTION */}
      <section>
        <h2 className="text-sm font-subheading tracking-widest text-muted-foreground uppercase mb-4">Today</h2>
        
        {loadingToday ? (
          <Skeleton className="h-64 w-full bg-muted/30 rounded-xl" />
        ) : isFormOpen ? (
          <div className="bg-card border border-border/50 rounded-2xl p-6 md:p-8 backdrop-blur-sm shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <span className="font-serif text-2xl text-primary/50 mt-1">1.</span>
                  <Input 
                    autoFocus
                    placeholder="A small moment of peace..."
                    value={formData.item1}
                    onChange={e => setFormData({ ...formData, item1: e.target.value })}
                    className="text-lg py-6 bg-transparent border-t-0 border-x-0 border-b border-border/50 rounded-none focus-visible:ring-0 focus-visible:border-primary px-0 font-serif"
                    required
                  />
                </div>
                <div className="flex items-start gap-4">
                  <span className="font-serif text-2xl text-primary/50 mt-1">2.</span>
                  <Input 
                    placeholder="Someone who helped me..."
                    value={formData.item2}
                    onChange={e => setFormData({ ...formData, item2: e.target.value })}
                    className="text-lg py-6 bg-transparent border-t-0 border-x-0 border-b border-border/50 rounded-none focus-visible:ring-0 focus-visible:border-primary px-0 font-serif"
                  />
                </div>
                <div className="flex items-start gap-4">
                  <span className="font-serif text-2xl text-primary/50 mt-1">3.</span>
                  <Input 
                    placeholder="Something I accomplished..."
                    value={formData.item3}
                    onChange={e => setFormData({ ...formData, item3: e.target.value })}
                    className="text-lg py-6 bg-transparent border-t-0 border-x-0 border-b border-border/50 rounded-none focus-visible:ring-0 focus-visible:border-primary px-0 font-serif"
                  />
                </div>
              </div>
              
              <div className="pt-4">
                <label className="text-sm font-subheading text-muted-foreground mb-2 block">Reflection (Optional)</label>
                <Textarea 
                  placeholder="Why do these things matter today?"
                  value={formData.reflection}
                  onChange={e => setFormData({ ...formData, reflection: e.target.value })}
                  className="bg-muted/20 border-border/50 min-h-[100px] resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsFormOpen(false)}
                  className="hover:bg-muted/50"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8"
                  disabled={!formData.item1 || createEntry.isPending || updateEntry.isPending}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Seal Today's Gratitude
                </Button>
              </div>
            </form>
          </div>
        ) : todayEntry ? (
          <div className="bg-card border border-border rounded-2xl p-8 backdrop-blur-sm relative group">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleOpenForm}
            >
              <PenLine className="w-4 h-4 text-muted-foreground" />
            </Button>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <span className="font-serif text-2xl text-primary/60">1.</span>
                <p className="font-serif text-xl md:text-2xl text-foreground pt-0.5 leading-relaxed">{todayEntry.item1}</p>
              </div>
              {todayEntry.item2 && (
                <div className="flex items-start gap-4">
                  <span className="font-serif text-2xl text-primary/60">2.</span>
                  <p className="font-serif text-xl md:text-2xl text-foreground pt-0.5 leading-relaxed">{todayEntry.item2}</p>
                </div>
              )}
              {todayEntry.item3 && (
                <div className="flex items-start gap-4">
                  <span className="font-serif text-2xl text-primary/60">3.</span>
                  <p className="font-serif text-xl md:text-2xl text-foreground pt-0.5 leading-relaxed">{todayEntry.item3}</p>
                </div>
              )}
              
              {todayEntry.reflection && (
                <div className="mt-8 pt-6 border-t border-border/50">
                  <p className="font-serif italic text-muted-foreground leading-relaxed">
                    "{todayEntry.reflection}"
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-border/50 rounded-2xl bg-card/20">
            <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-serif text-foreground mb-2">What are you grateful for today?</h3>
            <p className="text-sm text-muted-foreground font-subheading mb-6 max-w-sm mx-auto">
              Take a moment to ground yourself. Acknowledge the good, however small.
            </p>
            <Button 
              onClick={handleOpenForm}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6"
            >
              Begin Today's Practice
            </Button>
          </div>
        )}
      </section>

      {/* TIMELINE SECTION */}
      <section className="pt-8">
        <h2 className="text-sm font-subheading tracking-widest text-muted-foreground uppercase mb-6">Past Entries</h2>
        
        {loadingEntries ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full bg-muted/30 rounded-xl" />
            <Skeleton className="h-20 w-full bg-muted/30 rounded-xl" />
          </div>
        ) : !entries || entries.length === 0 || (entries.length === 1 && todayEntry?.id === entries[0].id) ? (
          <p className="text-muted-foreground text-sm italic py-8 text-center bg-card/10 rounded-xl border border-border/20">
            Your journey begins here. Past entries will appear as you build your practice.
          </p>
        ) : (
          <div className="space-y-4">
            {entries.filter(e => e.id !== todayEntry?.id).map((entry, index) => (
              <motion.div 
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card/40 border border-border/50 rounded-xl overflow-hidden transition-all hover:border-border"
              >
                <button 
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  className="w-full text-left px-6 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-subheading text-muted-foreground min-w-24">
                      {format(new Date(entry.date), "MMM d, yyyy")}
                    </span>
                    <span className="font-serif text-foreground/80 truncate max-w-[200px] md:max-w-md">
                      {entry.item1}
                    </span>
                  </div>
                  <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform duration-300",
                    expandedId === entry.id ? "rotate-180" : ""
                  )} />
                </button>
                
                {expandedId === entry.id && (
                  <div className="px-6 pb-6 pt-2 border-t border-border/30 bg-muted/5">
                    <div className="space-y-3 pt-4">
                      <div className="flex items-start gap-3">
                        <span className="font-serif text-primary/50">1.</span>
                        <p className="font-serif text-foreground/90">{entry.item1}</p>
                      </div>
                      {entry.item2 && (
                        <div className="flex items-start gap-3">
                          <span className="font-serif text-primary/50">2.</span>
                          <p className="font-serif text-foreground/90">{entry.item2}</p>
                        </div>
                      )}
                      {entry.item3 && (
                        <div className="flex items-start gap-3">
                          <span className="font-serif text-primary/50">3.</span>
                          <p className="font-serif text-foreground/90">{entry.item3}</p>
                        </div>
                      )}
                      
                      {entry.reflection && (
                        <div className="mt-4 pt-4 border-t border-border/30">
                          <p className="font-serif italic text-muted-foreground text-sm">
                            "{entry.reflection}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
