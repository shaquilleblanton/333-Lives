import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetCommunityEvents,
  useCreateCommunityEvent,
  useUpdateCommunityEvent,
  useDeleteCommunityEvent,
  useRespondToCommunityEvent,
  getGetCommunityEventsQueryKey,
} from "@workspace/api-client-react";
import type { CommunityEvent } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Calendar, Plus, Users, Star, Trophy, Utensils, Heart,
  PartyPopper, X, ChevronLeft, ChevronRight, CheckCircle2,
  Clock, MapPin, Send, Unlock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  graduation:     { label: "Graduation",      icon: Trophy,       color: "text-amber-400  bg-amber-400/10  border-amber-400/30" },
  cookout:        { label: "Cookout",          icon: Utensils,     color: "text-orange-400 bg-orange-400/10 border-orange-400/30" },
  reunion:        { label: "Reunion",          icon: Users,        color: "text-primary    bg-primary/10    border-primary/30" },
  sporting_event: { label: "Sporting Event",   icon: Star,         color: "text-secondary  bg-secondary/10  border-secondary/30" },
  birthday:       { label: "Birthday",         icon: PartyPopper,  color: "text-pink-400   bg-pink-400/10   border-pink-400/30" },
  wedding:        { label: "Wedding",          icon: Heart,        color: "text-rose-400   bg-rose-400/10   border-rose-400/30" },
  open_day:       { label: "Open Day",         icon: Unlock,       color: "text-secondary  bg-secondary/10  border-secondary/30" },
  request:        { label: "Request",          icon: Send,         color: "text-accent     bg-accent/10     border-accent/30" },
  other:          { label: "Event",            icon: Calendar,     color: "text-muted-foreground bg-muted/30 border-border" },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  open:      { label: "Open",      color: "text-secondary bg-secondary/10 border-secondary/30" },
  confirmed: { label: "Confirmed", color: "text-primary   bg-primary/10   border-primary/30" },
  pending:   { label: "Pending",   color: "text-accent    bg-accent/10    border-accent/30" },
  declined:  { label: "Declined",  color: "text-destructive bg-destructive/10 border-destructive/30" },
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function Community() {
  const qc = useQueryClient();
  const { data: events = [], isLoading } = useGetCommunityEvents();
  const createEvent = useCreateCommunityEvent();
  const updateEvent = useUpdateCommunityEvent();
  const deleteEvent = useDeleteCommunityEvent();
  const respondEvent = useRespondToCommunityEvent();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [form, setForm] = useState({
    title: "", description: "", category: "other" as string,
    startDate: "", endDate: "", startTime: "", endTime: "",
    isOpenDay: false, requestedBy: "", isPublic: true,
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetCommunityEventsQueryKey() });
  }

  function handlePrevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function handleNextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  function dateStr(day: number) {
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${viewYear}-${m}-${d}`;
  }

  function eventsOnDate(ds: string) {
    return events.filter(e => e.startDate === ds || (e.endDate && e.startDate <= ds && e.endDate >= ds));
  }

  function filteredEvents() {
    return events.filter(e => {
      if (activeFilter === "all") return true;
      if (activeFilter === "open_day") return e.isOpenDay;
      if (activeFilter === "request") return e.category === "request";
      return e.category === activeFilter;
    }).sort((a, b) => a.startDate.localeCompare(b.startDate));
  }

  function handleDayClick(day: number) {
    const ds = dateStr(day);
    setSelectedDate(prev => prev === ds ? null : ds);
    setSelectedEvent(null);
    setShowForm(false);
  }

  function openNewForm(date?: string) {
    setForm(f => ({ ...f, startDate: date || "", title: "", description: "", category: "other", isOpenDay: false, requestedBy: "", endDate: "", startTime: "", endTime: "" }));
    setSelectedEvent(null);
    setShowForm(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createEvent.mutateAsync({ data: { ...form, userId: 1 } as any });
    invalidate();
    setShowForm(false);
    setForm({ title: "", description: "", category: "other", startDate: "", endDate: "", startTime: "", endTime: "", isOpenDay: false, requestedBy: "", isPublic: true });
  }

  async function handleRespond(id: number, status: "confirmed" | "declined") {
    await respondEvent.mutateAsync({ id, data: { status } });
    invalidate();
    setSelectedEvent(null);
  }

  async function handleDelete(id: number) {
    await deleteEvent.mutateAsync({ id });
    invalidate();
    setSelectedEvent(null);
  }

  const selectedDateEvents = selectedDate ? eventsOnDate(selectedDate) : [];
  const upcomingEvents = filteredEvents().filter(e => e.startDate >= today.toISOString().split("T")[0]).slice(0, 8);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/50 pb-8">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground">Community Calendar</h1>
          <p className="text-muted-foreground font-subheading text-sm max-w-md">
            Stay connected. Mark open days. Celebrate together.
          </p>
        </div>
        <Button
          onClick={() => openNewForm()}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-subheading gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Event
        </Button>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Calendar */}
        <div className="lg:col-span-2 space-y-6">
          {/* Month nav */}
          <div className="flex items-center justify-between">
            <button onClick={handlePrevMonth} className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="font-serif text-xl text-foreground">{MONTHS[viewMonth]} {viewYear}</h2>
            <button onClick={handleNextMonth} className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-subheading text-muted-foreground py-2">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          {isLoading ? (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const ds = dateStr(day);
                const dayEvents = eventsOnDate(ds);
                const isToday = ds === today.toISOString().split("T")[0];
                const isSelected = selectedDate === ds;
                const hasOpenDay = dayEvents.some(e => e.isOpenDay);
                const hasRequest = dayEvents.some(e => e.category === "request" && e.status === "pending");

                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "min-h-[56px] rounded-xl p-1.5 text-left transition-all duration-200 border relative group",
                      isSelected
                        ? "bg-primary/15 border-primary/50 text-foreground"
                        : isToday
                        ? "bg-card border-primary/30 text-foreground"
                        : "bg-card/50 border-transparent hover:border-border hover:bg-card text-foreground",
                    )}
                  >
                    <span className={cn(
                      "text-xs font-subheading w-6 h-6 flex items-center justify-center rounded-full",
                      isToday && "bg-primary text-primary-foreground",
                      !isToday && isSelected && "text-primary",
                      !isToday && !isSelected && "text-muted-foreground group-hover:text-foreground"
                    )}>
                      {day}
                    </span>
                    {/* Event dots */}
                    <div className="flex gap-0.5 flex-wrap mt-0.5">
                      {hasOpenDay && <span className="w-1.5 h-1.5 rounded-full bg-secondary" />}
                      {hasRequest && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
                      {dayEvents.filter(e => !e.isOpenDay && e.category !== "request").slice(0, 2).map(ev => (
                        <span key={ev.id} className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-4 pt-2">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-subheading">
              <span className="w-2 h-2 rounded-full bg-secondary" /> Open Day
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-subheading">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" /> Pending Request
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-subheading">
              <span className="w-2 h-2 rounded-full bg-primary/70" /> Event
            </span>
          </div>

          {/* Selected day events */}
          <AnimatePresence>
            {selectedDate && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg text-foreground">
                    {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => openNewForm(selectedDate)} className="gap-1 text-muted-foreground hover:text-primary text-xs">
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </div>
                {selectedDateEvents.length === 0 ? (
                  <div className="bg-card border border-border rounded-xl p-6 text-center">
                    <p className="text-muted-foreground text-sm font-subheading">Nothing scheduled.</p>
                    <Button variant="ghost" size="sm" onClick={() => openNewForm(selectedDate)} className="mt-2 text-primary gap-1">
                      <Plus className="w-3 h-3" /> Mark as Open Day
                    </Button>
                  </div>
                ) : (
                  selectedDateEvents.map(ev => (
                    <EventCard key={ev.id} event={ev} onSelect={setSelectedEvent} onRespond={handleRespond} onDelete={handleDelete} />
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right panel */}
        <div className="space-y-6">
          {/* Filter */}
          <div className="flex flex-wrap gap-2">
            {["all","open_day","request","reunion","cookout","sporting_event"].map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-subheading border transition-all",
                  activeFilter === f
                    ? "bg-primary/15 border-primary/50 text-primary"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                )}
              >
                {f === "all" ? "All" : CATEGORY_META[f]?.label || f}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <h3 className="font-serif text-lg text-foreground">Upcoming</h3>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            ) : upcomingEvents.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-6 text-center">
                <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm font-subheading">Nothing coming up.</p>
                <p className="text-muted-foreground/60 text-xs mt-1">Add an open day so family knows when to reach out.</p>
              </div>
            ) : (
              upcomingEvents.map((ev, i) => (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <EventCard event={ev} onSelect={setSelectedEvent} onRespond={handleRespond} onDelete={handleDelete} compact />
                </motion.div>
              ))
            )}
          </div>

          {/* Open Day CTA */}
          <div className="bg-secondary/10 border border-secondary/30 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Unlock className="w-4 h-4 text-secondary" />
              <span className="font-subheading text-sm font-medium text-secondary">Mark an Open Day</span>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Let family and friends see when you're available. No pressure — just an open door.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="border-secondary/40 text-secondary hover:bg-secondary/10 w-full font-subheading"
              onClick={() => { setForm(f => ({ ...f, isOpenDay: true, category: "open_day" })); setShowForm(true); }}
            >
              <Plus className="w-3 h-3 mr-1" /> Open a Day
            </Button>
          </div>
        </div>
      </div>

      {/* Event detail panel */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CategoryBadge category={selectedEvent.category} />
                  <h3 className="font-serif text-xl text-foreground mt-2">{selectedEvent.title}</h3>
                </div>
                <button onClick={() => setSelectedEvent(null)} className="text-muted-foreground hover:text-foreground p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground font-subheading">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>{new Date(selectedEvent.startDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
                </div>
                {selectedEvent.startTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>{selectedEvent.startTime}{selectedEvent.endTime && ` — ${selectedEvent.endTime}`}</span>
                  </div>
                )}
                {selectedEvent.requestedBy && (
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-accent" />
                    <span>Requested by {selectedEvent.requestedBy}</span>
                  </div>
                )}
              </div>

              {selectedEvent.description && (
                <p className="text-foreground/80 text-sm leading-relaxed border-t border-border pt-3">{selectedEvent.description}</p>
              )}

              <div className="flex items-center gap-1">
                <StatusBadge status={selectedEvent.status} />
                {selectedEvent.isOpenDay && (
                  <span className="px-2 py-0.5 rounded-full text-xs border font-subheading text-secondary bg-secondary/10 border-secondary/30">Open Day</span>
                )}
              </div>

              {selectedEvent.category === "request" && selectedEvent.status === "pending" && (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-subheading gap-1"
                    onClick={() => handleRespond(selectedEvent.id, "confirmed")}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10 font-subheading"
                    onClick={() => handleRespond(selectedEvent.id, "declined")}
                  >
                    Decline
                  </Button>
                </div>
              )}

              <div className="pt-1 border-t border-border">
                <button
                  onClick={() => handleDelete(selectedEvent.id)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors font-subheading"
                >
                  Remove event
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Event form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.form
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl"
              onClick={e => e.stopPropagation()}
              onSubmit={handleCreate}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-xl text-foreground">Add to Calendar</h3>
                <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  required
                  placeholder="Event title"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-subheading"
                />

                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value, isOpenDay: e.target.value === "open_day" }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary font-subheading"
                >
                  {Object.entries(CATEGORY_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground font-subheading mb-1 block">Start Date</label>
                    <input
                      type="date"
                      required
                      value={form.startDate}
                      onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-subheading"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-subheading mb-1 block">End Date (optional)</label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-subheading"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground font-subheading mb-1 block">Start Time</label>
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-subheading"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-subheading mb-1 block">End Time</label>
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-subheading"
                    />
                  </div>
                </div>

                <input
                  placeholder="Requested by (optional)"
                  value={form.requestedBy}
                  onChange={e => setForm(f => ({ ...f, requestedBy: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-subheading"
                />

                <textarea
                  placeholder="Description (optional)"
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-subheading resize-none"
                />

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isOpenDay}
                    onChange={e => setForm(f => ({ ...f, isOpenDay: e.target.checked }))}
                    className="accent-primary"
                  />
                  <span className="text-sm font-subheading text-muted-foreground">Mark as Open Day — family can request this time</span>
                </label>
              </div>

              <Button type="submit" disabled={createEvent.isPending} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-subheading">
                {createEvent.isPending ? "Adding..." : "Add to Calendar"}
              </Button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const meta = CATEGORY_META[category] || CATEGORY_META.other;
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-subheading", meta.color)}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || STATUS_META.open;
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-subheading", meta.color)}>
      {meta.label}
    </span>
  );
}

function EventCard({
  event, onSelect, onRespond, onDelete, compact = false
}: {
  event: CommunityEvent;
  onSelect: (e: CommunityEvent) => void;
  onRespond: (id: number, status: "confirmed" | "declined") => void;
  onDelete: (id: number) => void;
  compact?: boolean;
}) {
  const meta = CATEGORY_META[event.category] || CATEGORY_META.other;
  const Icon = meta.icon;

  return (
    <button
      onClick={() => onSelect(event)}
      className={cn(
        "w-full text-left bg-card border border-border rounded-xl transition-all duration-200 hover:border-primary/40 hover:bg-card/80",
        event.isOpenDay && "border-secondary/30 bg-secondary/5",
        event.category === "request" && event.status === "pending" && "border-accent/40 bg-accent/5",
        compact ? "p-3" : "p-4"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg border shrink-0", meta.color)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-subheading text-sm font-medium text-foreground truncate">{event.title}</span>
            <StatusBadge status={event.status} />
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-muted-foreground font-subheading">
              {new Date(event.startDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {event.endDate && event.endDate !== event.startDate && ` — ${new Date(event.endDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
            </span>
            {event.startTime && <span className="text-xs text-muted-foreground font-subheading">{event.startTime}</span>}
          </div>
          {!compact && event.requestedBy && (
            <p className="text-xs text-accent font-subheading mt-0.5">From {event.requestedBy}</p>
          )}
        </div>
      </div>
    </button>
  );
}
