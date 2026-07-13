import { useState } from "react";
import { useGetEvents, useCreateEvent, useDeleteEvent, getGetEventsQueryKey } from "@workspace/api-client-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarIcon, Clock, Plus, Loader2, Unlock, Lock, CalendarCheck, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type EventType = "event" | "medication" | "routine";
type WindowType = "open" | "locked" | "scheduled" | "private";

const WINDOW_TYPE_META: Record<WindowType, {
  label: string;
  icon: React.ElementType;
  dotColor: string;
  ringColor: string;
  description: string;
}> = {
  open:      { label: "Open",      icon: Unlock,       dotColor: "bg-emerald-400",         ringColor: "border-emerald-400/50 bg-emerald-400/10 text-emerald-400", description: "Available — come through" },
  scheduled: { label: "Scheduled", icon: CalendarCheck, dotColor: "bg-primary/70",          ringColor: "border-primary/50 bg-primary/10 text-primary",             description: "Already committed" },
  locked:    { label: "Locked",    icon: Lock,          dotColor: "bg-amber-400",           ringColor: "border-amber-400/50 bg-amber-400/10 text-amber-400",        description: "Do not disturb" },
  private:   { label: "Private",   icon: EyeOff,        dotColor: "bg-muted-foreground/40", ringColor: "border-border bg-muted/30 text-muted-foreground",            description: "Hidden from circle" },
};

const getEventColor = (type: string) => {
  switch (type) {
    case "medication": return "bg-secondary/80 text-secondary-foreground border-secondary/20";
    case "routine":    return "bg-muted/50 text-foreground border-border/50";
    default:           return "bg-primary/80 text-primary-foreground border-primary/20";
  }
};

export default function Calendar() {
  const { data: events, isLoading } = useGetEvents();
  const deleteEvent = useDeleteEvent();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  async function handleDelete(id: number) {
    await deleteEvent.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getGetEventsQueryKey() });
  }

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const upcoming = [...(events ?? [])]
    .filter((e) => new Date(e.startTime) >= new Date(today.setHours(0, 0, 0, 0)))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5);

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto w-full space-y-10 animate-in fade-in duration-700 slide-in-from-bottom-4">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/50 pb-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground">Schedule</h1>
          <p className="text-muted-foreground font-subheading text-base max-w-md">
            Your time, carefully arranged. {format(new Date(), "MMMM yyyy")}
          </p>
        </div>
        <Button onClick={() => setIsOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6">
          <Plus className="w-4 h-4 mr-2" />
          New Event
        </Button>
      </header>

      <EventFormDialog open={isOpen} onOpenChange={setIsOpen} />

      {isLoading ? (
        <Skeleton className="h-[600px] w-full rounded-2xl bg-muted/30" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-card/30 border border-border/50 rounded-2xl p-6 backdrop-blur-sm">
            <div className="grid grid-cols-7 gap-px mb-2 text-center text-xs font-subheading text-muted-foreground uppercase tracking-wider">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="py-2">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {daysInMonth.map((day, i) => {
                const dayEvents = events?.filter((e) => isSameDay(new Date(e.startTime), day)) || [];
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-24 p-2 border rounded-xl transition-colors",
                      isToday(day) ? "border-primary/50 bg-primary/5" : "border-border/50 bg-card/20 hover:bg-card/40"
                    )}
                    style={i === 0 ? { gridColumnStart: day.getDay() + 1 } : undefined}
                  >
                    <div className={cn(
                      "text-sm font-serif mb-2 flex items-center justify-center w-6 h-6 rounded-full",
                      isToday(day) ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    )}>
                      {format(day, "d")}
                    </div>

                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => {
                        const wt = (event.windowType ?? "scheduled") as WindowType;
                        const wtMeta = WINDOW_TYPE_META[wt] ?? WINDOW_TYPE_META.scheduled;
                        return (
                          <div key={event.id} className={cn("text-[10px] px-1.5 py-0.5 rounded border truncate flex items-center gap-1", getEventColor(event.type))}>
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", wtMeta.dotColor)} />
                            {event.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-muted-foreground text-center">+{dayEvents.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border/30">
              {(Object.entries(WINDOW_TYPE_META) as [WindowType, typeof WINDOW_TYPE_META[WindowType]][]).map(([wt, meta]) => (
                <span key={wt} className="flex items-center gap-1.5 text-xs text-muted-foreground font-subheading">
                  <span className={cn("w-2 h-2 rounded-full", meta.dotColor)} />
                  {meta.label}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-serif border-b border-border/50 pb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              Upcoming
            </h2>

            <div className="space-y-4">
              {upcoming.map((event) => {
                const wt = (event.windowType ?? "scheduled") as WindowType;
                const wtMeta = WINDOW_TYPE_META[wt] ?? WINDOW_TYPE_META.scheduled;
                const WtIcon = wtMeta.icon;
                return (
                  <div key={event.id} className="p-4 bg-card/40 border border-border/50 rounded-xl group">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn("w-2 h-2 rounded-full",
                        event.type === "medication" ? "bg-secondary" :
                        event.type === "routine" ? "bg-muted-foreground" : "bg-primary"
                      )} />
                      <h3 className="font-medium text-foreground flex-1">{event.title}</h3>
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border font-subheading", wtMeta.ringColor)}>
                        <WtIcon className="w-2.5 h-2.5" />{wtMeta.label}
                      </span>
                      <button
                        onClick={() => handleDelete(event.id)}
                        disabled={deleteEvent.isPending}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 rounded"
                        title="Delete event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1 pl-4 border-l border-border/50 ml-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {format(new Date(event.startTime), "MMM d, h:mm a")}
                      </p>
                      {event.description && (
                        <p className="text-xs text-muted-foreground/80 line-clamp-1">{event.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {upcoming.length === 0 && (
                <p className="text-sm text-muted-foreground italic text-center py-8">No upcoming events scheduled.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EventFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const createEvent = useCreateEvent();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("event");
  const [windowType, setWindowType] = useState<WindowType>("scheduled");
  const [startTime, setStartTime] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime) return;
    createEvent.mutate(
      { data: { title: title.trim(), type, windowType, startTime: new Date(startTime).toISOString(), description: description.trim() || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetEventsQueryKey() });
          setTitle(""); setType("event"); setWindowType("scheduled"); setStartTime(""); setDescription("");
          onOpenChange(false);
        },
        onError: () => toast({ variant: "destructive", title: "Couldn't create event", description: "Please check your details and try again." }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">New Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-card border-border" placeholder="Dentist appointment…" required />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Availability</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(WINDOW_TYPE_META) as [WindowType, typeof WINDOW_TYPE_META[WindowType]][]).map(([wt, meta]) => {
                const Icon = meta.icon;
                return (
                  <button
                    key={wt}
                    type="button"
                    onClick={() => setWindowType(wt)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-subheading transition-all text-left",
                      windowType === wt
                        ? cn("border-2", meta.ringColor)
                        : "bg-card border-border text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <div>
                      <p className="font-medium">{meta.label}</p>
                      <p className="text-[10px] opacity-70">{meta.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-subheading text-muted-foreground">Type</label>
              <Select value={type} onValueChange={(v: EventType) => setType(v)}>
                <SelectTrigger className="bg-card border-border capitalize"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="medication">Medication</SelectItem>
                  <SelectItem value="routine">Routine</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-subheading text-muted-foreground">When</label>
              <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-card border-border" required />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Description <span className="opacity-60">(optional)</span></label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-card border-border min-h-[80px] resize-none" placeholder="Any details worth remembering…" />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!title.trim() || !startTime || createEvent.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {createEvent.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Event
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
