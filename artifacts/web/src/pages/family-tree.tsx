import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  useGetFamilyMembers,
  useCreateFamilyMember,
  useUpdateFamilyMember,
  useDeleteFamilyMember,
  useGetFamilyMemberMoments,
  useCreateFamilyMemberMoment,
  useDeleteFamilyMemberMoment,
  getGetFamilyMembersQueryKey,
  getGetFamilyMemberMomentsQueryKey,
} from "@workspace/api-client-react";
import type { FamilyMember, FamilyMemberMoment } from "@workspace/api-client-react";
import {
  GitBranch, Plus, User, Calendar, Trash2, Edit3, Loader2,
  ChevronRight, Search, LayoutList, TreePine, MapPin, Heart,
  Clock, MessageSquare, Handshake, Trophy, Star, Flower2, X,
  Camera
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUpload } from "@workspace/object-storage-web";
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
import { useToast } from "@/hooks/use-toast";

type Relation = "parent" | "child" | "sibling" | "grandparent" | "grandchild" | "aunt_uncle" | "cousin" | "ancestor" | "chosen_family" | "other";
type ViewMode = "tree" | "list";
type RelationFilter = "all" | Relation;

const RELATION_LABELS: Record<Relation, string> = {
  parent: "Parent", child: "Child", sibling: "Sibling",
  grandparent: "Grandparent", grandchild: "Grandchild",
  aunt_uncle: "Aunt / Uncle", cousin: "Cousin",
  ancestor: "Ancestor", chosen_family: "Chosen Family", other: "Other",
};

const GENERATION_ORDER: Relation[] = ["ancestor", "grandparent", "parent", "sibling", "child", "grandchild", "aunt_uncle", "cousin", "chosen_family", "other"];

const GENERATION_LABELS: Record<Relation, string> = {
  ancestor: "Ancestors & Heritage",
  grandparent: "Grandparents",
  parent: "Parents",
  sibling: "Siblings",
  child: "Children",
  grandchild: "Grandchildren",
  aunt_uncle: "Aunts & Uncles",
  cousin: "Cousins",
  chosen_family: "Chosen Family",
  other: "Other Relatives",
};

const MOMENT_META: Record<string, { label: string; icon: React.ElementType; color: string; dot: string }> = {
  conversation: { label: "Conversation", icon: MessageSquare, color: "text-secondary bg-secondary/10 border-secondary/30", dot: "bg-secondary" },
  promise: { label: "Promise", icon: Handshake, color: "text-accent bg-accent/10 border-accent/30", dot: "bg-accent" },
  milestone: { label: "Milestone", icon: Trophy, color: "text-primary bg-primary/10 border-primary/30", dot: "bg-primary" },
  memory: { label: "Memory", icon: Star, color: "text-amber-400 bg-amber-400/10 border-amber-400/30", dot: "bg-amber-400" },
  birthday: { label: "Birthday", icon: Flower2, color: "text-pink-400 bg-pink-400/10 border-pink-400/30", dot: "bg-pink-400" },
  loss: { label: "Loss", icon: Heart, color: "text-rose-400 bg-rose-400/10 border-rose-400/30", dot: "bg-rose-400" },
  gratitude: { label: "Gratitude", icon: Heart, color: "text-primary bg-primary/10 border-primary/30", dot: "bg-primary" },
  other: { label: "Moment", icon: Clock, color: "text-muted-foreground bg-muted/30 border-border", dot: "bg-muted-foreground" },
};

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function photoSrc(path: string) {
  return `/api/storage${path}`;
}

function RelationBadge({ relation }: { relation: string }) {
  const label = RELATION_LABELS[relation as Relation] ?? relation;
  const colors: Record<string, string> = {
    parent: "bg-primary/10 text-primary border-primary/20",
    grandparent: "bg-primary/10 text-primary border-primary/20",
    ancestor: "bg-amber-400/10 text-amber-500 border-amber-400/20",
    child: "bg-secondary/10 text-secondary border-secondary/20",
    grandchild: "bg-secondary/10 text-secondary border-secondary/20",
    sibling: "bg-accent/10 text-accent border-accent/20",
    chosen_family: "bg-pink-400/10 text-pink-500 border-pink-400/20",
    aunt_uncle: "bg-muted text-muted-foreground border-border",
    cousin: "bg-muted text-muted-foreground border-border",
    other: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-subheading border shrink-0", colors[relation] ?? "bg-muted text-muted-foreground border-border")}>
      {label}
    </span>
  );
}

function MemberCard({ member, onClick }: { member: FamilyMember; onClick: () => void }) {
  const isInMemory = !!member.deathDate;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={cn(
        "bg-card/40 border rounded-2xl p-5 cursor-pointer transition-all hover:bg-card hover:border-primary/30 group relative overflow-hidden",
        isInMemory ? "border-primary/20 bg-primary/5" : "border-border/50"
      )}
    >
      {isInMemory && <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-[80px] -z-10 blur-xl" />}

      <div className="flex items-start gap-3 mb-3">
        <div className={cn(
          "w-11 h-11 rounded-full flex items-center justify-center font-serif text-base shrink-0 border overflow-hidden",
          isInMemory ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/50 border-border text-foreground group-hover:border-primary/30"
        )}>
          {member.photoUrl
            ? <img src={photoSrc(member.photoUrl)} alt={member.name} className="w-full h-full object-cover" />
            : getInitials(member.name)
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 justify-between">
            <h3 className="text-lg font-serif text-foreground group-hover:text-primary transition-colors truncate">{member.name}</h3>
            <RelationBadge relation={member.relation} />
          </div>
          {isInMemory && <span className="text-xs font-serif italic text-primary/70">In memory</span>}
          {member.birthplace && (
            <p className="text-xs text-muted-foreground font-subheading mt-0.5 flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 shrink-0" />{member.birthplace}
            </p>
          )}
        </div>
      </div>

      {member.affiliation && (
        <p className="text-xs text-primary/80 font-subheading mb-2 truncate">🪶 {member.affiliation}</p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        {member.birthDate ? (
          <p className="text-xs text-muted-foreground font-subheading flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            b. {format(parseISO(member.birthDate), "yyyy")}
            {member.deathDate && ` — d. ${format(parseISO(member.deathDate), "yyyy")}`}
          </p>
        ) : <span />}
        <span className="flex items-center gap-1 text-xs text-muted-foreground/50 font-subheading group-hover:text-primary transition-colors ml-2 shrink-0">
          View <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </motion.div>
  );
}

function TreeView({ members, onSelect }: { members: FamilyMember[]; onSelect: (m: FamilyMember) => void }) {
  const grouped = GENERATION_ORDER.reduce<Record<Relation, FamilyMember[]>>((acc, rel) => {
    acc[rel] = members.filter(m => m.relation === rel);
    return acc;
  }, {} as Record<Relation, FamilyMember[]>);

  const filledGenerations = GENERATION_ORDER.filter(g => grouped[g].length > 0);

  if (filledGenerations.length === 0) {
    return (
      <div className="text-center py-24 border border-dashed border-border/50 rounded-2xl bg-card/20">
        <GitBranch className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-xl font-serif text-foreground mb-2">Your lineage begins here</h3>
        <p className="text-sm text-muted-foreground font-subheading">Add family members to see the generational tree.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {filledGenerations.map((gen, gIdx) => (
        <div key={gen} className="relative">
          {/* Generation connector line */}
          {gIdx > 0 && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-px h-4 bg-border/60" />
          )}
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px flex-1 bg-border/40" />
            <span className="text-xs font-subheading uppercase tracking-widest text-muted-foreground/60 px-3 py-1 rounded-full border border-border/40 bg-card/40">
              {GENERATION_LABELS[gen]}
            </span>
            <div className="h-px flex-1 bg-border/40" />
          </div>
          <div className={cn(
            "grid gap-4",
            grouped[gen].length === 1 ? "grid-cols-1 max-w-xs mx-auto" :
            grouped[gen].length === 2 ? "grid-cols-2 max-w-2xl mx-auto" :
            "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          )}>
            {grouped[gen].map(member => (
              <MemberCard key={member.id} member={member} onClick={() => onSelect(member)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MemberDetail({ member, onEdit, onClose, onDelete }: {
  member: FamilyMember;
  onEdit: () => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const qc = useQueryClient();
  const { data: moments = [], isLoading: loadingMoments } = useGetFamilyMemberMoments(member.id);
  const createMoment = useCreateFamilyMemberMoment();
  const deleteMoment = useDeleteFamilyMemberMoment();
  const isInMemory = !!member.deathDate;

  const [showAddMoment, setShowAddMoment] = useState(false);
  const [momentForm, setMomentForm] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "memory" as string,
    title: "",
    description: "",
  });

  function invalidateMoments() {
    qc.invalidateQueries({ queryKey: getGetFamilyMemberMomentsQueryKey(member.id) });
  }

  async function handleAddMoment(e: React.FormEvent) {
    e.preventDefault();
    await createMoment.mutateAsync({ memberId: member.id, data: momentForm as any });
    invalidateMoments();
    setShowAddMoment(false);
    setMomentForm({ date: new Date().toISOString().split("T")[0], type: "memory", title: "", description: "" });
  }

  const byYear = moments.reduce<Record<string, FamilyMemberMoment[]>>((acc, m) => {
    const y = m.date.split("-")[0];
    if (!acc[y]) acc[y] = [];
    acc[y].push(m);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="relative">
      {isInMemory && <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />}
      <div className="p-7 space-y-7">
        <SheetHeader className="space-y-4 text-left">
          <div className="flex items-center justify-between">
            <RelationBadge relation={member.relation} />
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={onEdit}><Edit3 className="w-4 h-4 text-muted-foreground" /></Button>
              <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" /></Button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center font-serif text-2xl border shrink-0 overflow-hidden",
              isInMemory ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/50 border-border text-foreground"
            )}>
              {member.photoUrl
                ? <img src={photoSrc(member.photoUrl)} alt={member.name} className="w-full h-full object-cover" />
                : getInitials(member.name)
              }
            </div>
            <div>
              <SheetTitle className="text-2xl font-serif text-foreground">{member.name}</SheetTitle>
              {isInMemory && <p className="text-primary/80 font-serif italic text-sm mt-0.5">In memory</p>}
            </div>
          </div>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {member.birthDate && (
            <div className="bg-muted/20 border border-border/50 rounded-xl p-3">
              <p className="text-xs font-subheading uppercase tracking-widest text-muted-foreground mb-1">Born</p>
              <p className="font-serif text-foreground">{format(parseISO(member.birthDate), "MMMM d, yyyy")}</p>
            </div>
          )}
          {member.deathDate && (
            <div className="bg-muted/20 border border-border/50 rounded-xl p-3">
              <p className="text-xs font-subheading uppercase tracking-widest text-muted-foreground mb-1">Passed</p>
              <p className="font-serif text-foreground">{format(parseISO(member.deathDate), "MMMM d, yyyy")}</p>
            </div>
          )}
          {member.birthplace && (
            <div className="bg-muted/20 border border-border/50 rounded-xl p-3">
              <p className="text-xs font-subheading uppercase tracking-widest text-muted-foreground mb-1">Birthplace</p>
              <p className="font-serif text-foreground truncate">{member.birthplace}</p>
            </div>
          )}
          {member.affiliation && (
            <div className="bg-muted/20 border border-border/50 rounded-xl p-3 col-span-2">
              <p className="text-xs font-subheading uppercase tracking-widest text-muted-foreground mb-1">Tribal / Cultural Affiliation</p>
              <p className="font-serif text-foreground">🪶 {member.affiliation}</p>
            </div>
          )}
        </div>

        {member.notes && (
          <div>
            <h4 className="text-xs font-subheading uppercase tracking-widest text-muted-foreground mb-2">Story & Notes</h4>
            <div className="bg-muted/20 border border-border/50 rounded-xl p-5">
              <p className="font-serif text-foreground/90 leading-relaxed text-sm whitespace-pre-wrap">{member.notes}</p>
            </div>
          </div>
        )}

        {isInMemory && (
          <div className="bg-card border border-primary/20 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full" />
            <p className="font-serif italic text-primary/90 text-base leading-relaxed relative z-10">
              "Their story lives on in yours."
            </p>
          </div>
        )}

        {/* Moments timeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-subheading uppercase tracking-widest text-muted-foreground">Moments & Stories</h4>
            <button
              onClick={() => setShowAddMoment(v => !v)}
              className="flex items-center gap-1 text-xs text-primary font-subheading hover:text-primary/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add moment
            </button>
          </div>

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
                    <input type="date" required value={momentForm.date}
                      onChange={e => setMomentForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-subheading"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-subheading mb-1 block">Type</label>
                    <select value={momentForm.type} onChange={e => setMomentForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-subheading"
                    >
                      {Object.entries(MOMENT_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>
                <input required placeholder="What happened? (short title)" value={momentForm.title}
                  onChange={e => setMomentForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-subheading"
                />
                <textarea rows={3} placeholder="The details (optional)" value={momentForm.description}
                  onChange={e => setMomentForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-subheading resize-none"
                />
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddMoment(false)} className="font-subheading text-muted-foreground">Cancel</Button>
                  <Button type="submit" size="sm" disabled={createMoment.isPending}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-subheading flex-1"
                  >
                    {createMoment.isPending ? "Adding..." : "Add to Story"}
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {loadingMoments ? (
            <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : moments.length === 0 ? (
            <div className="border border-dashed border-border/50 rounded-xl p-6 text-center">
              <Clock className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-subheading">No moments logged yet.</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border/50" />
              <div className="space-y-0">
                {years.map(year => (
                  <div key={year}>
                    <div className="flex items-center gap-3 mb-2 mt-4 first:mt-0">
                      <div className="w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center shrink-0 relative z-10">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                      </div>
                      <span className="text-xs font-subheading text-muted-foreground/60 font-medium">{year}</span>
                    </div>
                    <div className="ml-9 space-y-3">
                      {byYear[year].map((moment) => {
                        const meta = MOMENT_META[moment.type] ?? MOMENT_META.other;
                        const Icon = meta.icon;
                        return (
                          <div key={moment.id} className="relative group bg-card/60 border border-border rounded-xl p-3.5 hover:border-primary/30 transition-all">
                            <div className={cn("absolute -left-[25px] top-3 w-2.5 h-2.5 rounded-full border-2 border-background z-10", meta.dot)} />
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border font-subheading shrink-0 mt-0.5", meta.color)}>
                                  <Icon className="w-2.5 h-2.5" />{meta.label}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-subheading text-sm font-medium text-foreground leading-tight">{moment.title}</p>
                                  <p className="text-[10px] text-muted-foreground font-subheading mt-0.5">{format(parseISO(moment.date), "MMMM d")}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => deleteMoment.mutate({ memberId: member.id, id: moment.id }, { onSuccess: invalidateMoments })}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive rounded"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            {moment.description && (
                              <p className="text-xs text-muted-foreground/80 mt-2 leading-relaxed font-subheading border-t border-border/50 pt-2">{moment.description}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MemberFormDialog({ open, onOpenChange, member }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  member: FamilyMember | null;
}) {
  const qc = useQueryClient();
  const createMember = useCreateFamilyMember();
  const updateMember = useUpdateFamilyMember();
  const { uploadFile } = useUpload();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [relation, setRelation] = useState<Relation>("other");
  const [birthDate, setBirthDate] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [birthplace, setBirthplace] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  function init(m: FamilyMember | null) {
    setName(m?.name ?? "");
    setRelation((m?.relation as Relation) ?? "other");
    setBirthDate(m?.birthDate ?? "");
    setDeathDate(m?.deathDate ?? "");
    setBirthplace(m?.birthplace ?? "");
    setAffiliation(m?.affiliation ?? "");
    setNotes(m?.notes ?? "");
    setPhotoUrl(m?.photoUrl ?? null);
  }

  function handleOpenChange(v: boolean) {
    if (v) init(member);
    onOpenChange(v);
  }

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const res = await uploadFile(file);
      if (!res?.objectPath) throw new Error("no path");
      setPhotoUrl(res.objectPath);
    } catch {
      toast({ variant: "destructive", title: "Upload failed", description: "Couldn't upload the photo." });
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: any = {
      name: name.trim(),
      relation,
      birthDate: birthDate || undefined,
      deathDate: deathDate || undefined,
      birthplace: birthplace.trim() || undefined,
      affiliation: affiliation.trim() || undefined,
      notes: notes.trim() || undefined,
      photoUrl: photoUrl ?? undefined,
    };

    try {
      if (member) {
        await updateMember.mutateAsync({ id: member.id, data });
        toast({ title: "Member updated", description: `${data.name}'s record has been updated.` });
      } else {
        await createMember.mutateAsync({ data });
        toast({ title: "Member added", description: `${data.name} has been added to your family tree.` });
      }
      qc.invalidateQueries({ queryKey: getGetFamilyMembersQueryKey() });
      onOpenChange(false);
    } catch {
      toast({ variant: "destructive", title: "Couldn't save", description: "Please try again." });
    }
  }

  const isSaving = createMember.isPending || updateMember.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{member ? "Edit Member" : "Add Family Member"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full border border-border bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
              {photoUrl
                ? <img src={photoSrc(photoUrl)} alt="photo" className="w-full h-full object-cover" />
                : <User className="w-7 h-7 text-muted-foreground" />
              }
            </div>
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelected} />
              <Button type="button" variant="outline" size="sm" disabled={isUploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
                className="font-subheading text-sm"
              >
                {isUploadingPhoto ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading…</> : <><Camera className="w-4 h-4 mr-2" />Upload Photo</>}
              </Button>
              <p className="text-xs text-muted-foreground mt-1 font-subheading">JPG, PNG or HEIC</p>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-subheading uppercase tracking-widest text-muted-foreground mb-1.5 block">Full Name *</label>
            <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mary Running Bear" className="bg-background border-border" />
          </div>

          {/* Relation */}
          <div>
            <label className="text-xs font-subheading uppercase tracking-widest text-muted-foreground mb-1.5 block">Relation</label>
            <Select value={relation} onValueChange={v => setRelation(v as Relation)}>
              <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                {Object.entries(RELATION_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="font-subheading">{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-subheading uppercase tracking-widest text-muted-foreground mb-1.5 block">Birth Date</label>
              <Input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="bg-background border-border" />
            </div>
            <div>
              <label className="text-xs font-subheading uppercase tracking-widest text-muted-foreground mb-1.5 block">Death Date</label>
              <Input type="date" value={deathDate} onChange={e => setDeathDate(e.target.value)} className="bg-background border-border" />
            </div>
          </div>

          {/* Birthplace */}
          <div>
            <label className="text-xs font-subheading uppercase tracking-widest text-muted-foreground mb-1.5 block">Birthplace</label>
            <Input value={birthplace} onChange={e => setBirthplace(e.target.value)} placeholder="e.g. Tahlequah, Oklahoma" className="bg-background border-border" />
          </div>

          {/* Tribal / Cultural Affiliation */}
          <div>
            <label className="text-xs font-subheading uppercase tracking-widest text-muted-foreground mb-1.5 block">Tribal / Cultural Affiliation</label>
            <Input value={affiliation} onChange={e => setAffiliation(e.target.value)} placeholder="e.g. Cherokee Nation, Lakota Sioux" className="bg-background border-border" />
          </div>

          {/* Notes / Story */}
          <div>
            <label className="text-xs font-subheading uppercase tracking-widest text-muted-foreground mb-1.5 block">Story & Notes</label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Their life, their legacy, what you want to remember…"
              rows={4} className="bg-background border-border resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="font-subheading">Cancel</Button>
            <Button type="submit" disabled={!name.trim() || isSaving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-subheading flex-1"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : member ? "Save Changes" : "Add to Tree"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function FamilyTree() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: members, isLoading } = useGetFamilyMembers();
  const deleteMember = useDeleteFamilyMember();

  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [search, setSearch] = useState("");
  const [filterRelation, setFilterRelation] = useState<RelationFilter>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "living" | "deceased">("all");
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);

  const filtered = (members ?? []).filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase())
      || m.affiliation?.toLowerCase().includes(search.toLowerCase());
    const matchRel = filterRelation === "all" || m.relation === filterRelation;
    const matchStatus = filterStatus === "all" || (filterStatus === "deceased" ? !!m.deathDate : !m.deathDate);
    return matchSearch && matchRel && matchStatus;
  });

  async function handleDelete(member: FamilyMember) {
    if (!confirm(`Remove ${member.name} from your family tree?`)) return;
    await deleteMember.mutateAsync({ id: member.id });
    qc.invalidateQueries({ queryKey: getGetFamilyMembersQueryKey() });
    setSelectedMember(null);
    toast({ title: "Member removed", description: `${member.name} has been removed.` });
  }

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto w-full space-y-10 animate-in fade-in duration-700 slide-in-from-bottom-4">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/50 pb-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground">Family Tree</h1>
          <p className="text-muted-foreground font-subheading text-sm max-w-md">
            Your lineage, your ancestors, your chosen family. Their stories live here.
          </p>
        </div>
        <Button
          onClick={() => { setEditingMember(null); setIsFormOpen(true); }}
          className="bg-card border border-border hover:bg-muted text-foreground rounded-full px-6 font-subheading"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Member
        </Button>
      </header>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search names, affiliations…"
              className="pl-9 pr-4 py-2 bg-card border border-border rounded-full text-sm font-subheading focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground w-64"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-border bg-card p-1 gap-1">
            <button
              onClick={() => setViewMode("tree")}
              className={cn("p-1.5 rounded-full transition-colors", viewMode === "tree" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <TreePine className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-1.5 rounded-full transition-colors", viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters (list view only) */}
      {viewMode === "list" && (
        <div className="space-y-2">
          {/* Status filter */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-subheading uppercase tracking-widest text-muted-foreground/60 mr-1">Status</span>
            {(["all", "living", "deceased"] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-subheading transition-colors border",
                  filterStatus === s ? "bg-foreground text-background border-foreground" : "bg-card/50 text-muted-foreground border-border/50 hover:bg-muted/50"
                )}
              >
                {s === "all" ? "All" : s === "deceased" ? "In Memory" : "Living"}
              </button>
            ))}
          </div>
          {/* Relation filter */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-subheading uppercase tracking-widest text-muted-foreground/60 mr-1">Relation</span>
            {(["all", ...GENERATION_ORDER] as RelationFilter[]).map(f => (
              <button key={f} onClick={() => setFilterRelation(f)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-subheading capitalize transition-colors border",
                  filterRelation === f ? "bg-foreground text-background border-foreground" : "bg-card/50 text-muted-foreground border-border/50 hover:bg-muted/50"
                )}
              >
                {f === "all" ? "Any" : RELATION_LABELS[f as Relation]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      {(members ?? []).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total members", value: members?.length ?? 0 },
            { label: "In memory", value: members?.filter(m => m.deathDate).length ?? 0 },
            { label: "Generations", value: new Set(members?.map(m => m.relation)).size },
            { label: "With affiliation", value: members?.filter(m => m.affiliation).length ?? 0 },
          ].map(s => (
            <div key={s.label} className="bg-card/40 border border-border/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-serif text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground font-subheading mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-2xl bg-muted/30" />)}
        </div>
      ) : viewMode === "tree" ? (
        <TreeView members={filtered} onSelect={setSelectedMember} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-border/50 rounded-2xl bg-card/20">
          <GitBranch className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-serif text-foreground mb-2">No members found</h3>
          <p className="text-sm text-muted-foreground font-subheading">
            {search || filterRelation !== "all" ? "Try adjusting your search or filter." : "Add your first family member above."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <MemberCard member={m} onClick={() => setSelectedMember(m)} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail sheet */}
      <Sheet open={!!selectedMember} onOpenChange={o => !o && setSelectedMember(null)}>
        <SheetContent className="w-full sm:max-w-lg border-l border-border bg-background p-0 overflow-y-auto">
          {selectedMember && (
            <MemberDetail
              member={selectedMember}
              onEdit={() => { setSelectedMember(null); setEditingMember(selectedMember); setIsFormOpen(true); }}
              onClose={() => setSelectedMember(null)}
              onDelete={() => handleDelete(selectedMember)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Form dialog */}
      <MemberFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} member={editingMember} />
    </div>
  );
}
