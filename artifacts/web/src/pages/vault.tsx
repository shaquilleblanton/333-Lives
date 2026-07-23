import { useEffect, useState } from "react";
import {
  useGetVaultItems,
  useCreateVaultItem,
  useUpdateVaultItem,
  useDeleteVaultItem,
  useGetVaultContacts,
  useCreateVaultContact,
  useUpdateVaultContact,
  useDeleteVaultContact,
  getGetVaultItemsQueryKey,
  getGetVaultContactsQueryKey,
} from "@workspace/api-client-react";
import type { VaultItem, VaultContact } from "@workspace/api-client-react";
import {
  Lock, FileText, Image as ImageIcon, Book, Mic, Info, Plus, Pencil, Trash2,
  Loader2, ScrollText, Shield, Heart, Cpu, ClipboardList, ShieldCheck,
  User, Briefcase, UserCheck, Phone, Mail, Building2, ChevronRight,
} from "lucide-react";
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

type VaultCategory = "document" | "photo" | "journal" | "voice_note" | "important_info"
  | "final_letter" | "will" | "insurance" | "medical_directive" | "funeral_wishes" | "digital_assets";

type ContactType = "person" | "attorney" | "executor";

type ActiveTab = "general" | "estate";

const GENERAL_CATEGORIES: VaultCategory[] = ["document", "photo", "journal", "voice_note", "important_info"];
const ESTATE_CATEGORIES: VaultCategory[] = ["final_letter", "will", "insurance", "medical_directive", "funeral_wishes", "digital_assets"];

const CATEGORY_ICONS: Record<VaultCategory, React.ElementType> = {
  document: FileText,
  photo: ImageIcon,
  journal: Book,
  voice_note: Mic,
  important_info: Info,
  final_letter: ScrollText,
  will: ClipboardList,
  insurance: ShieldCheck,
  medical_directive: Heart,
  funeral_wishes: Heart,
  digital_assets: Cpu,
};

const CATEGORY_LABELS: Record<VaultCategory, string> = {
  document: "Documents",
  photo: "Photos",
  journal: "Journals",
  voice_note: "Voice Notes",
  important_info: "Important Info",
  final_letter: "Final Letter",
  will: "Will & Testament",
  insurance: "Insurance Policies",
  medical_directive: "Medical Directive",
  funeral_wishes: "Funeral Wishes",
  digital_assets: "Digital Assets",
};

const ESTATE_DESCRIPTIONS: Record<string, string> = {
  final_letter: "Your last words to the people you love — written in your own voice.",
  will: "Your legal wishes for how assets and property are distributed.",
  insurance: "Policy numbers, providers, beneficiaries, and claim instructions.",
  medical_directive: "DNR orders, living will, healthcare proxy, and medical wishes.",
  funeral_wishes: "Burial or cremation preference, service details, and any final requests.",
  digital_assets: "Account logins, crypto wallets, social media, and subscription access.",
};

const ESTATE_PROMPTS: Record<string, string> = {
  final_letter: "Write from the heart. Who do you want to say something to? What do you want them to know about how much they meant to you?",
  will: "List your major assets, who should receive them, and any specific wishes for sentimental items.",
  insurance: "Include: insurance company, policy number, type of policy, coverage amount, and how to file a claim.",
  medical_directive: "Include: Do Not Resuscitate (DNR) preference, organ donation wishes, who has medical power of attorney, and what life-sustaining measures you do or don't want.",
  funeral_wishes: "Include: burial or cremation preference, location, service type (religious, celebration of life, private), music, readings, or anything that represents you.",
  digital_assets: "Include: email accounts, social media (Instagram, Facebook), bank/investment logins, crypto wallets, streaming services, and any other accounts with value or sentimental content.",
};

const CONTACT_TYPE_ICONS: Record<ContactType, React.ElementType> = {
  person: User,
  attorney: Briefcase,
  executor: UserCheck,
};

const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  person: "Trusted Person",
  attorney: "Attorney / Lawyer",
  executor: "Estate Executor",
};

const CONTACT_TYPE_DESCRIPTIONS: Record<ContactType, string> = {
  person: "A family member or close friend you trust completely with your final wishes.",
  attorney: "A licensed attorney or law firm that will handle your estate legally.",
  executor: "The person legally responsible for carrying out your will and estate.",
};

export default function Vault() {
  const { data: vaultItems, isLoading } = useGetVaultItems();
  const { data: contacts, isLoading: contactsLoading } = useGetVaultContacts();
  const deleteVaultItem = useDeleteVaultItem();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>("general");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [defaultCategory, setDefaultCategory] = useState<VaultCategory>("document");
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<VaultContact | null>(null);
  const [contactPriority, setContactPriority] = useState<1 | 2>(1);

  const openCreate = (cat?: VaultCategory) => {
    setEditingItem(null);
    setDefaultCategory(cat ?? (activeTab === "estate" ? "final_letter" : "document"));
    setIsFormOpen(true);
  };

  const openEdit = (item: VaultItem) => {
    setEditingItem(item);
    setDefaultCategory(item.category as VaultCategory);
    setIsFormOpen(true);
  };

  const openContactEdit = (contact: VaultContact) => {
    setEditingContact(contact);
    setIsContactOpen(true);
  };

  const openContactCreate = (priority: 1 | 2) => {
    setEditingContact(null);
    setContactPriority(priority);
    setIsContactOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteVaultItem.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetVaultItemsQueryKey() }),
      onError: () => toast({ variant: "destructive", title: "Couldn't remove item", description: "Please try again." }),
    });
  };

  const generalItems = vaultItems?.filter(i => GENERAL_CATEGORIES.includes(i.category as VaultCategory)) ?? [];
  const estateItems = vaultItems?.filter(i => ESTATE_CATEGORIES.includes(i.category as VaultCategory)) ?? [];
  const firstContact = contacts?.find(c => c.priority === 1);
  const secondContact = contacts?.find(c => c.priority === 2);

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto w-full space-y-10 animate-in fade-in duration-700 slide-in-from-bottom-4">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/50 pb-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground flex items-center gap-3">
            <Lock className="w-8 h-8 text-primary" />
            Secure Vault
          </h1>
          <p className="text-muted-foreground font-subheading text-base max-w-md">
            Your private sanctuary — from everyday documents to your final wishes.
          </p>
        </div>
        <Button onClick={() => openCreate()} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6">
          <Plus className="w-4 h-4 mr-2" />
          Store Item
        </Button>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-xl w-fit">
        {(["general", "estate"] as ActiveTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-5 py-2 rounded-lg text-sm font-subheading transition-all",
              activeTab === tab
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "general" ? "General Vault" : "Estate & Final Wishes"}
          </button>
        ))}
      </div>

      {/* ── GENERAL TAB ── */}
      {activeTab === "general" && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {GENERAL_CATEGORIES.map(cat => {
              const Icon = CATEGORY_ICONS[cat];
              const count = generalItems.filter(i => i.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => openCreate(cat)}
                  className="p-4 rounded-xl border border-border/50 bg-card/30 hover:bg-card/60 hover:border-primary/50 transition-all text-left group"
                >
                  <Icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors mb-3" />
                  <h3 className="font-subheading font-medium text-foreground text-sm">{CATEGORY_LABELS[cat]}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{count} item{count !== 1 ? "s" : ""}</p>
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl bg-muted/30" />)}
            </div>
          ) : generalItems.length === 0 ? (
            <EmptyState
              icon={<Shield className="w-12 h-12 text-muted-foreground/40" />}
              title="Your general vault is empty"
              subtitle="Store passports, passwords, photos, and important documents here."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {generalItems.map(item => (
                <ItemCard key={item.id} item={item} onEdit={() => openEdit(item)} onDelete={() => handleDelete(item.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ESTATE TAB ── */}
      {activeTab === "estate" && (
        <div className="space-y-10">
          {/* Intro banner */}
          <div className="rounded-2xl border border-border/50 bg-card/30 p-6 flex gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-serif text-lg text-foreground">Your Estate Vault</h2>
              <p className="text-sm text-muted-foreground font-subheading mt-1 max-w-2xl">
                Write your final wishes, will, insurance details, and end-of-life documents — then designate two trusted contacts who will receive access when the time comes. Your data stays sealed until then.
              </p>
            </div>
          </div>

          {/* Trusted Contacts */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-serif text-foreground">Trusted Contacts</h2>
              <p className="text-xs text-muted-foreground font-subheading">Up to 2 people who receive your vault when the time comes</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map(priority => {
                const contact = priority === 1 ? firstContact : secondContact;
                return (
                  <ContactSlot
                    key={priority}
                    priority={priority as 1 | 2}
                    contact={contact}
                    contactsLoading={contactsLoading}
                    onAdd={() => openContactCreate(priority as 1 | 2)}
                    onEdit={() => contact && openContactEdit(contact)}
                  />
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground font-subheading">
              💡 <strong>Recommendation:</strong> First contact — someone you trust deeply (spouse, sibling, best friend). Second contact — an attorney or estate executor who can handle the legal side.
            </p>
          </section>

          {/* Estate Documents */}
          <section className="space-y-6">
            <h2 className="text-xl font-serif text-foreground">Your Estate Documents</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ESTATE_CATEGORIES.map(cat => {
                const Icon = CATEGORY_ICONS[cat];
                const items = estateItems.filter(i => i.category === cat);
                return (
                  <div key={cat} className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
                    <div className="p-4 border-b border-border/30 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-subheading font-semibold text-foreground text-sm">{CATEGORY_LABELS[cat]}</h3>
                        <p className="text-xs text-muted-foreground">{items.length} document{items.length !== 1 ? "s" : ""}</p>
                      </div>
                      <button
                        onClick={() => openCreate(cat)}
                        className="text-primary hover:text-primary/80 transition-colors"
                        aria-label="Add document"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {items.length > 0 ? (
                      <div className="divide-y divide-border/20">
                        {items.map(item => (
                          <div key={item.id} className="px-4 py-3 flex items-start gap-2 group">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-subheading text-foreground truncate">{item.name}</p>
                              {item.content && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.content}</p>
                              )}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button onClick={() => openEdit(item)} className="text-muted-foreground hover:text-primary p-1">
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleDelete(item.id)} className="text-muted-foreground hover:text-destructive p-1">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-5 text-center">
                        <p className="text-xs text-muted-foreground font-subheading italic">{ESTATE_DESCRIPTIONS[cat]}</p>
                        <button
                          onClick={() => openCreate(cat)}
                          className="mt-3 text-xs text-primary hover:underline font-subheading flex items-center gap-1 mx-auto"
                        >
                          Write now <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* Dialogs */}
      <VaultFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        editingItem={editingItem}
        defaultCategory={defaultCategory}
      />
      <ContactDialog
        open={isContactOpen}
        onOpenChange={setIsContactOpen}
        editingContact={editingContact}
        defaultPriority={contactPriority}
      />
    </div>
  );
}

function ContactSlot({
  priority, contact, contactsLoading, onAdd, onEdit,
}: {
  priority: 1 | 2;
  contact?: VaultContact;
  contactsLoading: boolean;
  onAdd: () => void;
  onEdit: () => void;
}) {
  const deleteContact = useDeleteVaultContact();
  const queryClient = useQueryClient();

  const handleDelete = () => {
    if (!contact) return;
    deleteContact.mutate({ id: contact.id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetVaultContactsQueryKey() }),
    });
  };

  const label = priority === 1 ? "First Contact" : "Second Contact";
  const sublabel = priority === 1 ? "Primary — receives your vault first" : "Backup — receives your vault if first contact is unreachable";

  if (contactsLoading) return <Skeleton className="h-28 rounded-xl bg-muted/30" />;

  if (!contact) {
    return (
      <button
        onClick={onAdd}
        className="rounded-xl border border-dashed border-border/70 bg-card/20 hover:bg-card/40 hover:border-primary/50 transition-all p-5 text-left group"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
          </div>
          <div>
            <p className="font-subheading font-semibold text-sm text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{sublabel}</p>
          </div>
        </div>
        <p className="text-xs text-primary font-subheading">Add contact →</p>
      </button>
    );
  }

  const Icon = CONTACT_TYPE_ICONS[contact.type as ContactType] ?? User;

  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-5 group">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-subheading text-primary uppercase tracking-wide">{label}</span>
            <span className="text-xs text-muted-foreground">· {CONTACT_TYPE_LABELS[contact.type as ContactType]}</span>
          </div>
          <p className="font-serif text-base text-foreground mt-0.5">{contact.name}</p>
          {contact.relationship && (
            <p className="text-xs text-muted-foreground font-subheading">{contact.relationship}</p>
          )}
          <div className="flex flex-col gap-1 mt-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Mail className="w-3 h-3" /> {contact.email}
            </span>
            {contact.phone && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Phone className="w-3 h-3" /> {contact.phone}
              </span>
            )}
            {contact.firmName && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Building2 className="w-3 h-3" /> {contact.firmName}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEdit} className="text-muted-foreground hover:text-primary p-1">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleDelete} className="text-muted-foreground hover:text-destructive p-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="text-center py-16 border border-dashed border-border/50 rounded-2xl bg-card/20">
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="text-lg font-serif text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground font-subheading">{subtitle}</p>
    </div>
  );
}

function ItemCard({ item, onEdit, onDelete }: { item: VaultItem; onEdit: () => void; onDelete: () => void }) {
  const Icon = CATEGORY_ICONS[item.category as VaultCategory] ?? FileText;
  return (
    <div className="p-5 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm group relative">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-serif text-lg text-foreground truncate">{item.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-subheading text-muted-foreground">{CATEGORY_LABELS[item.category as VaultCategory] ?? item.category}</span>
            <span className="text-muted-foreground/50">·</span>
            <span className="text-xs font-subheading text-muted-foreground">{format(new Date(item.createdAt), "MMM d, yyyy")}</span>
          </div>
          {item.content && (
            <p className="text-sm text-foreground/70 mt-2 line-clamp-2">{item.content}</p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEdit} className="text-muted-foreground hover:text-primary p-1"><Pencil className="w-4 h-4" /></button>
          <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}

function VaultFormDialog({
  open, onOpenChange, editingItem, defaultCategory,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editingItem: VaultItem | null;
  defaultCategory: VaultCategory;
}) {
  const createVaultItem = useCreateVaultItem();
  const updateVaultItem = useUpdateVaultItem();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isEditing = editingItem !== null;
  const isPending = createVaultItem.isPending || updateVaultItem.isPending;

  const [name, setName] = useState("");
  const [category, setCategory] = useState<VaultCategory>(defaultCategory);
  const [content, setContent] = useState("");

  const isEstate = ESTATE_CATEGORIES.includes(category);

  useEffect(() => {
    if (open) {
      setName(editingItem?.name ?? "");
      setCategory((editingItem?.category as VaultCategory) ?? defaultCategory);
      setContent(editingItem?.content ?? "");
    }
  }, [open, editingItem, defaultCategory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const data = { name: name.trim(), category, content: content.trim() || undefined };
    const onSuccess = () => { queryClient.invalidateQueries({ queryKey: getGetVaultItemsQueryKey() }); onOpenChange(false); };
    const onError = () => toast({ variant: "destructive", title: isEditing ? "Couldn't update" : "Couldn't store", description: "Please try again." });
    if (isEditing && editingItem) {
      updateVaultItem.mutate({ id: editingItem.id, data }, { onSuccess, onError });
    } else {
      createVaultItem.mutate({ data }, { onSuccess, onError });
    }
  };

  const allCategories = [...GENERAL_CATEGORIES, ...ESTATE_CATEGORIES];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{isEditing ? "Edit Item" : "Store an Item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Category</label>
            <Select value={category} onValueChange={(v: VaultCategory) => setCategory(v)}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1 text-xs text-muted-foreground font-subheading uppercase tracking-wide">General</div>
                {GENERAL_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                ))}
                <div className="px-2 py-1 text-xs text-muted-foreground font-subheading uppercase tracking-wide mt-1 border-t border-border/50 pt-2">Estate & Final Wishes</div>
                {ESTATE_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Title</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-card border-border"
              placeholder={isEstate ? `e.g. ${CATEGORY_LABELS[category]}` : "Passport, will, insurance…"}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">
              {isEstate ? "Content" : "Notes / Content"}
            </label>
            {isEstate && ESTATE_PROMPTS[category] && (
              <p className="text-xs text-muted-foreground/80 font-subheading italic bg-muted/20 rounded-lg px-3 py-2">
                {ESTATE_PROMPTS[category]}
              </p>
            )}
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="bg-card border-border resize-none"
              style={{ minHeight: isEstate ? "180px" : "100px" }}
              placeholder={isEstate ? "Write your thoughts here…" : "The details you want to keep safe…"}
            />
          </div>

          <div className="flex justify-end pt-2 gap-3">
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

function ContactDialog({
  open, onOpenChange, editingContact, defaultPriority,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editingContact: VaultContact | null;
  defaultPriority: 1 | 2;
}) {
  const createContact = useCreateVaultContact();
  const updateContact = useUpdateVaultContact();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isEditing = editingContact !== null;
  const isPending = createContact.isPending || updateContact.isPending;

  const [type, setType] = useState<ContactType>("person");
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firmName, setFirmName] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setType((editingContact?.type as ContactType) ?? "person");
      setName(editingContact?.name ?? "");
      setRelationship(editingContact?.relationship ?? "");
      setEmail(editingContact?.email ?? "");
      setPhone(editingContact?.phone ?? "");
      setFirmName(editingContact?.firmName ?? "");
      setNotes(editingContact?.notes ?? "");
    }
  }, [open, editingContact]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    const data = {
      priority: editingContact?.priority ?? defaultPriority,
      type,
      name: name.trim(),
      relationship: relationship.trim() || undefined,
      email: email.trim(),
      phone: phone.trim() || undefined,
      firmName: firmName.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    const onSuccess = () => { queryClient.invalidateQueries({ queryKey: getGetVaultContactsQueryKey() }); onOpenChange(false); };
    const onError = () => toast({ variant: "destructive", title: "Couldn't save contact", description: "Please try again." });
    if (isEditing && editingContact) {
      updateContact.mutate({ id: editingContact.id, data }, { onSuccess, onError });
    } else {
      createContact.mutate({ data }, { onSuccess, onError });
    }
  };

  const priority = editingContact?.priority ?? defaultPriority;
  const Icon = CONTACT_TYPE_ICONS[type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {isEditing ? "Edit Contact" : `Add ${priority === 1 ? "First" : "Second"} Contact`}
          </DialogTitle>
          <p className="text-sm text-muted-foreground font-subheading">
            {priority === 1
              ? "Primary contact — receives your estate vault first."
              : "Backup contact — receives your vault if the first contact is unreachable."}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Type selector */}
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Contact Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(["person", "attorney", "executor"] as ContactType[]).map(t => {
                const TIcon = CONTACT_TYPE_ICONS[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      type === t ? "border-primary bg-primary/10" : "border-border/50 bg-card/30 hover:border-primary/40"
                    )}
                  >
                    <TIcon className={cn("w-4 h-4 mb-1", type === t ? "text-primary" : "text-muted-foreground")} />
                    <p className={cn("text-xs font-subheading font-medium", type === t ? "text-primary" : "text-foreground")}>{CONTACT_TYPE_LABELS[t]}</p>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground/80 font-subheading italic">{CONTACT_TYPE_DESCRIPTIONS[type]}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-subheading text-muted-foreground">Full Name *</label>
              <Input value={name} onChange={e => setName(e.target.value)} className="bg-card border-border" placeholder="John Smith" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-subheading text-muted-foreground">Relationship</label>
              <Input value={relationship} onChange={e => setRelationship(e.target.value)} className="bg-card border-border" placeholder="Spouse, Brother, Attorney…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-subheading text-muted-foreground">Email *</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-card border-border" placeholder="email@example.com" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-subheading text-muted-foreground">Phone</label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} className="bg-card border-border" placeholder="+1 (555) 000-0000" />
            </div>
            {(type === "attorney" || type === "executor") && (
              <div className="space-y-1.5">
                <label className="text-sm font-subheading text-muted-foreground">Firm / Organization</label>
                <Input value={firmName} onChange={e => setFirmName(e.target.value)} className="bg-card border-border" placeholder="Smith & Partners Law" />
              </div>
            )}
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-subheading text-muted-foreground">Additional Notes</label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="bg-card border-border resize-none min-h-[70px]" placeholder="Any instructions for this person…" />
            </div>
          </div>

          <div className="flex justify-end pt-2 gap-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || !email.trim() || isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Save Changes" : "Add Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
