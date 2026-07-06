import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetLegacyLetters,
  useCreateLegacyLetter,
  useUpdateLegacyLetter,
  useDeleteLegacyLetter,
  useSealLegacyLetter,
  useUnsealLegacyLetter,
  getGetLegacyLettersQueryKey,
} from "@workspace/api-client-react";
import type { LegacyLetter } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Mail, Lock, Unlock, Plus, X, Calendar, User, Heart,
  Milestone, Clock, Trash2, Edit3, Send, BookOpen, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const TRIGGER_META: Record<string, { label: string; icon: React.ElementType; description: string; color: string }> = {
  date:      { label: "On a Date",        icon: Calendar,   description: "Delivered on a specific date",          color: "text-primary  bg-primary/10  border-primary/30" },
  milestone: { label: "At a Milestone",   icon: Milestone,  description: "Graduation, marriage, birth of a child", color: "text-accent   bg-accent/10   border-accent/30" },
  if_gone:   { label: "If I'm Gone",      icon: Heart,      description: "Delivered if something happens to you",  color: "text-rose-400 bg-rose-400/10 border-rose-400/30" },
  manual:    { label: "Manual Send",      icon: Send,       description: "You choose exactly when to send it",     color: "text-secondary bg-secondary/10 border-secondary/30" },
};

const STATUS_STYLE: Record<string, string> = {
  draft:     "text-muted-foreground bg-muted/30 border-border",
  sealed:    "text-accent bg-accent/10 border-accent/30",
  delivered: "text-secondary bg-secondary/10 border-secondary/30",
};

type FormState = {
  title: string;
  content: string;
  recipientName: string;
  recipientRelation: string;
  triggerType: "date" | "milestone" | "manual" | "if_gone";
  triggerDate: string;
  milestone: string;
};

const EMPTY_FORM: FormState = {
  title: "", content: "", recipientName: "", recipientRelation: "",
  triggerType: "date", triggerDate: "", milestone: "",
};

export default function LegacyLetters() {
  const qc = useQueryClient();
  const { data: letters = [], isLoading } = useGetLegacyLetters();
  const createLetter = useCreateLegacyLetter();
  const updateLetter = useUpdateLegacyLetter();
  const deleteLetter = useDeleteLegacyLetter();
  const sealLetter = useSealLegacyLetter();
  const unsealLetter = useUnsealLegacyLetter();

  const [view, setView] = useState<"list" | "write" | "read">("list");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [readingLetter, setReadingLetter] = useState<LegacyLetter | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetLegacyLettersQueryKey() });
  }

  function openWrite(letter?: LegacyLetter) {
    if (letter) {
      setForm({
        title: letter.title,
        content: letter.content,
        recipientName: letter.recipientName,
        recipientRelation: letter.recipientRelation || "",
        triggerType: letter.triggerType as FormState["triggerType"],
        triggerDate: letter.triggerDate || "",
        milestone: letter.milestone || "",
      });
      setEditingId(letter.id);
    } else {
      setForm(EMPTY_FORM);
      setEditingId(null);
    }
    setView("write");
  }

  function openRead(letter: LegacyLetter) {
    setReadingLetter(letter);
    setView("read");
  }

  function goBack() {
    setView("list");
    setReadingLetter(null);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave(e: React.FormEvent, seal = false) {
    e.preventDefault();
    const payload = { ...form, status: seal ? "sealed" as const : "draft" as const, isSealed: seal };
    if (editingId) {
      await updateLetter.mutateAsync({ id: editingId, data: payload as any });
      if (seal) await sealLetter.mutateAsync({ id: editingId });
    } else {
      const created = await createLetter.mutateAsync({ data: { ...payload, userId: 1 } as any });
      if (seal) await sealLetter.mutateAsync({ id: (created as LegacyLetter).id });
    }
    invalidate();
    goBack();
  }

  async function handleSeal(id: number) {
    await sealLetter.mutateAsync({ id });
    invalidate();
  }

  async function handleUnseal(id: number) {
    await unsealLetter.mutateAsync({ id });
    invalidate();
  }

  async function handleDelete(id: number) {
    await deleteLetter.mutateAsync({ id });
    invalidate();
    setConfirmDelete(null);
    if (view === "read") goBack();
  }

  const filtered = letters.filter(l => {
    if (activeFilter === "all") return true;
    return l.status === activeFilter;
  });

  const sealed = letters.filter(l => l.status === "sealed").length;
  const drafts = letters.filter(l => l.status === "draft").length;

  if (view === "write") {
    return <WriteView form={form} setForm={setForm} editingId={editingId} onSave={handleSave} onBack={goBack} isPending={createLetter.isPending || updateLetter.isPending || sealLetter.isPending} />;
  }

  if (view === "read" && readingLetter) {
    return (
      <ReadView
        letter={readingLetter}
        onBack={goBack}
        onEdit={() => openWrite(readingLetter)}
        onSeal={() => handleSeal(readingLetter.id)}
        onUnseal={() => handleUnseal(readingLetter.id)}
        onDelete={() => setConfirmDelete(readingLetter.id)}
        confirmDelete={confirmDelete}
        setConfirmDelete={setConfirmDelete}
        handleDelete={handleDelete}
      />
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto w-full space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/50 pb-8">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground">Legacy Letters</h1>
          <p className="text-muted-foreground font-subheading text-sm max-w-md">
            Words that outlive the moment they're written. Sent at the right time, to the right person.
          </p>
        </div>
        <Button
          onClick={() => openWrite()}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-subheading gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> Write a Letter
        </Button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Letters", value: letters.length, icon: Mail, color: "text-primary" },
          { label: "Sealed & Ready", value: sealed, icon: Lock, color: "text-accent" },
          { label: "In Draft", value: drafts, icon: Edit3, color: "text-muted-foreground" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
            <Icon className={cn("w-5 h-5 mx-auto mb-2", color)} />
            <p className="text-2xl font-serif text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground font-subheading mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["all", "draft", "sealed", "delivered"].map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-subheading border transition-all capitalize",
              activeFilter === f
                ? "bg-primary/15 border-primary/50 text-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
            )}
          >
            {f === "all" ? "All Letters" : f}
          </button>
        ))}
      </div>

      {/* Letters list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState onWrite={() => openWrite()} />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((letter, i) => (
              <motion.div
                key={letter.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.04 }}
              >
                <LetterCard
                  letter={letter}
                  onRead={() => openRead(letter)}
                  onEdit={() => openWrite(letter)}
                  onSeal={() => handleSeal(letter.id)}
                  onUnseal={() => handleUnseal(letter.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function LetterCard({ letter, onRead, onEdit, onSeal, onUnseal }: {
  letter: LegacyLetter;
  onRead: () => void;
  onEdit: () => void;
  onSeal: () => void;
  onUnseal: () => void;
}) {
  const trigger = TRIGGER_META[letter.triggerType] || TRIGGER_META.manual;
  const TriggerIcon = trigger.icon;

  return (
    <div
      className={cn(
        "bg-card border rounded-xl p-5 transition-all duration-200 hover:border-primary/40 cursor-pointer group",
        letter.isSealed ? "border-accent/30 bg-accent/5" : "border-border"
      )}
      onClick={onRead}
    >
      <div className="flex items-start gap-4">
        {/* Envelope icon */}
        <div className={cn(
          "p-3 rounded-xl border shrink-0 transition-colors",
          letter.isSealed ? "bg-accent/10 border-accent/30 text-accent" : "bg-muted/30 border-border text-muted-foreground group-hover:border-primary/30 group-hover:text-primary"
        )}>
          {letter.isSealed ? <Lock className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-serif text-lg text-foreground group-hover:text-primary transition-colors truncate">{letter.title}</h3>
            <span className={cn("px-2 py-0.5 rounded-full text-xs border font-subheading capitalize shrink-0", STATUS_STYLE[letter.status])}>
              {letter.status}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-muted-foreground font-subheading">
              <User className="w-3 h-3" /> {letter.recipientName}
              {letter.recipientRelation && <span className="text-muted-foreground/60"> · {letter.recipientRelation}</span>}
            </span>
            <span className={cn("flex items-center gap-1 text-xs font-subheading px-2 py-0.5 rounded-full border", trigger.color)}>
              <TriggerIcon className="w-3 h-3" /> {trigger.label}
              {letter.triggerDate && ` · ${format(new Date(letter.triggerDate + "T12:00:00"), "MMM d, yyyy")}`}
            </span>
          </div>

          <p className="text-muted-foreground/70 text-sm mt-2 line-clamp-2 leading-relaxed">
            {letter.content}
          </p>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-1" />
      </div>

      {/* Action strip for draft letters */}
      {!letter.isSealed && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-border" onClick={e => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
            className="gap-1 text-muted-foreground hover:text-foreground text-xs h-7 px-2"
          >
            <Edit3 className="w-3 h-3" /> Edit
          </Button>
          <Button
            size="sm"
            onClick={onSeal}
            className="gap-1 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 text-xs h-7 px-3 font-subheading"
          >
            <Lock className="w-3 h-3" /> Seal Letter
          </Button>
        </div>
      )}
    </div>
  );
}

function WriteView({ form, setForm, editingId, onSave, onBack, isPending }: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  editingId: number | null;
  onSave: (e: React.FormEvent, seal?: boolean) => Promise<void>;
  onBack: () => void;
  isPending: boolean;
}) {
  const trigger = TRIGGER_META[form.triggerType];

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center gap-3 border-b border-border/50 pb-6">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/50 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-serif text-foreground">
            {editingId ? "Edit Letter" : "Write a Legacy Letter"}
          </h1>
          <p className="text-muted-foreground text-sm font-subheading">Words that will find them at the right moment.</p>
        </div>
      </header>

      <form onSubmit={(e) => onSave(e, false)} className="space-y-6">
        {/* Recipient */}
        <section className="space-y-3">
          <h2 className="text-sm font-subheading text-muted-foreground uppercase tracking-wider">Who is this for?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground font-subheading mb-1 block">Name *</label>
              <input
                required
                placeholder="e.g. Shadrick Jr."
                value={form.recipientName}
                onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-subheading"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-subheading mb-1 block">Relationship</label>
              <input
                placeholder="e.g. My son, My sister"
                value={form.recipientRelation}
                onChange={e => setForm(f => ({ ...f, recipientRelation: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-subheading"
              />
            </div>
          </div>
        </section>

        {/* Trigger */}
        <section className="space-y-3">
          <h2 className="text-sm font-subheading text-muted-foreground uppercase tracking-wider">When should they receive this?</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(TRIGGER_META).map(([key, meta]) => {
              const Icon = meta.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, triggerType: key as FormState["triggerType"] }))}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all",
                    form.triggerType === key
                      ? cn("border-primary/50 bg-primary/10", meta.color)
                      : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-subheading leading-tight">{meta.label}</span>
                </button>
              );
            })}
          </div>

          <div className={cn("rounded-lg px-3 py-2 text-xs font-subheading border", trigger.color)}>
            {trigger.description}
          </div>

          {form.triggerType === "date" && (
            <div>
              <label className="text-xs text-muted-foreground font-subheading mb-1 block">Delivery Date</label>
              <input
                type="date"
                value={form.triggerDate}
                onChange={e => setForm(f => ({ ...f, triggerDate: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary font-subheading"
              />
            </div>
          )}

          {form.triggerType === "milestone" && (
            <div>
              <label className="text-xs text-muted-foreground font-subheading mb-1 block">Describe the milestone</label>
              <input
                placeholder="e.g. When you graduate college, When you become a father"
                value={form.milestone}
                onChange={e => setForm(f => ({ ...f, milestone: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-subheading"
              />
            </div>
          )}
        </section>

        {/* Letter */}
        <section className="space-y-3">
          <h2 className="text-sm font-subheading text-muted-foreground uppercase tracking-wider">The letter</h2>
          <input
            required
            placeholder="Subject line"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-subheading"
          />
          <textarea
            required
            placeholder={"Start writing...\n\nThis is your space. Be honest. Be you. They will feel it."}
            rows={14}
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-subheading resize-none leading-relaxed"
          />
        </section>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={isPending}
            variant="outline"
            className="flex-1 border-border text-muted-foreground hover:text-foreground font-subheading"
          >
            Save as Draft
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={(e) => onSave(e as any, true)}
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-subheading gap-2"
          >
            <Lock className="w-4 h-4" />
            {isPending ? "Sealing..." : "Seal & Finish"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function ReadView({ letter, onBack, onEdit, onSeal, onUnseal, onDelete, confirmDelete, setConfirmDelete, handleDelete }: {
  letter: LegacyLetter;
  onBack: () => void;
  onEdit: () => void;
  onSeal: () => void;
  onUnseal: () => void;
  onDelete: () => void;
  confirmDelete: number | null;
  setConfirmDelete: (id: number | null) => void;
  handleDelete: (id: number) => void;
}) {
  const trigger = TRIGGER_META[letter.triggerType] || TRIGGER_META.manual;
  const TriggerIcon = trigger.icon;

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between border-b border-border/50 pb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-subheading text-sm">
          <X className="w-4 h-4" /> Close
        </button>
        <div className="flex items-center gap-2">
          {!letter.isSealed && (
            <Button size="sm" variant="ghost" onClick={onEdit} className="gap-1 text-muted-foreground hover:text-foreground font-subheading">
              <Edit3 className="w-3.5 h-3.5" /> Edit
            </Button>
          )}
          {letter.isSealed ? (
            <Button size="sm" variant="outline" onClick={onUnseal} className="gap-1 border-border text-muted-foreground hover:text-foreground font-subheading">
              <Unlock className="w-3.5 h-3.5" /> Unseal
            </Button>
          ) : (
            <Button size="sm" onClick={onSeal} className="gap-1 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 font-subheading">
              <Lock className="w-3.5 h-3.5" /> Seal Letter
            </Button>
          )}
          <button onClick={onDelete} className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Letter metadata */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          {letter.isSealed && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/30 rounded-lg">
              <Lock className="w-4 h-4 text-accent" />
              <span className="text-sm font-subheading text-accent">Sealed</span>
            </div>
          )}
          <span className={cn("flex items-center gap-1.5 text-xs font-subheading px-2.5 py-1 rounded-full border", trigger.color)}>
            <TriggerIcon className="w-3.5 h-3.5" />
            {trigger.label}
            {letter.triggerDate && ` · ${format(new Date(letter.triggerDate + "T12:00:00"), "MMMM d, yyyy")}`}
            {letter.milestone && ` · ${letter.milestone}`}
          </span>
        </div>

        <div className="bg-card/50 border border-border rounded-xl px-5 py-4 space-y-1">
          <p className="text-xs text-muted-foreground font-subheading uppercase tracking-wider">To</p>
          <p className="font-serif text-lg text-foreground">{letter.recipientName}</p>
          {letter.recipientRelation && <p className="text-sm text-muted-foreground font-subheading">{letter.recipientRelation}</p>}
        </div>
      </div>

      {/* Letter content */}
      <div className="bg-card border border-border rounded-2xl p-8 space-y-4">
        <h2 className="font-serif text-2xl text-foreground border-b border-border/50 pb-4">{letter.title}</h2>
        <div className="prose prose-sm prose-invert max-w-none">
          {letter.content.split("\n").map((paragraph, i) => (
            paragraph.trim() ? (
              <p key={i} className="text-foreground/85 leading-relaxed font-subheading text-sm mb-4">{paragraph}</p>
            ) : (
              <br key={i} />
            )
          ))}
        </div>
        <div className="pt-4 border-t border-border/50 flex justify-between items-center">
          <p className="text-xs text-muted-foreground font-subheading">
            Written {format(new Date(letter.createdAt), "MMMM d, yyyy")}
          </p>
          <BookOpen className="w-4 h-4 text-muted-foreground/30" />
        </div>
      </div>

      {/* Confirm delete */}
      <AnimatePresence>
        {confirmDelete === letter.id && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-center justify-between gap-4"
          >
            <p className="text-sm text-foreground font-subheading">Delete this letter permanently?</p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)} className="font-subheading text-muted-foreground">Cancel</Button>
              <Button size="sm" onClick={() => handleDelete(letter.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-subheading">Delete</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ onWrite }: { onWrite: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/40 border border-dashed border-border rounded-2xl p-12 text-center space-y-5"
    >
      <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto">
        <Mail className="w-7 h-7 text-primary" />
      </div>
      <div className="space-y-2 max-w-sm mx-auto">
        <h3 className="font-serif text-xl text-foreground">No letters yet</h3>
        <p className="text-muted-foreground text-sm font-subheading leading-relaxed">
          Write something today that your son will read on his graduation day. 
          Or words for your daughter on her wedding day. Or a letter for when you're gone.
        </p>
      </div>
      <Button
        onClick={onWrite}
        className="bg-primary hover:bg-primary/90 text-primary-foreground font-subheading gap-2 mx-auto"
      >
        <Plus className="w-4 h-4" /> Write Your First Letter
      </Button>
    </motion.div>
  );
}
