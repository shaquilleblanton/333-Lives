import { useState, useRef, useCallback } from "react";
import {
  useGetMemoryCollections,
  useCreateMemoryCollection,
  useUpdateMemoryCollection,
  useDeleteMemoryCollection,
  useGetCollectionItems,
  useCreateCollectionItem,
  useUpdateCollectionItem,
  useDeleteCollectionItem,
  useReorderCollectionItems,
  getGetMemoryCollectionsQueryKey,
  getGetCollectionItemsQueryKey,
  type MemoryCollection,
  type CollectionItem,
} from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { useQueryClient } from "@tanstack/react-query";
import {
  Images,
  Plus,
  Trash2,
  Pencil,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Heart,
  GripVertical,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function storageUrl(objectPath: string) {
  return `/api/storage${objectPath}`;
}

// ─── Album Grid ─────────────────────────────────────────────────────────────

export default function Memories() {
  const { data: collections, isLoading } = useGetMemoryCollections();
  const deleteCollection = useDeleteMemoryCollection();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MemoryCollection | null>(null);
  const [activeCollection, setActiveCollection] = useState<MemoryCollection | null>(null);

  const openCreate = () => { setEditTarget(null); setFormOpen(true); };
  const openEdit = (c: MemoryCollection, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTarget(c);
    setFormOpen(true);
  };
  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCollection.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetMemoryCollectionsQueryKey() }),
      onError: () => toast({ variant: "destructive", title: "Couldn't delete album" }),
    });
  };

  if (activeCollection) {
    return (
      <AlbumView
        collection={activeCollection}
        onBack={() => setActiveCollection(null)}
      />
    );
  }

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto w-full space-y-10 animate-in fade-in duration-700 slide-in-from-bottom-4">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/50 pb-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground flex items-center gap-3">
            <Images className="w-8 h-8 text-primary" />
            Memory Collections
          </h1>
          <p className="text-muted-foreground font-subheading text-base max-w-md">
            Curated albums of your life — Dad, College Days, Europe 2019, The Wedding.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6">
          <Plus className="w-4 h-4 mr-2" />
          New Album
        </Button>
      </header>

      <CollectionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editTarget={editTarget}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-52 rounded-2xl bg-muted/30" />)}
        </div>
      ) : collections?.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-border/50 rounded-2xl bg-card/20">
          <Images className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-serif text-foreground mb-2">No albums yet</h3>
          <p className="text-sm text-muted-foreground font-subheading mb-6">
            Start with a name — "Dad", "College Days", "The Wedding".
          </p>
          <Button onClick={openCreate} variant="outline">
            <Plus className="w-4 h-4 mr-2" /> Create your first album
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections?.map(c => (
            <AlbumCard
              key={c.id}
              collection={c}
              onClick={() => setActiveCollection(c)}
              onEdit={e => openEdit(c, e)}
              onDelete={e => handleDelete(c.id, e)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AlbumCard({
  collection,
  onClick,
  onEdit,
  onDelete,
}: {
  collection: MemoryCollection;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden text-left transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* Cover */}
      <div className="relative h-40 bg-muted/30 overflow-hidden">
        {collection.coverUrl ? (
          <img
            src={storageUrl(collection.coverUrl)}
            alt={collection.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground/20" />
          </div>
        )}
        {collection.isInMemory && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-primary/90 text-primary-foreground text-xs font-subheading px-2 py-0.5 rounded-full">
            <Heart className="w-3 h-3" /> In Memory
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-primary"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-serif text-lg text-foreground truncate">{collection.name}</h3>
        {collection.description && (
          <p className="text-sm text-muted-foreground font-subheading mt-0.5 line-clamp-1">{collection.description}</p>
        )}
        <p className="text-xs text-muted-foreground/60 font-subheading mt-2">
          {format(new Date(collection.createdAt), "MMM d, yyyy")}
        </p>
      </div>
    </button>
  );
}

// ─── Album View (items grid + uploader + lightbox) ───────────────────────────

function AlbumView({ collection, onBack }: { collection: MemoryCollection; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: items, isLoading } = useGetCollectionItems(collection.id);
  const deleteItem = useDeleteCollectionItem();
  const updateItem = useUpdateCollectionItem();
  const createItem = useCreateCollectionItem();
  const reorderItems = useReorderCollectionItems();

  const { uploadFile, isUploading } = useUpload({
    onError: () => toast({ variant: "destructive", title: "Upload failed", description: "Couldn't upload that file. Please try again." }),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [editCaption, setEditCaption] = useState<{ id: number; value: string } | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const dragItemId = useRef<number | null>(null);

  const sorted = [...(items ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetCollectionItemsQueryKey(collection.id) });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const result = await uploadFile(file);
    if (!result) return;
    const type = file.type.startsWith("audio/") ? "voice" : "photo";
    createItem.mutate(
      {
        id: collection.id,
        data: { mediaUrl: result.objectPath, type, sortOrder: (items?.length ?? 0) },
      },
      {
        onSuccess: invalidate,
        onError: () => toast({ variant: "destructive", title: "Couldn't save item" }),
      }
    );
  };

  const handleDeleteItem = (id: number) => {
    deleteItem.mutate(
      { id: collection.id, itemId: id },
      {
        onSuccess: invalidate,
        onError: () => toast({ variant: "destructive", title: "Couldn't remove item" }),
      }
    );
  };

  const handleSaveCaption = (item: CollectionItem) => {
    if (!editCaption || editCaption.id !== item.id) return;
    updateItem.mutate(
      { id: collection.id, itemId: item.id, data: { caption: editCaption.value || null } },
      { onSuccess: invalidate }
    );
    setEditCaption(null);
  };

  // HTML5 drag-to-reorder
  const handleDragStart = (id: number) => { dragItemId.current = id; };
  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    setDragOverId(id);
  };
  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    setDragOverId(null);
    const fromId = dragItemId.current;
    if (!fromId || fromId === targetId) return;
    const fromIdx = sorted.findIndex(i => i.id === fromId);
    const toIdx = sorted.findIndex(i => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = [...sorted];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const orderedIds = reordered.map(i => i.id);
    reorderItems.mutate(
      { id: collection.id, data: { orderedIds } },
      { onSuccess: invalidate }
    );
  };

  const lightboxItem = lightboxIndex !== null ? sorted[lightboxIndex] : null;

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors p-1">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-serif text-foreground truncate">{collection.name}</h1>
            {collection.isInMemory && (
              <span className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-subheading px-2 py-0.5 rounded-full shrink-0">
                <Heart className="w-3 h-3" /> In Memory
              </span>
            )}
          </div>
          {collection.description && (
            <p className="text-sm text-muted-foreground font-subheading mt-0.5">{collection.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,audio/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || createItem.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
          >
            {isUploading || createItem.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Add Photo
          </Button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="aspect-square rounded-xl bg-muted/30" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-2xl py-20 bg-card/10 cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-subheading">Click to add your first photo</p>
          <p className="text-xs text-muted-foreground/50 font-subheading mt-1">Drag and drop between photos to reorder</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {sorted.map((item, idx) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(item.id)}
              onDragOver={e => handleDragOver(e, item.id)}
              onDrop={e => handleDrop(e, item.id)}
              onDragEnd={() => setDragOverId(null)}
              className={cn(
                "group relative rounded-xl overflow-hidden bg-muted/30 aspect-square cursor-pointer transition-all",
                dragOverId === item.id ? "ring-2 ring-primary scale-95" : "hover:ring-2 hover:ring-primary/40"
              )}
            >
              <button
                className="w-full h-full"
                onClick={() => setLightboxIndex(idx)}
              >
                {item.type === "photo" ? (
                  <img
                    src={storageUrl(item.mediaUrl)}
                    alt={item.caption ?? ""}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-muted/50">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
                        <path d="M19 10a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.93V18H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-1.07A7 7 0 0 0 19 10Z" />
                      </svg>
                    </div>
                    <span className="text-xs text-muted-foreground font-subheading">Voice Note</span>
                  </div>
                )}
              </button>

              {/* Drag handle indicator */}
              <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-60 transition-opacity">
                <GripVertical className="w-4 h-4 text-white drop-shadow" />
              </div>

              {/* Caption overlay */}
              {item.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4">
                  <p className="text-white text-xs font-subheading line-clamp-2">{item.caption}</p>
                </div>
              )}

              {/* Hover actions */}
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={e => { e.stopPropagation(); setEditCaption({ id: item.id, value: item.caption ?? "" }); }}
                  className="w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-primary"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteItem(item.id); }}
                  className="w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Caption edit modal */}
      {editCaption && (
        <Dialog open onOpenChange={() => setEditCaption(null)}>
          <DialogContent className="sm:max-w-sm bg-background border-border">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">Edit Caption</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Textarea
                value={editCaption.value}
                onChange={e => setEditCaption({ ...editCaption, value: e.target.value })}
                className="bg-card border-border resize-none min-h-[80px]"
                placeholder="Add a caption…"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setEditCaption(null)}>Cancel</Button>
                <Button
                  onClick={() => {
                    const item = sorted.find(i => i.id === editCaption.id);
                    if (item) handleSaveCaption(item);
                  }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Lightbox */}
      {lightboxItem !== null && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/60 hover:text-white p-2"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="w-6 h-6" />
          </button>

          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-2"
              onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          {lightboxIndex < sorted.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-2"
              onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          <div className="flex flex-col items-center gap-4 max-w-4xl max-h-screen p-8" onClick={e => e.stopPropagation()}>
            {lightboxItem.type === "photo" ? (
              <img
                src={storageUrl(lightboxItem.mediaUrl)}
                alt={lightboxItem.caption ?? ""}
                className="max-h-[75vh] max-w-full rounded-lg object-contain"
              />
            ) : (
              <div className="bg-card rounded-2xl p-8 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
                    <path d="M19 10a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.93V18H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-1.07A7 7 0 0 0 19 10Z" />
                  </svg>
                </div>
                <audio controls src={storageUrl(lightboxItem.mediaUrl)} className="w-72" />
              </div>
            )}
            {lightboxItem.caption && (
              <p className="text-white/80 text-sm font-subheading text-center max-w-lg">{lightboxItem.caption}</p>
            )}
            <p className="text-white/40 text-xs font-subheading">
              {lightboxIndex + 1} / {sorted.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Collection Form Dialog ───────────────────────────────────────────────────

function CollectionFormDialog({
  open,
  onOpenChange,
  editTarget,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editTarget: MemoryCollection | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createCollection = useCreateMemoryCollection();
  const updateCollection = useUpdateMemoryCollection();
  const { uploadFile, isUploading } = useUpload();
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(editTarget?.name ?? "");
  const [description, setDescription] = useState(editTarget?.description ?? "");
  const [isInMemory, setIsInMemory] = useState(editTarget?.isInMemory ?? false);
  const [coverUrl, setCoverUrl] = useState(editTarget?.coverUrl ?? "");
  const [coverPreview, setCoverPreview] = useState(
    editTarget?.coverUrl ? storageUrl(editTarget.coverUrl) : ""
  );

  // Reset form when dialog opens / editTarget changes
  const handleOpenChange = useCallback((o: boolean) => {
    if (o) {
      setName(editTarget?.name ?? "");
      setDescription(editTarget?.description ?? "");
      setIsInMemory(editTarget?.isInMemory ?? false);
      setCoverUrl(editTarget?.coverUrl ?? "");
      setCoverPreview(editTarget?.coverUrl ? storageUrl(editTarget.coverUrl) : "");
    }
    onOpenChange(o);
  }, [editTarget, onOpenChange]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const preview = URL.createObjectURL(file);
    setCoverPreview(preview);
    const result = await uploadFile(file);
    if (result) setCoverUrl(result.objectPath);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      description: description.trim() || undefined,
      coverUrl: coverUrl || undefined,
      isInMemory,
    };
    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getGetMemoryCollectionsQueryKey() });
      onOpenChange(false);
    };
    const onError = () => toast({ variant: "destructive", title: "Couldn't save album" });
    if (editTarget) {
      updateCollection.mutate({ id: editTarget.id, data }, { onSuccess, onError });
    } else {
      createCollection.mutate({ data }, { onSuccess, onError });
    }
  };

  const isPending = createCollection.isPending || updateCollection.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {editTarget ? "Edit Album" : "Create Album"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Cover photo */}
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Cover Photo</label>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            <div
              className="relative h-36 rounded-xl border border-border/50 bg-card/30 overflow-hidden cursor-pointer group"
              onClick={() => coverInputRef.current?.click()}
            >
              {coverPreview ? (
                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/50">
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-xs font-subheading">Click to upload cover</span>
                </div>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Album Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} className="bg-card border-border" placeholder="Dad, College Days, Europe 2019…" required />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Description (optional)</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-card border-border resize-none min-h-[70px]" placeholder="A few words about this collection…" />
          </div>

          {/* In Memory toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-card/40 border border-border/50">
            <div>
              <p className="text-sm font-subheading text-foreground flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-primary" /> Mark as "In Memory"
              </p>
              <p className="text-xs text-muted-foreground font-subheading mt-0.5">For collections dedicated to someone who has passed</p>
            </div>
            <Switch checked={isInMemory} onCheckedChange={setIsInMemory} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editTarget ? "Save Changes" : "Create Album"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
