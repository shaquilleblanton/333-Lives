import { useState, useRef, useEffect } from "react";
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
import { useUpload } from "@workspace/object-storage-web";
import { useQueryClient } from "@tanstack/react-query";
import {
  Mail, Lock, Unlock, Plus, X, Calendar, User, Heart,
  Milestone, Clock, Trash2, Edit3, Send, BookOpen, ChevronRight,
  Mic, Square, RotateCcw, Sparkles, AudioLines, Loader2, Quote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
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

const PROMPT_CATEGORIES: { label: string; prompts: string[] }[] = [
  {
    label: "For your children",
    prompts: [
      "What do you hope they never forget about you?",
      "Describe the day they came into your life, and what you felt.",
      "The kind of person you dream they'll grow into.",
      "A lesson your own father taught you that you want to pass on.",
    ],
  },
  {
    label: "Love & loss",
    prompts: [
      "Tell them about someone you loved and lost.",
      "What grief has taught you about how to live.",
      "Something you wish you'd said to someone before they were gone.",
    ],
  },
  {
    label: "Wisdom & lessons",
    prompts: [
      "The hardest thing you've lived through, and what it gave you.",
      "What you know now that you wish you'd known at their age.",
      "How to tell the difference between what matters and what doesn't.",
    ],
  },
  {
    label: "If I'm gone",
    prompts: [
      "What you'd want them to do the morning after they lose you.",
      "The story of your name, and what it means to carry it forward.",
      "Permission — to be happy, to move forward, to live fully.",
    ],
  },
];

const MEDIA_BASE = "/api/storage";
function mediaSrc(path: string) {
  return `${MEDIA_BASE}${path}`;
}
function formatDuration(totalSec: number) {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

type FormState = {
  title: string;
  content: string;
  recipientName: string;
  recipientRelation: string;
  triggerType: "date" | "milestone" | "manual" | "if_gone";
  triggerDate: string;
  milestone: string;
  mediaType: "text" | "voice";
  mediaUrl: string;
  mediaDurationSec: number;
  promptText: string;
};

const EMPTY_FORM: FormState = {
  title: "", content: "", recipientName: "", recipientRelation: "",
  triggerType: "date", triggerDate: "", milestone: "",
  mediaType: "text", mediaUrl: "", mediaDurationSec: 0, promptText: "",
};

export default function LegacyLetters() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: letters = [], isLoading } = useGetLegacyLetters();
  const createLetter = useCreateLegacyLetter();
  const updateLetter = useUpdateLegacyLetter();
  const deleteLetter = useDeleteLegacyLetter();
  const sealLetter = useSealLegacyLetter();
  const unsealLetter = useUnsealLegacyLetter();

  function showError(description: string) {
    toast({
      variant: "destructive",
      title: "Something went wrong",
      description,
    });
  }

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
        mediaType: letter.mediaType === "voice" ? "voice" : "text",
        mediaUrl: letter.mediaUrl || "",
        mediaDurationSec: letter.mediaDurationSec || 0,
        promptText: letter.promptText || "",
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
    const isVoice = form.mediaType === "voice";
    if (isVoice ? !form.mediaUrl : !form.content.trim()) return;
    const payload = {
      title: form.title,
      content: isVoice ? "" : form.content,
      recipientName: form.recipientName,
      recipientRelation: form.recipientRelation,
      triggerType: form.triggerType,
      triggerDate: form.triggerDate,
      milestone: form.milestone,
      mediaType: form.mediaType,
      mediaUrl: isVoice ? form.mediaUrl : null,
      mediaDurationSec: isVoice ? form.mediaDurationSec : null,
      promptText: form.promptText || null,
      status: seal ? "sealed" as const : "draft" as const,
      isSealed: seal,
    };
    try {
      if (editingId) {
        await updateLetter.mutateAsync({ id: editingId, data: payload as any });
        if (seal) await sealLetter.mutateAsync({ id: editingId });
      } else {
        const created = await createLetter.mutateAsync({ data: { ...payload, userId: 1 } as any });
        if (seal) await sealLetter.mutateAsync({ id: (created as LegacyLetter).id });
      }
      invalidate();
      goBack();
    } catch {
      invalidate();
      showError(
        seal
          ? "We couldn't seal your letter. Please check your connection and try again."
          : "We couldn't save your letter. Please check your connection and try again."
      );
    }
  }

  async function handleSeal(id: number) {
    try {
      await sealLetter.mutateAsync({ id });
      invalidate();
    } catch {
      invalidate();
      showError("We couldn't seal that letter. Please try again.");
    }
  }

  async function handleUnseal(id: number) {
    try {
      await unsealLetter.mutateAsync({ id });
      invalidate();
    } catch {
      invalidate();
      showError("We couldn't unseal that letter. Please try again.");
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteLetter.mutateAsync({ id });
      invalidate();
      setConfirmDelete(null);
      if (view === "read") goBack();
    } catch {
      invalidate();
      showError("We couldn't delete that letter. Please try again.");
    }
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
          {letter.isSealed ? <Lock className="w-5 h-5" /> : letter.mediaType === "voice" ? <Mic className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
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

          {letter.mediaType === "voice" ? (
            <p className="flex items-center gap-1.5 text-muted-foreground/70 text-sm mt-2 font-subheading">
              <AudioLines className="w-3.5 h-3.5 text-primary" />
              Voice message{letter.mediaDurationSec ? ` · ${formatDuration(letter.mediaDurationSec)}` : ""}
            </p>
          ) : (
            <p className="text-muted-foreground/70 text-sm mt-2 line-clamp-2 leading-relaxed">
              {letter.content}
            </p>
          )}
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
  const isVoice = form.mediaType === "voice";
  const canFinish = isVoice ? !!form.mediaUrl : !!form.content.trim();

  function setMode(mode: "text" | "voice") {
    setForm(f => ({ ...f, mediaType: mode }));
  }

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

        {/* Message */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-subheading text-muted-foreground uppercase tracking-wider">The message</h2>
            <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
              <button
                type="button"
                onClick={() => setMode("text")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-subheading transition-all",
                  !isVoice ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Edit3 className="w-3.5 h-3.5" /> Write
              </button>
              <button
                type="button"
                onClick={() => setMode("voice")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-subheading transition-all",
                  isVoice ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Mic className="w-3.5 h-3.5" /> Record voice
              </button>
            </div>
          </div>

          <input
            required
            placeholder="Subject line"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-subheading"
          />

          <PromptPicker
            value={form.promptText}
            onPick={p => setForm(f => ({ ...f, promptText: p }))}
            onClear={() => setForm(f => ({ ...f, promptText: "" }))}
          />

          {isVoice ? (
            <VoiceRecorder
              mediaUrl={form.mediaUrl}
              mediaDurationSec={form.mediaDurationSec}
              onRecorded={(path, dur) => setForm(f => ({ ...f, mediaUrl: path, mediaDurationSec: dur }))}
              onCleared={() => setForm(f => ({ ...f, mediaUrl: "", mediaDurationSec: 0 }))}
            />
          ) : (
            <textarea
              required
              placeholder={"Start writing...\n\nThis is your space. Be honest. Be you. They will feel it."}
              rows={14}
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-subheading resize-none leading-relaxed"
            />
          )}
        </section>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={isPending || !canFinish}
            variant="outline"
            className="flex-1 border-border text-muted-foreground hover:text-foreground font-subheading"
          >
            Save as Draft
          </Button>
          <Button
            type="button"
            disabled={isPending || !canFinish}
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

        {letter.promptText && (
          <div className="flex items-start gap-2.5 rounded-xl bg-muted/30 border border-border/60 px-4 py-3">
            <Quote className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground font-subheading italic leading-relaxed">{letter.promptText}</p>
          </div>
        )}

        {letter.mediaType === "voice" && letter.mediaUrl ? (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-subheading">
              <AudioLines className="w-4 h-4 text-primary" />
              Voice message{letter.mediaDurationSec ? ` · ${formatDuration(letter.mediaDurationSec)}` : ""}
            </div>
            <audio controls src={mediaSrc(letter.mediaUrl)} className="w-full" />
          </div>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none">
            {letter.content.split("\n").map((paragraph, i) => (
              paragraph.trim() ? (
                <p key={i} className="text-foreground/85 leading-relaxed font-subheading text-sm mb-4">{paragraph}</p>
              ) : (
                <br key={i} />
              )
            ))}
          </div>
        )}
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

function PromptPicker({ value, onPick, onClear }: {
  value: string;
  onPick: (prompt: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeCat, setActiveCat] = useState(0);

  if (value) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
        <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <p className="flex-1 text-sm text-foreground/90 font-subheading italic leading-relaxed">{value}</p>
        <button type="button" onClick={onClear} className="text-muted-foreground hover:text-foreground shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-subheading text-muted-foreground">
          <Sparkles className="w-4 h-4 text-primary" /> Need a place to start?
        </span>
        <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-90")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <div className="flex gap-1.5 flex-wrap">
                {PROMPT_CATEGORIES.map((c, i) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => setActiveCat(i)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-subheading border transition-all",
                      activeCat === i
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                {PROMPT_CATEGORIES[activeCat].prompts.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { onPick(p); setOpen(false); }}
                    className="w-full text-left text-sm font-subheading text-foreground/80 hover:text-primary rounded-lg px-3 py-2 hover:bg-primary/5 transition-colors leading-relaxed"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VoiceRecorder({ mediaUrl, mediaDurationSec, onRecorded, onCleared }: {
  mediaUrl: string;
  mediaDurationSec: number;
  onRecorded: (path: string, durationSec: number) => void;
  onCleared: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "recording" | "uploading" | "ready">(mediaUrl ? "ready" : "idle");
  const [elapsed, setElapsed] = useState(0);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { uploadFile } = useUpload();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [localUrl]);

  function pickMime(): string {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac", "audio/ogg"];
    for (const c of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(c)) return c;
    }
    return "";
  }

  function extFor(mime: string): string {
    if (mime.includes("webm")) return "webm";
    if (mime.includes("mp4") || mime.includes("aac")) return "m4a";
    if (mime.includes("ogg")) return "ogg";
    return "webm";
  }

  async function startRecording() {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = ev => { if (ev.data.size > 0) chunksRef.current.push(ev.data); };
      recorder.onstop = () => handleStop(recorder.mimeType || mime);
      recorderRef.current = recorder;
      recorder.start();
      startRef.current = Date.now();
      setElapsed(0);
      setStatus("recording");
      timerRef.current = setInterval(() => {
        setElapsed(Math.round((Date.now() - startRef.current) / 1000));
      }, 250);
    } catch {
      setErrorMsg("Microphone access was blocked. Please allow it in your browser to record.");
      setStatus("idle");
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
  }

  async function handleStop(mime: string) {
    const duration = Math.max(1, Math.round((Date.now() - startRef.current) / 1000));
    const type = mime || "audio/webm";
    const blob = new Blob(chunksRef.current, { type });
    const url = URL.createObjectURL(blob);
    setLocalUrl(url);
    setStatus("uploading");
    const file = new File([blob], `voice-${Date.now()}.${extFor(type)}`, { type });
    const res = await uploadFile(file);
    if (res?.objectPath) {
      onRecorded(res.objectPath, duration);
      setStatus("ready");
    } else {
      setErrorMsg("We couldn't save your recording. Please try again.");
      setStatus("idle");
    }
  }

  function discard() {
    if (localUrl) { URL.revokeObjectURL(localUrl); setLocalUrl(null); }
    setElapsed(0);
    setStatus("idle");
    onCleared();
  }

  const playbackSrc = localUrl ?? (mediaUrl ? mediaSrc(mediaUrl) : null);

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6">
      {errorMsg && (
        <div className="mb-4 text-xs text-rose-400 font-subheading bg-rose-400/10 border border-rose-400/30 rounded-lg px-3 py-2">
          {errorMsg}
        </div>
      )}

      {status === "idle" && (
        <div className="flex flex-col items-center text-center gap-4 py-6">
          <button
            type="button"
            onClick={startRecording}
            className="w-20 h-20 rounded-full bg-primary/15 border border-primary/40 text-primary flex items-center justify-center hover:bg-primary/25 transition-all hover:scale-105"
          >
            <Mic className="w-8 h-8" />
          </button>
          <div className="space-y-1">
            <p className="font-serif text-lg text-foreground">Record your voice</p>
            <p className="text-xs text-muted-foreground font-subheading max-w-xs">
              Speak as if they're sitting across from you. Your voice will be theirs to keep.
            </p>
          </div>
        </div>
      )}

      {status === "recording" && (
        <div className="flex flex-col items-center text-center gap-5 py-6">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
            </span>
            <span className="font-serif text-3xl text-foreground tabular-nums">{formatDuration(elapsed)}</span>
          </div>
          <div className="flex items-end gap-1 h-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.span
                key={i}
                className="w-1 rounded-full bg-primary"
                animate={{ height: [6, 24, 6] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12 }}
              />
            ))}
          </div>
          <Button type="button" onClick={stopRecording} className="gap-2 bg-rose-500 hover:bg-rose-600 text-white font-subheading">
            <Square className="w-4 h-4" /> Stop Recording
          </Button>
        </div>
      )}

      {status === "uploading" && (
        <div className="flex flex-col items-center text-center gap-3 py-10">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-subheading">Saving your voice…</p>
        </div>
      )}

      {status === "ready" && playbackSrc && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary shrink-0">
              <AudioLines className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-subheading text-sm text-foreground">Voice message recorded</p>
              <p className="text-xs text-muted-foreground font-subheading">{formatDuration(mediaDurationSec || elapsed)}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={discard} className="gap-1.5 text-muted-foreground hover:text-foreground font-subheading">
              <RotateCcw className="w-3.5 h-3.5" /> Re-record
            </Button>
          </div>
          <audio controls src={playbackSrc} className="w-full" />
        </div>
      )}
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
