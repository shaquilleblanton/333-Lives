import { useState, useRef } from "react";
import {
  useGetLifeEvents,
  useCreateLifeEvent,
  useUpdateLifeEvent,
  useDeleteLifeEvent,
  getGetLifeEventsQueryKey,
  type LifeEvent,
  type MediaAttachment,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUpload } from "@workspace/object-storage-web";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Plus, Pencil, Trash2, Loader2, GraduationCap, Briefcase, Users,
  Heart, Home, Plane, CloudRain, Trophy, Handshake, Sparkles, Circle,
  Image as ImageIcon, Mic, FileText, X, ChevronDown, ChevronUp,
  SortAsc, SortDesc, Filter, Calendar,
} from "lucide-react";
import { format, parseISO } from "date-fns";

const CATEGORIES = [
  { value: "education", label: "Education", icon: GraduationCap, color: "#60a5fa" },
  { value: "career", label: "Career", icon: Briefcase, color: "#34d399" },
  { value: "family", label: "Family", icon: Users, color: "#f472b6" },
  { value: "health", label: "Health", icon: Heart, color: "#fb7185" },
  { value: "home", label: "Home", icon: Home, color: "#fbbf24" },
  { value: "travel", label: "Travel", icon: Plane, color: "#38bdf8" },
  { value: "loss", label: "Loss", icon: CloudRain, color: "#94a3b8" },
  { value: "achievement", label: "Achievement", icon: Trophy, color: "#f59e0b" },
  { value: "relationship", label: "Relationship", icon: Handshake, color: "#a78bfa" },
  { value: "spiritual", label: "Spiritual", icon: Sparkles, color: "#e879f9" },
  { value: "other", label: "Other", icon: Circle, color: "#6b7280" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

function getCategoryMeta(cat: string) {
  return CATEGORIES.find((c) => c.value === cat) ?? CATEGORIES[CATEGORIES.length - 1];
}

function formatEventDate(date: string, approx: boolean) {
  if (approx && date.length === 7) {
    const [y, m] = date.split("-");
    return format(new Date(Number(y), Number(m) - 1, 1), "MMMM yyyy");
  }
  if (approx) {
    return date.slice(0, 4);
  }
  try {
    return format(parseISO(date), "MMMM d, yyyy");
  } catch {
    return date;
  }
}

function getEventYear(date: string) {
  return date.slice(0, 4);
}

export default function Timeline() {
  const { data: events, isLoading } = useGetLifeEvents();
  const createEvent = useCreateLifeEvent();
  const deleteEvent = useDeleteLifeEvent();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<LifeEvent | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<Category | null>(null);
  const [sortAsc, setSortAsc] = useState(false);

  const openCreate = () => { setEditingEvent(null); setIsFormOpen(true); };
  const openEdit = (e: LifeEvent) => { setEditingEvent(e); setIsFormOpen(true); };

  const handleDelete = (id: number) => {
    deleteEvent.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetLifeEventsQueryKey() }),
      onError: () => toast({ variant: "destructive", title: "Couldn't delete event", description: "Please try again." }),
    });
  };

  const filtered = (events ?? [])
    .filter((e) => !categoryFilter || e.category === categoryFilter)
    .sort((a, b) => sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));

  // Build year groups for the timeline
  const yearGroups: { year: string; events: LifeEvent[] }[] = [];
  for (const event of filtered) {
    const year = getEventYear(event.date);
    const last = yearGroups[yearGroups.length - 1];
    if (last && last.year === year) {
      last.events.push(event);
    } else {
      yearGroups.push({ year, events: [event] });
    }
  }

  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto w-full space-y-10 animate-in fade-in duration-700 slide-in-from-bottom-4">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/50 pb-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" />
            Life Timeline
          </h1>
          <p className="text-muted-foreground font-subheading text-base max-w-md">
            The defining moments of your life, arranged in time.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6">
          <Plus className="w-4 h-4 mr-2" />
          Add Event
        </Button>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-subheading">Filter:</span>
        </div>
        <button
          onClick={() => setCategoryFilter(null)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-subheading border transition-all",
            !categoryFilter
              ? "bg-primary/10 border-primary/40 text-primary"
              : "border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
          )}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategoryFilter(categoryFilter === cat.value ? null : cat.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-subheading border transition-all flex items-center gap-1.5",
              categoryFilter === cat.value
                ? "bg-primary/10 border-primary/40 text-primary"
                : "border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
            )}
          >
            <cat.icon className="w-3 h-3" />
            {cat.label}
          </button>
        ))}
        <button
          onClick={() => setSortAsc(!sortAsc)}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-subheading border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
        >
          {sortAsc ? <SortAsc className="w-3.5 h-3.5" /> : <SortDesc className="w-3.5 h-3.5" />}
          {sortAsc ? "Oldest first" : "Newest first"}
        </button>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl bg-muted/30" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border/50 rounded-2xl bg-card/20">
          <Calendar className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-serif text-foreground mb-2">No milestones yet</h3>
          <p className="text-sm text-muted-foreground font-subheading mb-6 max-w-sm mx-auto">
            {categoryFilter
              ? "No events in this category. Try a different filter or add one."
              : "Start building your life story by adding the moments that shaped who you are."}
          </p>
          <Button onClick={openCreate} variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
            <Plus className="w-4 h-4 mr-2" />
            Add your first milestone
          </Button>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[7px] md:left-[15px] top-0 bottom-0 w-px bg-border/50" />

          <div className="space-y-0">
            {yearGroups.map((group) => (
              <div key={group.year}>
                {/* Year marker */}
                <div className="flex items-center gap-4 mb-4 mt-6 first:mt-0">
                  <div className="relative z-10 w-4 h-4 md:w-8 md:h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full bg-primary" />
                  </div>
                  <span className="font-serif text-xl md:text-2xl text-foreground/80">{group.year}</span>
                </div>

                <div className="ml-8 md:ml-16 space-y-3 mb-2">
                  {group.events.map((event) => {
                    const meta = getCategoryMeta(event.category);
                    const isExpanded = expandedId === event.id;
                    return (
                      <div
                        key={event.id}
                        className="relative bg-card/50 border border-border/50 rounded-xl transition-all hover:border-border hover:bg-card/80 overflow-hidden"
                      >
                        {/* Category color accent */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                          style={{ backgroundColor: meta.color + "80" }}
                        />

                        <div className="pl-4 pr-4 py-4">
                          <div className="flex items-start gap-3">
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                              style={{ backgroundColor: meta.color + "20" }}
                            >
                              <meta.icon className="w-4 h-4" style={{ color: meta.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h3 className="font-serif text-lg text-foreground leading-snug">{event.title}</h3>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span className="text-xs font-subheading text-muted-foreground">
                                      {formatEventDate(event.date, event.approximateDate)}
                                      {event.approximateDate && (
                                        <span className="ml-1 text-muted-foreground/60">(approx.)</span>
                                      )}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] py-0 h-5 border-border/60"
                                      style={{ color: meta.color }}
                                    >
                                      {meta.label}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => setExpandedId(isExpanded ? null : event.id)}
                                    className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                                    aria-label={isExpanded ? "Collapse" : "Expand"}
                                  >
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                  <button
                                    onClick={() => openEdit(event)}
                                    className="text-muted-foreground hover:text-primary p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                                    aria-label="Edit"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(event.id)}
                                    className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                                    aria-label="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Short description preview when collapsed */}
                              {!isExpanded && event.description && (
                                <p className="text-sm text-foreground/70 mt-2 line-clamp-2">{event.description}</p>
                              )}

                              {/* Media thumbnail strip (always visible) */}
                              {(event.mediaUrls as MediaAttachment[]).length > 0 && !isExpanded && (
                                <div className="flex items-center gap-2 mt-3 flex-wrap">
                                  {(event.mediaUrls as MediaAttachment[]).slice(0, 4).map((m, i) => (
                                    <MediaThumbnail key={i} media={m} />
                                  ))}
                                  {(event.mediaUrls as MediaAttachment[]).length > 4 && (
                                    <span className="text-xs font-subheading text-muted-foreground">
                                      +{(event.mediaUrls as MediaAttachment[]).length - 4} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="mt-4 space-y-4 border-t border-border/40 pt-4">
                              {event.description && (
                                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                                  {event.description}
                                </p>
                              )}
                              {(event.mediaUrls as MediaAttachment[]).length > 0 && (
                                <div>
                                  <p className="text-xs font-subheading text-muted-foreground mb-2 uppercase tracking-wider">
                                    Media
                                  </p>
                                  <div className="flex flex-wrap gap-3">
                                    {(event.mediaUrls as MediaAttachment[]).map((m, i) => (
                                      <MediaThumbnail key={i} media={m} large />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <EventFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        editingEvent={editingEvent}
      />
    </div>
  );
}

function MediaThumbnail({ media, large }: { media: MediaAttachment; large?: boolean }) {
  const size = large ? "w-24 h-24" : "w-12 h-12";
  const iconSize = large ? "w-6 h-6" : "w-4 h-4";
  const isPhoto = media.type === "photo";
  const isVoice = media.type === "voice";
  const apiBase = (window as any).__VITE_API_BASE__ ?? "";

  if (isPhoto) {
    return (
      <a
        href={`${apiBase}/api/storage${media.objectPath}`}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(size, "rounded-lg overflow-hidden border border-border/50 shrink-0 bg-muted/40 block")}
        title={media.name}
      >
        <img
          src={`${apiBase}/api/storage${media.objectPath}`}
          alt={media.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </a>
    );
  }

  const Icon = isVoice ? Mic : FileText;
  const label = media.name.length > 16 ? media.name.slice(0, 14) + "…" : media.name;

  return (
    <a
      href={`${apiBase}/api/storage${media.objectPath}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        size,
        "rounded-lg border border-border/50 bg-muted/40 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors shrink-0"
      )}
      title={media.name}
    >
      <Icon className={iconSize} />
      {large && <span className="text-[10px] font-subheading text-center leading-tight px-1">{label}</span>}
    </a>
  );
}

function EventFormDialog({
  open,
  onOpenChange,
  editingEvent,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editingEvent: LifeEvent | null;
}) {
  const isEditing = editingEvent !== null;
  const createEvent = useCreateLifeEvent();
  const updateEvent = useUpdateLifeEvent();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [approximateDate, setApproximateDate] = useState(false);
  const [category, setCategory] = useState<Category>("other");
  const [description, setDescription] = useState("");
  const [mediaUrls, setMediaUrls] = useState<MediaAttachment[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile: uploadPhoto } = useUpload({
    onSuccess: (res) => {
      setMediaUrls((prev) => [
        ...prev,
        { type: "photo", objectPath: res.objectPath, name: res.metadata.name ?? "photo" },
      ]);
      setIsUploadingPhoto(false);
    },
    onError: () => {
      setIsUploadingPhoto(false);
      toast({ variant: "destructive", title: "Upload failed", description: "Couldn't upload the photo. Please try again." });
    },
  });

  // Reset when dialog opens
  useState(() => {});
  const prevOpenRef = useRef(false);
  if (open !== prevOpenRef.current) {
    prevOpenRef.current = open;
    if (open) {
      setTitle(editingEvent?.title ?? "");
      setDate(editingEvent?.date ?? "");
      setApproximateDate(editingEvent?.approximateDate ?? false);
      setCategory((editingEvent?.category as Category) ?? "other");
      setDescription(editingEvent?.description ?? "");
      setMediaUrls((editingEvent?.mediaUrls as MediaAttachment[]) ?? []);
    }
  }

  const isPending = createEvent.isPending || updateEvent.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date.trim()) return;

    const data = {
      title: title.trim(),
      date: date.trim(),
      approximateDate,
      category,
      description: description.trim() || undefined,
      mediaUrls,
    };

    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getGetLifeEventsQueryKey() });
      onOpenChange(false);
    };
    const onError = () =>
      toast({
        variant: "destructive",
        title: isEditing ? "Couldn't update event" : "Couldn't save event",
        description: "Please check your connection and try again.",
      });

    if (isEditing && editingEvent) {
      updateEvent.mutate({ id: editingEvent.id, data }, { onSuccess, onError });
    } else {
      createEvent.mutate({ data }, { onSuccess, onError });
    }
  };

  const handlePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    uploadPhoto(file);
    e.target.value = "";
  };

  const removeMedia = (idx: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] bg-background border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {isEditing ? "Edit Event" : "Add a Life Event"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-card border-border"
              placeholder="Graduated college, got married, moved to Tokyo…"
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Category</label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <div className="flex items-center gap-2">
                      <cat.icon className="w-4 h-4" style={{ color: cat.color }} />
                      {cat.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Date</label>
            <div className="flex items-center gap-3">
              <Input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-card border-border flex-1"
                placeholder={approximateDate ? "YYYY-MM or YYYY" : "YYYY-MM-DD"}
                required
              />
              <label className="flex items-center gap-2 text-sm font-subheading text-muted-foreground cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={approximateDate}
                  onChange={(e) => setApproximateDate(e.target.checked)}
                  className="rounded border-border"
                />
                Approximate
              </label>
            </div>
            <p className="text-xs text-muted-foreground/70 font-subheading">
              {approximateDate
                ? 'Use "2005-06" for month/year, or "2005" for year only'
                : 'Use "2005-06-15" for a specific date'}
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">
              Description <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-card border-border min-h-[100px] resize-none"
              placeholder="Tell the story behind this moment…"
            />
          </div>

          {/* Media */}
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">
              Photos & Documents <span className="text-muted-foreground/60">(optional, up to 10)</span>
            </label>
            {mediaUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {mediaUrls.map((m, i) => {
                  const Icon = m.type === "photo" ? ImageIcon : m.type === "voice" ? Mic : FileText;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full border border-border/50 bg-muted/40 text-xs font-subheading text-foreground/80"
                    >
                      <Icon className="w-3 h-3 text-muted-foreground" />
                      <span className="max-w-[120px] truncate">{m.name}</span>
                      <button
                        type="button"
                        onClick={() => removeMedia(i)}
                        className="text-muted-foreground hover:text-destructive ml-0.5 p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {mediaUrls.length < 10 && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={handlePhotoFile}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ImageIcon className="w-4 h-4 mr-2" />
                  )}
                  {isUploadingPhoto ? "Uploading…" : "Attach Photo or Document"}
                </Button>
              </>
            )}
          </div>

          <div className="flex justify-end pt-2 gap-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || !date.trim() || isPending || isUploadingPhoto}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Save Changes" : "Save Event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
