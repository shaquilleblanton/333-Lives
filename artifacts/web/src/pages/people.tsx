import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  useGetPeople,
  useCreatePerson,
  useUpdatePerson,
  useGetRelationshipMoments,
  useCreateRelationshipMoment,
  useDeleteRelationshipMoment,
  useGetPeopleReminders,
  getGetPeopleQueryKey,
  getGetRelationshipMomentsQueryKey,
} from "@workspace/api-client-react";
import type { Person, RelationshipMoment } from "@workspace/api-client-react";
import {
  Users, Plus, Heart, Calendar, Mail, Edit3, Loader2,
  MessageSquare, Star, Trophy, Flower2, Handshake, X,
  ChevronRight, Trash2, Clock, AlertCircle, Cake
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type RelationshipFilter = "all" | "family" | "friend" | "partner" | "mentor" | "colleague" | "other" | "overdue";

const MOMENT_META: Record<string, { label: string; icon: React.ElementType; color: string; dot: string }> = {
  conversation: { label: "Conversation",  icon: MessageSquare, color: "text-secondary  bg-secondary/10  border-secondary/30",  dot: "bg-secondary" },
  promise:      { label: "Promise",       icon: Handshake,     color: "text-accent    bg-accent/10    border-accent/30",      dot: "bg-accent" },
  milestone:    { label: "Milestone",     icon: Trophy,        color: "text-primary   bg-primary/10   border-primary/30",     dot: "bg-primary" },
  memory:       { label: "Memory",        icon: Star,          color: "text-amber-400 bg-amber-400/10 border-amber-400/30",   dot: "bg-amber-400" },
  birthday:     { label: "Birthday",      icon: Flower2,       color: "text-pink-400  bg-pink-400/10  border-pink-400/30",    dot: "bg-pink-400" },
  loss:         { label: "Loss",          icon: Heart,         color: "text-rose-400  bg-rose-400/10  border-rose-400/30",    dot: "bg-rose-400" },
  gratitude:    { label: "Gratitude",     icon: Heart,         color: "text-primary   bg-primary/10   border-primary/30",     dot: "bg-primary" },
  other:        { label: "Moment",        icon: Clock,         color: "text-muted-foreground bg-muted/30 border-border",     dot: "bg-muted-foreground" },
};

function getRelationshipColor(rel: string) {
  switch (rel) {
    case "family":   return "bg-primary/10 text-primary border-primary/20";
    case "friend":   return "bg-secondary/10 text-secondary border-secondary/20";
    case "partner":
    case "mentor":   return "bg-accent/10 text-accent border-accent/20";
    default:         return "bg-muted text-muted-foreground border-border";
  }
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

/**
 * Format a birthday string (YYYY-MM-DD or 1900-MM-DD sentinel) for display.
 * If the year is 1900 (meaning "year unknown"), renders only Month Day.
 */
function formatBirthday(birthday: string): string {
  const parts = birthday.split("T")[0].split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const d = new Date(year, month, day);
  if (year === 1900) {
    return format(d, "MMMM do");
  }
  return format(d, "MMMM do, yyyy");
}

/**
 * Parse a stored birthday (YYYY-MM-DD or 1900-MM-DD) into { mmdd, year } form fields.
 */
function parseBirthday(b?: string | null): { mmdd: string; year: string } {
  if (!b) return { mmdd: "", year: "" };
  const p = b.split("T")[0].split("-");
  return { mmdd: `${p[1]}-${p[2]}`, year: p[0] === "1900" ? "" : p[0] };
}

export default function People() {
  const [, setLocation] = useLocation();
  const { data: people, isLoading } = useGetPeople();
  const { data: reminders } = useGetPeopleReminders();
  const [filter, setFilter] = useState<RelationshipFilter>("all");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

  const overdueIds = new Set(reminders?.overdueConnections.map((oc) => oc.personId) ?? []);

  const filteredPeople = people?.filter((p) => {
    if (filter === "overdue") return overdueIds.has(p.id);
    if (filter === "all") return true;
    return p.relationship === filter;
  }) || [];

  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto w-full space-y-10 animate-in fade-in duration-700 slide-in-from-bottom-4">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/50 pb-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground">The People Who Made Me</h1>
          <p className="text-muted-foreground font-subheading text-sm max-w-md">
            Every person who shaped your story lives here. With their own timeline.
          </p>
        </div>
        <Button
          onClick={() => { setEditingPerson(null); setIsFormOpen(true); }}
          className="bg-card border border-border hover:bg-muted text-foreground rounded-full px-6 font-subheading"
        >
          <Plus className="w-4 h-4 mr-2" /> Add to My Circle
        </Button>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["all", "family", "friend", "partner", "mentor", "colleague", "other"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as RelationshipFilter)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-subheading capitalize transition-colors border",
              filter === f
                ? "bg-foreground text-background border-foreground"
                : "bg-card/50 text-muted-foreground border-border/50 hover:bg-muted/50"
            )}
          >
            {f}
          </button>
        ))}
        {overdueIds.size > 0 && (
          <button
            onClick={() => setFilter("overdue")}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-subheading transition-colors border flex items-center gap-1.5",
              filter === "overdue"
                ? "bg-rose-500 text-white border-rose-500"
                : "bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20"
            )}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Overdue
            <span className="bg-rose-500/20 text-rose-400 rounded-full px-1.5 py-0.5 text-xs leading-none">
              {overdueIds.size}
            </span>
          </button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-xl bg-muted/30" />)}
        </div>
      ) : filteredPeople.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-border/50 rounded-2xl bg-card/20">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-serif text-foreground mb-2">No people found</h3>
          <p className="text-sm text-muted-foreground font-subheading max-w-sm mx-auto">
            {filter === "all" ? "Begin building your circle of influence and love." : filter === "overdue" ? "No overdue connections right now. Keep nurturing your relationships." : `No one categorized as ${filter} yet.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPeople.map((person, index) => (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedPerson(person)}
              className={cn(
                "bg-card/40 border rounded-2xl p-6 cursor-pointer transition-all hover:bg-card hover:border-primary/30 group relative overflow-hidden",
                person.lostDate ? "border-primary/20 bg-primary/5" : "border-border/50"
              )}
            >
              {person.lostDate && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-[100px] -z-10 blur-xl" />
              )}
              {overdueIds.has(person.id) && (
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-rose-500/15 border border-rose-500/30 rounded-full px-2 py-0.5">
                  <AlertCircle className="w-3 h-3 text-rose-400" />
                  <span className="text-xs text-rose-400 font-subheading">Overdue</span>
                </div>
              )}

              <div className="flex items-start gap-4 mb-4">
                {/* Avatar */}
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center font-serif text-lg shrink-0 border",
                  person.lostDate
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-muted/50 border-border text-foreground group-hover:border-primary/30 group-hover:text-primary"
                )}>
                  {getInitials(person.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xl font-serif text-foreground group-hover:text-primary transition-colors truncate">
                      {person.name}
                    </h3>
                    {person.relationship && (
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-subheading capitalize border shrink-0",
                        getRelationshipColor(person.relationship)
                      )}>
                        {person.relationship}
                      </span>
                    )}
                  </div>
                  {person.lostDate && (
                    <span className="text-xs font-serif italic text-primary/70">In memory</span>
                  )}
                </div>
              </div>

              {person.bio && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{person.bio}</p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                {person.note ? (
                  <p className="text-xs text-foreground/60 font-serif italic line-clamp-1 flex-1">"{person.note}"</p>
                ) : (
                  <span />
                )}
                <span className="flex items-center gap-1 text-xs text-muted-foreground/50 font-subheading group-hover:text-primary transition-colors ml-2 shrink-0">
                  Timeline <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail + Timeline Sheet */}
      <Sheet open={!!selectedPerson} onOpenChange={(o) => !o && setSelectedPerson(null)}>
        <SheetContent className="w-full sm:max-w-lg border-l border-border bg-background p-0 overflow-y-auto">
          {selectedPerson && (
            <PersonDetail
              person={selectedPerson}
              onEdit={() => { setSelectedPerson(null); setEditingPerson(selectedPerson); setIsFormOpen(true); }}
              onMessage={() => { setSelectedPerson(null); setLocation(`/future?recipient=${encodeURIComponent(selectedPerson.name)}`); }}
              onClose={() => setSelectedPerson(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Person form */}
      <PersonFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} person={editingPerson} />
    </div>
  );
}

function PersonDetail({ person, onEdit, onMessage, onClose }: {
  person: Person;
  onEdit: () => void;
  onMessage: () => void;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: moments = [], isLoading: loadingMoments } = useGetRelationshipMoments(person.id);
  const createMoment = useCreateRelationshipMoment();
  const deleteMoment = useDeleteRelationshipMoment();
  const [showAddMoment, setShowAddMoment] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [momentForm, setMomentForm] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "memory" as string,
    title: "",
    description: "",
  });

  function invalidateMoments() {
    qc.invalidateQueries({ queryKey: getGetRelationshipMomentsQueryKey(person.id) });
  }

  async function handleAddMoment(e: React.FormEvent) {
    e.preventDefault();
    await createMoment.mutateAsync({
      personId: person.id,
      data: momentForm as any,
    });
    invalidateMoments();
    setShowAddMoment(false);
    setMomentForm({ date: new Date().toISOString().split("T")[0], type: "memory", title: "", description: "" });
  }

  async function handleDeleteMoment(momentId: number) {
    await deleteMoment.mutateAsync({ personId: person.id, id: momentId });
    invalidateMoments();
    setConfirmDeleteId(null);
  }

  // Group moments by year
  const byYear = moments.reduce<Record<string, RelationshipMoment[]>>((acc, m) => {
    const y = m.date.split("-")[0];
    if (!acc[y]) acc[y] = [];
    acc[y].push(m);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="relative">
      {person.lostDate && (
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
      )}

      <div className="p-7 space-y-7">
        {/* Header */}
        <SheetHeader className="space-y-4 text-left">
          <div className="flex items-center justify-between">
            {person.relationship && (
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-subheading capitalize border inline-flex",
                getRelationshipColor(person.relationship)
              )}>
                {person.relationship}
              </span>
            )}
            <div className="flex items-center gap-1 ml-auto">
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <Edit3 className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center font-serif text-2xl border shrink-0",
              person.lostDate ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/50 border-border text-foreground"
            )}>
              {getInitials(person.name)}
            </div>
            <div>
              <SheetTitle className="text-2xl font-serif text-foreground">{person.name}</SheetTitle>
              {person.lostDate && (
                <p className="text-primary/80 font-serif italic text-sm mt-0.5">
                  Remembered since {format(parseISO(person.lostDate), "MMMM yyyy")}
                </p>
              )}
              {person.birthday && (
                <p className="text-muted-foreground font-subheading text-xs mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Born {formatBirthday(person.birthday)}
                </p>
              )}
            </div>
          </div>
        </SheetHeader>

        {person.bio && (
          <div>
            <h4 className="text-xs font-subheading uppercase tracking-widest text-muted-foreground mb-2">Who they are</h4>
            <p className="text-foreground/90 leading-relaxed text-sm">{person.bio}</p>
          </div>
        )}

        {person.lostDate && (
          <div className="bg-card border border-primary/20 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full" />
            <p className="font-serif italic text-primary/90 text-base leading-relaxed relative z-10">
              "Some souls leave footprints that never fade."
            </p>
          </div>
        )}

        {person.note && (
          <div>
            <h4 className="text-xs font-subheading uppercase tracking-widest text-muted-foreground mb-2">Notes & Memories</h4>
            <div className="bg-muted/20 border border-border/50 rounded-xl p-5">
              <p className="font-serif text-foreground/90 leading-relaxed text-sm whitespace-pre-wrap">{person.note}</p>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-subheading uppercase tracking-widest text-muted-foreground">Relationship Timeline</h4>
            <button
              onClick={() => setShowAddMoment(v => !v)}
              className="flex items-center gap-1 text-xs text-primary font-subheading hover:text-primary/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add moment
            </button>
          </div>

          {/* Add Moment Form */}
          <AnimatePresence>
            {showAddMoment && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-card border border-primary/20 rounded-xl p-4 space-y-3 overflow-hidden"
                onSubmit={handleAddMoment}
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground font-subheading mb-1 block">Date</label>
                    <input
                      type="date"
                      required
                      value={momentForm.date}
                      onChange={e => setMomentForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-subheading"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-subheading mb-1 block">Type</label>
                    <select
                      value={momentForm.type}
                      onChange={e => setMomentForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-subheading"
                    >
                      {Object.entries(MOMENT_META).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <input
                  required
                  placeholder="What happened? (short title)"
                  value={momentForm.title}
                  onChange={e => setMomentForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-subheading"
                />
                <textarea
                  rows={3}
                  placeholder="The details — what you want to remember (optional)"
                  value={momentForm.description}
                  onChange={e => setMomentForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-subheading resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddMoment(false)}
                    className="font-subheading text-muted-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={createMoment.isPending}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-subheading flex-1"
                  >
                    {createMoment.isPending ? "Adding..." : "Add to Timeline"}
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Timeline list */}
          {loadingMoments ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : moments.length === 0 ? (
            <div className="border border-dashed border-border/50 rounded-xl p-6 text-center">
              <Clock className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-subheading">No moments logged yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Add conversations, promises, memories — anything that matters.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border/50" />

              <div className="space-y-0">
                {years.map(year => (
                  <div key={year}>
                    {/* Year marker */}
                    <div className="flex items-center gap-3 mb-2 mt-4 first:mt-0">
                      <div className="w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center shrink-0 relative z-10">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                      </div>
                      <span className="text-xs font-subheading text-muted-foreground/60 font-medium">{year}</span>
                    </div>

                    <div className="ml-9 space-y-3">
                      {byYear[year].map((moment) => {
                        const meta = MOMENT_META[moment.type] || MOMENT_META.other;
                        const Icon = meta.icon;
                        return (
                          <motion.div
                            key={moment.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="relative group"
                          >
                            {/* Dot on the timeline */}
                            <div className={cn(
                              "absolute -left-[25px] top-3 w-2.5 h-2.5 rounded-full border-2 border-background z-10",
                              meta.dot
                            )} />

                            <div className="bg-card/60 border border-border rounded-xl p-3.5 hover:border-primary/30 transition-all">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                  <span className={cn(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border font-subheading shrink-0 mt-0.5",
                                    meta.color
                                  )}>
                                    <Icon className="w-2.5 h-2.5" />
                                    {meta.label}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-subheading text-sm font-medium text-foreground leading-tight">{moment.title}</p>
                                    <p className="text-[10px] text-muted-foreground font-subheading mt-0.5">
                                      {format(parseISO(moment.date), "MMMM d")}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(moment.id); }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive rounded"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>

                              {moment.description && (
                                <p className="text-xs text-muted-foreground/80 mt-2 leading-relaxed font-subheading border-t border-border/50 pt-2">
                                  {moment.description}
                                </p>
                              )}

                              {/* Confirm delete */}
                              <AnimatePresence>
                                {confirmDeleteId === moment.id && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-destructive/20 overflow-hidden"
                                  >
                                    <span className="text-xs text-muted-foreground font-subheading">Remove this moment?</span>
                                    <div className="flex gap-1">
                                      <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-muted-foreground font-subheading px-2 py-0.5 hover:text-foreground">Cancel</button>
                                      <button onClick={() => handleDeleteMoment(moment.id)} className="text-xs text-destructive font-subheading px-2 py-0.5 hover:text-destructive/80">Delete</button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-2 border-t border-border">
          <Button
            className="w-full bg-card hover:bg-card/80 border border-border text-foreground py-5 rounded-xl font-subheading"
            onClick={onMessage}
          >
            <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
            Write Them a Message
          </Button>
        </div>
      </div>
    </div>
  );
}

function PersonFormDialog({ open, onOpenChange, person }: { open: boolean; onOpenChange: (o: boolean) => void; person: Person | null }) {
  const queryClient = useQueryClient();
  const createPerson = useCreatePerson();
  const updatePerson = useUpdatePerson();

  const bd = parseBirthday(person?.birthday);

  const [formData, setFormData] = useState({
    name: person?.name || "",
    relationship: (person?.relationship as RelationshipFilter) || "other",
    bio: person?.bio || "",
    birthdayMMDD: bd.mmdd,
    birthdayYear: bd.year,
    lostDate: person?.lostDate ? person.lostDate.split("T")[0] : "",
    note: person?.note || "",
    anniversary: person?.anniversary ? person.anniversary.split("T")[0] : "",
    anniversaryLabel: person?.anniversaryLabel || "",
    // "none" is the sentinel for "no reminder" (avoids Radix Select empty-value bug)
    reconnectDays: person?.reconnectDays?.toString() || "none",
    customReminders: (person?.customReminders ?? []) as Array<{ date: string; label: string }>,
  });

  const set = (patch: Partial<typeof formData>) => setFormData(f => ({ ...f, ...patch }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const birthday = formData.birthdayMMDD
      ? `${formData.birthdayYear || "1900"}-${formData.birthdayMMDD}`
      : undefined;

    const payload = {
      name: formData.name,
      relationship: formData.relationship as Exclude<RelationshipFilter, "all" | "overdue">,
      bio: formData.bio || undefined,
      birthday,
      lostDate: formData.lostDate || undefined,
      note: formData.note || undefined,
      anniversary: formData.anniversary || undefined,
      anniversaryLabel: formData.anniversaryLabel || undefined,
      // "none" → null to explicitly clear the reconnect reminder in the DB
      reconnectDays: formData.reconnectDays !== "none" ? Number(formData.reconnectDays) : null,
      customReminders: formData.customReminders.filter(cr => cr.date && cr.label),
    };

    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getGetPeopleQueryKey() });
      onOpenChange(false);
    };

    if (person) {
      updatePerson.mutate({ id: person.id, data: payload }, { onSuccess });
    } else {
      createPerson.mutate({ data: payload }, { onSuccess });
    }
  };

  const isPending = createPerson.isPending || updatePerson.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-background border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{person ? "Update Details" : "Add to My Circle"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Name</label>
            <Input value={formData.name} onChange={e => set({ name: e.target.value })} className="bg-card border-border" required />
          </div>

          {/* Relationship */}
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Relationship</label>
            <Select value={formData.relationship} onValueChange={(v: RelationshipFilter) => set({ relationship: v })}>
              <SelectTrigger className="bg-card border-border capitalize">
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="friend">Friend</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
                <SelectItem value="mentor">Mentor</SelectItem>
                <SelectItem value="colleague">Colleague</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Short Bio */}
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Short Bio</label>
            <Input value={formData.bio} onChange={e => set({ bio: e.target.value })} maxLength={100} className="bg-card border-border" placeholder="e.g. My father who passed when I was 14." />
          </div>

          {/* Birthday — month/day required, year optional */}
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground flex items-center gap-1.5">
              <Cake className="w-3.5 h-3.5" /> Birthday
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  placeholder="MM-DD"
                  value={formData.birthdayMMDD}
                  onChange={e => set({ birthdayMMDD: e.target.value })}
                  className="bg-card border-border"
                  maxLength={5}
                />
                <span className="text-xs text-muted-foreground/60 mt-0.5 block font-subheading">Month-Day</span>
              </div>
              <div>
                <Input
                  type="number"
                  min="1900"
                  max="2099"
                  placeholder="e.g. 1985"
                  value={formData.birthdayYear}
                  onChange={e => set({ birthdayYear: e.target.value })}
                  className="bg-card border-border"
                />
                <span className="text-xs text-muted-foreground/60 mt-0.5 block font-subheading">Year (optional)</span>
              </div>
            </div>
          </div>

          {/* Date of Passing */}
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Date of Passing</label>
            <Input type="date" value={formData.lostDate} onChange={e => set({ lostDate: e.target.value })} className="bg-card border-border block" />
          </div>

          {/* Anniversary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-subheading text-muted-foreground">Anniversary Date</label>
              <Input type="date" value={formData.anniversary} onChange={e => set({ anniversary: e.target.value })} className="bg-card border-border block" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-subheading text-muted-foreground">Anniversary Label</label>
              <Input value={formData.anniversaryLabel} onChange={e => set({ anniversaryLabel: e.target.value })} className="bg-card border-border" placeholder="e.g. Wedding Anniversary" />
            </div>
          </div>

          {/* Custom reminder dates */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-subheading text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Custom Reminder Dates
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => set({ customReminders: [...formData.customReminders, { date: "", label: "" }] })}
              >
                + Add
              </Button>
            </div>
            {formData.customReminders.length === 0 && (
              <p className="text-xs text-muted-foreground/50 font-subheading">
                e.g. Sobriety Date (03-15), First Meeting (07-22)
              </p>
            )}
            {formData.customReminders.map((cr, i) => (
              <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
                <Input
                  placeholder="MM-DD"
                  value={cr.date}
                  maxLength={5}
                  onChange={e => {
                    const u = [...formData.customReminders];
                    u[i] = { ...u[i], date: e.target.value };
                    set({ customReminders: u });
                  }}
                  className="bg-card border-border"
                />
                <Input
                  placeholder="Label"
                  value={cr.label}
                  onChange={e => {
                    const u = [...formData.customReminders];
                    u[i] = { ...u[i], label: e.target.value };
                    set({ customReminders: u });
                  }}
                  className="bg-card border-border"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => set({ customReminders: formData.customReminders.filter((_, idx) => idx !== i) })}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {/* Reconnect reminder */}
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Reconnect Reminder
            </label>
            <Select value={formData.reconnectDays} onValueChange={v => set({ reconnectDays: v })}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No reminder</SelectItem>
                <SelectItem value="30">Every 30 days</SelectItem>
                <SelectItem value="60">Every 60 days</SelectItem>
                <SelectItem value="90">Every 90 days</SelectItem>
                <SelectItem value="180">Every 180 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Private Notes */}
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Private Notes</label>
            <Textarea value={formData.note} onChange={e => set({ note: e.target.value })} className="bg-card border-border min-h-[80px] resize-none" placeholder="Memories, quirks, what they meant to you..." />
          </div>

          <div className="flex justify-end pt-2 gap-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!formData.name || isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {person ? "Save Changes" : "Add Person"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
