import { useEffect, useState } from "react";
import { useGetVaultItems, useCreateVaultItem, useUpdateVaultItem, useDeleteVaultItem, getGetVaultItemsQueryKey } from "@workspace/api-client-react";
import type { VaultItem } from "@workspace/api-client-react";
import { Lock, FileText, Image as ImageIcon, Book, Mic, Info, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

type VaultCategory = "document" | "photo" | "journal" | "voice_note" | "important_info";

const CATEGORY_ICONS = {
  document: FileText,
  photo: ImageIcon,
  journal: Book,
  voice_note: Mic,
  important_info: Info,
};

const CATEGORY_LABELS: Record<VaultCategory, string> = {
  document: "Documents",
  photo: "Photos",
  journal: "Journals",
  voice_note: "Voice Notes",
  important_info: "Important Info",
};

export default function Vault() {
  const { data: vaultItems, isLoading } = useGetVaultItems();
  const deleteVaultItem = useDeleteVaultItem();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<VaultCategory | null>(null);

  const openCreate = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const openEdit = (item: VaultItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  function showError(description: string) {
    toast({ variant: "destructive", title: "Something went wrong", description });
  }

  const handleDelete = (id: number) => {
    deleteVaultItem.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetVaultItemsQueryKey() }),
      onError: () => showError("We couldn't remove that item. Please try again."),
    });
  };

  const categories = (Object.keys(CATEGORY_LABELS) as VaultCategory[]).map((cat) => ({
    id: cat,
    label: CATEGORY_LABELS[cat],
    icon: CATEGORY_ICONS[cat],
    count: vaultItems?.filter((i) => i.category === cat).length ?? 0,
  }));

  const visibleItems = activeCategory
    ? vaultItems?.filter((i) => i.category === activeCategory)
    : vaultItems;

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto w-full space-y-12 animate-in fade-in duration-700 slide-in-from-bottom-4">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/50 pb-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground flex items-center gap-3">
            <Lock className="w-8 h-8 text-primary" />
            Secure Vault
          </h1>
          <p className="text-muted-foreground font-subheading text-base max-w-md">
            Your private sanctuary. What goes in here, stays for your eyes only.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6">
          <Plus className="w-4 h-4 mr-2" />
          Store Item
        </Button>
      </header>

      <VaultFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} editingItem={editingItem} />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl bg-muted/30" />
          ))}
        </div>
      ) : (
        <div className="space-y-12">
          {/* Categories Grid — click to filter */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(isActive ? null : cat.id)}
                  className={cn(
                    "p-4 rounded-xl border transition-all text-left group",
                    isActive
                      ? "border-primary bg-primary/10"
                      : "border-border/50 bg-card/30 hover:bg-card/60 hover:border-primary/50"
                  )}
                >
                  <cat.icon className={cn("w-6 h-6 transition-colors mb-3", isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                  <h3 className="font-subheading font-medium text-foreground">{cat.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{cat.count} items</p>
                </button>
              );
            })}
          </div>

          {/* Items */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif text-foreground">
                {activeCategory ? CATEGORY_LABELS[activeCategory] : "Recent Additions"}
              </h2>
              {activeCategory && (
                <button onClick={() => setActiveCategory(null)} className="text-sm text-primary hover:underline font-subheading">
                  Clear filter
                </button>
              )}
            </div>

            {visibleItems?.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border/50 rounded-2xl bg-card/20">
                <Shield className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-serif text-foreground mb-2">
                  {activeCategory ? "Nothing here yet" : "Your vault is empty"}
                </h3>
                <p className="text-sm text-muted-foreground font-subheading">Store your most important documents and memories here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {visibleItems?.map((item) => {
                  const Icon = CATEGORY_ICONS[item.category as VaultCategory] || FileText;
                  return (
                    <div key={item.id} className="p-5 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm group relative">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-serif text-lg text-foreground truncate">{item.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-subheading text-muted-foreground capitalize">
                              {item.category.replace("_", " ")}
                            </span>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="text-xs font-subheading text-muted-foreground">
                              {format(new Date(item.createdAt), "MMM d, yyyy")}
                            </span>
                          </div>
                          {item.content && (
                            <p className="text-sm text-foreground/70 mt-2 line-clamp-2">{item.content}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => openEdit(item)}
                            className="text-muted-foreground hover:text-primary p-1"
                            aria-label="Edit item"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-muted-foreground hover:text-destructive p-1"
                            aria-label="Delete item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VaultFormDialog({ open, onOpenChange, editingItem }: { open: boolean; onOpenChange: (o: boolean) => void; editingItem: VaultItem | null }) {
  const createVaultItem = useCreateVaultItem();
  const updateVaultItem = useUpdateVaultItem();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isEditing = editingItem !== null;
  const isPending = createVaultItem.isPending || updateVaultItem.isPending;

  const [name, setName] = useState("");
  const [category, setCategory] = useState<VaultCategory>("important_info");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (open) {
      setName(editingItem?.name ?? "");
      setCategory((editingItem?.category as VaultCategory) ?? "important_info");
      setContent(editingItem?.content ?? "");
    }
  }, [open, editingItem]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const data = { name: name.trim(), category, content: content.trim() || undefined };
    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getGetVaultItemsQueryKey() });
      onOpenChange(false);
    };
    const onError = () =>
      toast({
        variant: "destructive",
        title: isEditing ? "Couldn't update item" : "Couldn't store item",
        description: `We couldn't ${isEditing ? "update" : "store"} that item. Please check your connection and try again.`,
      });

    if (isEditing && editingItem) {
      updateVaultItem.mutate({ id: editingItem.id, data }, { onSuccess, onError });
    } else {
      createVaultItem.mutate({ data }, { onSuccess, onError });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{isEditing ? "Edit Item" : "Store an Item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-card border-border"
              placeholder="Passport, will, wifi password…"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Category</label>
            <Select value={category} onValueChange={(v: VaultCategory) => setCategory(v)}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CATEGORY_LABELS) as VaultCategory[]).map((cat) => (
                  <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Notes / Content</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="bg-card border-border min-h-[120px] resize-none"
              placeholder="The details you want to keep safe…"
            />
          </div>

          <div className="flex justify-end pt-4 gap-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Save Changes" : "Store Securely"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Shield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2-1 4-2 7-2 2.89 0 5.13.89 6.87 1.71a1 1 0 0 1 .55.89l.58 7.4Z" />
      <path d="m15.5 10-4.5 4-1.5-1.5" />
    </svg>
  );
}
