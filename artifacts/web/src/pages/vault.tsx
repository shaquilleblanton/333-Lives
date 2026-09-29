import { useEffect, useRef, useState } from "react";
import {
  useGetVaultItems,
  useCreateVaultItem,
  useUpdateVaultItem,
  useDeleteVaultItem,
  useGetVaultContacts,
  useCreateVaultContact,
  useUpdateVaultContact,
  useDeleteVaultContact,
  useGetVaultFamilyItems,
  useGetVaultFamilyMembers,
  useGetVaultFamilyInvites,
  useCreateVaultFamilyInvite,
  useAcceptVaultFamilyInvite,
  useDeleteVaultFamilyMember,
  useRevokeVaultFamilyInvite,
  getGetVaultItemsQueryKey,
  getGetVaultContactsQueryKey,
  getGetVaultFamilyMembersQueryKey,
  getGetVaultFamilyItemsQueryKey,
  getGetVaultFamilyInvitesQueryKey,
} from "@workspace/api-client-react";
import type { VaultItem, VaultContact, VaultFamilyItem, VaultFamilyMember } from "@workspace/api-client-react";
import {
  Lock, Users, FileText, Image as ImageIcon, Book, Mic, Info, Plus, Pencil, Trash2,
  Loader2, ScrollText, Shield, Heart, Cpu, ClipboardList, ShieldCheck,
  User, Briefcase, UserCheck, Phone, Mail, Building2, ChevronRight,
  Paperclip, Download, UserPlus, UserMinus, Copy, Share2, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ErrorRetryView } from "@/components/ui/error-retry-view";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

type VaultCategory = "document" | "photo" | "journal" | "voice_note" | "important_info"
  | "final_letter" | "will" | "insurance" | "medical_directive" | "funeral_wishes" | "digital_assets";
type VaultVisibility = "private" | "family";
type ContactType = "person" | "attorney" | "executor";
type ActiveTab = "general" | "estate" | "family";

const GENERAL_CATEGORIES: VaultCategory[] = ["document", "photo", "journal", "voice_note", "important_info"];
const ESTATE_CATEGORIES: VaultCategory[] = ["final_letter", "will", "insurance", "medical_directive", "funeral_wishes", "digital_assets"];

const CATEGORY_ICONS: Record<VaultCategory, React.ElementType> = {
  document: FileText, photo: ImageIcon, journal: Book, voice_note: Mic, important_info: Info,
  final_letter: ScrollText, will: ClipboardList, insurance: ShieldCheck,
  medical_directive: Heart, funeral_wishes: Heart, digital_assets: Cpu,
};

const CATEGORY_LABELS: Record<VaultCategory, string> = {
  document: "Documents", photo: "Photos", journal: "Journals", voice_note: "Voice Notes",
  important_info: "Important Info", final_letter: "Final Letter", will: "Will & Testament",
  insurance: "Insurance Policies", medical_directive: "Medical Directive",
  funeral_wishes: "Funeral Wishes", digital_assets: "Digital Assets",
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
  final_letter: "Write from the heart. Who do you want to say something to?",
  will: "List your major assets, who should receive them, and any specific wishes.",
  insurance: "Include: insurance company, policy number, type of policy, coverage amount.",
  medical_directive: "Include: DNR preference, organ donation wishes, healthcare power of attorney.",
  funeral_wishes: "Include: burial or cremation preference, service type, music, readings.",
  digital_assets: "Include: email accounts, social media, bank/investment logins, crypto wallets.",
};

const CONTACT_TYPE_ICONS: Record<ContactType, React.ElementType> = { person: User, attorney: Briefcase, executor: UserCheck };
const CONTACT_TYPE_LABELS: Record<ContactType, string> = { person: "Trusted Person", attorney: "Attorney / Lawyer", executor: "Estate Executor" };
const CONTACT_TYPE_DESCRIPTIONS: Record<ContactType, string> = {
  person: "A family member or close friend you trust completely with your final wishes.",
  attorney: "A licensed attorney or law firm that will handle your estate legally.",
  executor: "The person legally responsible for carrying out your will and estate.",
};

/** Download and open a vault file in the browser */
async function downloadVaultFile(item: { id: number; name: string; mimeType?: string | null }) {
  const resp = await fetch(`/api/vault/${item.id}/file`, { credentials: "include" });
  if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = item.name || "vault_file";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Upload a file to the server for encryption and storage */
async function uploadVaultFile(itemId: number, file: File): Promise<VaultItem> {
  const resp = await fetch(`/api/vault/${itemId}/upload`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-Filename": file.name,
    },
    body: file,
  });
  if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
  return resp.json();
}

export default function Vault() {
  const { data: vaultItems, isLoading, isError, refetch } = useGetVaultItems();
  const { data: contacts, isLoading: contactsLoading } = useGetVaultContacts();
  const { data: familyItems = [], refetch: refetchFamilyItems } = useGetVaultFamilyItems();
  const { data: familyMembers = [], refetch: refetchFamilyMembers } = useGetVaultFamilyMembers();
  const { data: familyInvites = [] } = useGetVaultFamilyInvites();
  const deleteVaultItem = useDeleteVaultItem();
  const createInvite = useCreateVaultFamilyInvite();
  const acceptInvite = useAcceptVaultFamilyInvite();
  const deleteFamilyMember = useDeleteVaultFamilyMember();
  const revokeFamilyInvite = useRevokeVaultFamilyInvite();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>("general");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [defaultCategory, setDefaultCategory] = useState<VaultCategory>("document");
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<VaultContact | null>(null);
  const [contactPriority, setContactPriority] = useState<1 | 2>(1);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null);
  const [acceptInput, setAcceptInput] = useState("");
  const [acceptingInvite, setAcceptingInvite] = useState(false);

  const openCreate = (cat?: VaultCategory) => {
    setEditingItem(null);
    setDefaultCategory(cat ?? (activeTab === "estate" ? "final_letter" : "document"));
    setIsFormOpen(true);
  };
  const openEdit = (item: VaultItem) => { setEditingItem(item); setDefaultCategory(item.category as VaultCategory); setIsFormOpen(true); };
  const openContactEdit = (contact: VaultContact) => { setEditingContact(contact); setIsContactOpen(true); };
  const openContactCreate = (priority: 1 | 2) => { setEditingContact(null); setContactPriority(priority); setIsContactOpen(true); };

  const handleDelete = (id: number) => {
    deleteVaultItem.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetVaultItemsQueryKey() }),
      onError: () => toast({ variant: "destructive", title: "Couldn't remove item", description: "Please try again." }),
    });
  };

  const handleDownload = async (item: VaultItem | VaultFamilyItem) => {
    try { await downloadVaultFile(item); }
    catch (e) { toast({ variant: "destructive", title: "Couldn't open file", description: "Please try again." }); }
  };

  const handleCreateInvite = async () => {
    try {
      const result = await createInvite.mutateAsync(undefined as any);
      setInviteToken(result.token);
      setInviteExpiresAt(result.expiresAt);
      queryClient.invalidateQueries({ queryKey: getGetVaultFamilyInvitesQueryKey() });
    } catch { toast({ variant: "destructive", title: "Couldn't create invite" }); }
  };

  const handleCopyInvite = () => {
    if (inviteToken) {
      navigator.clipboard.writeText(inviteToken);
      toast({ title: "Invite code copied!" });
    }
  };

  const handleAcceptInvite = async () => {
    const token = acceptInput.trim();
    if (!token) return;
    setAcceptingInvite(true);
    try {
      await acceptInvite.mutateAsync({ token });
      queryClient.invalidateQueries({ queryKey: getGetVaultFamilyMembersQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetVaultFamilyItemsQueryKey() });
      setAcceptInput("");
      toast({ title: "Linked!", description: "You are now connected with this family member." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Couldn't accept invite", description: e?.message ?? "Invalid or expired code." });
    } finally { setAcceptingInvite(false); }
  };

  const handleUnlink = (linkId: number) => {
    deleteFamilyMember.mutate({ linkId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetVaultFamilyMembersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetVaultFamilyItemsQueryKey() });
      },
      onError: () => toast({ variant: "destructive", title: "Couldn't unlink" }),
    });
  };

  const handleRevokeInvite = (inviteId: number) => {
    revokeFamilyInvite.mutate({ inviteId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetVaultFamilyInvitesQueryKey() }),
      onError: () => toast({ variant: "destructive", title: "Couldn't revoke invite", description: "Please try again." }),
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
          <Plus className="w-4 h-4 mr-2" />Store Item
        </Button>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-xl w-fit">
        {(["general", "estate", "family"] as ActiveTab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn("px-5 py-2 rounded-lg text-sm font-subheading transition-all",
              activeTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "general" ? "General Vault" : tab === "estate" ? "Estate & Final Wishes" : "Family Vault"}
          </button>
        ))}
      </div>

      {/* Error state */}
      {isError && activeTab !== "family" && (
        <ErrorRetryView title="Couldn't load vault items"
          description="We had trouble loading your vault. Check your connection and try again."
          onRetry={() => refetch()}
        />
      )}

      {/* ── GENERAL TAB ── */}
      {!isError && activeTab === "general" && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {GENERAL_CATEGORIES.map(cat => {
              const Icon = CATEGORY_ICONS[cat];
              const count = generalItems.filter(i => i.category === cat).length;
              return (
                <button key={cat} onClick={() => openCreate(cat)}
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
            <EmptyState icon={<Shield className="w-12 h-12 text-muted-foreground/40" />}
              title="Your general vault is empty"
              subtitle="Store passports, passwords, photos, and important documents here."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {generalItems.map(item => (
                <ItemCard key={item.id} item={item}
                  onEdit={() => openEdit(item)}
                  onDelete={() => handleDelete(item.id)}
                  onDownload={item.fileUrl ? () => handleDownload(item) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ESTATE TAB ── */}
      {!isError && activeTab === "estate" && (
        <div className="space-y-10">
          <div className="rounded-2xl border border-border/50 bg-card/30 p-6 flex gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-serif text-lg text-foreground">Your Estate Vault</h2>
              <p className="text-sm text-muted-foreground font-subheading mt-1 max-w-2xl">
                Write your final wishes, will, insurance details, and end-of-life documents — then designate two trusted contacts who will receive access.
              </p>
            </div>
          </div>

          {/* Trusted Contacts */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-serif text-foreground">Trusted Contacts</h2>
              <p className="text-xs text-muted-foreground font-subheading">Up to 2 people who receive your vault</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map(priority => {
                const contact = priority === 1 ? firstContact : secondContact;
                return (
                  <ContactSlot key={priority} priority={priority as 1 | 2} contact={contact}
                    contactsLoading={contactsLoading}
                    onAdd={() => openContactCreate(priority as 1 | 2)}
                    onEdit={() => contact && openContactEdit(contact)}
                  />
                );
              })}
            </div>
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
                      <button onClick={() => openCreate(cat)} className="text-primary hover:text-primary/80" aria-label="Add">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {items.length > 0 ? (
                      <div className="divide-y divide-border/20">
                        {items.map(item => (
                          <div key={item.id} className="px-4 py-3 flex items-start gap-2 group">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-subheading text-foreground truncate">{item.name}</p>
                                {item.visibility === "family"
                                  ? <Users className="w-3 h-3 text-primary shrink-0" />
                                  : <Lock className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                                }
                                {item.fileUrl && <Paperclip className="w-3 h-3 text-muted-foreground/60 shrink-0" />}
                              </div>
                              {item.content && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.content}</p>}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              {item.fileUrl && (
                                <button onClick={() => handleDownload(item)} className="text-primary hover:text-primary/80 p-1">
                                  <Download className="w-3 h-3" />
                                </button>
                              )}
                              <button onClick={() => openEdit(item)} className="text-muted-foreground hover:text-primary p-1"><Pencil className="w-3 h-3" /></button>
                              <button onClick={() => handleDelete(item.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-5 text-center">
                        <p className="text-xs text-muted-foreground font-subheading italic">{ESTATE_DESCRIPTIONS[cat]}</p>
                        <button onClick={() => openCreate(cat)} className="mt-3 text-xs text-primary hover:underline font-subheading flex items-center gap-1 mx-auto">
                          Write now <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Family Access */}
          <section className="space-y-4">
            <h2 className="text-xl font-serif text-foreground">Family Access</h2>
            <div className="rounded-2xl border border-border/50 bg-card/30 p-6 space-y-5">
              <p className="text-sm text-muted-foreground font-subheading">
                Link family members so they can view documents you mark as <strong className="text-foreground">Family</strong> visible.
              </p>

              {/* Linked members */}
              {(familyMembers as VaultFamilyMember[]).length > 0 && (
                <div className="space-y-2">
                  {(familyMembers as VaultFamilyMember[]).map(m => (
                    <div key={m.linkId} className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/40">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-sm font-subheading text-foreground flex-1">{m.name}</p>
                      <button onClick={() => handleUnlink(m.linkId)} className="text-muted-foreground hover:text-destructive p-1 transition-colors">
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Create invite */}
              <div className="space-y-3">
                <Button variant="outline" size="sm" onClick={handleCreateInvite} disabled={createInvite.isPending} className="gap-2">
                  {createInvite.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Create invite link
                </Button>
                {inviteToken && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                    <p className="text-xs text-muted-foreground font-subheading">Share this invite code:</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-background border border-border/50 rounded-lg px-3 py-1.5 flex-1 truncate">{inviteToken}</code>
                      <button onClick={handleCopyInvite} className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground/70 font-subheading">
                      One-time use. Expires {inviteExpiresAt ? format(new Date(inviteExpiresAt), "MMM d, yyyy") : "in 7 days"}.
                    </p>
                  </div>
                )}
              </div>

              {familyInvites.length > 0 && (
                <div className="space-y-2 border-t border-border/40 pt-4">
                  <p className="text-sm font-subheading text-foreground">Pending invites</p>
                  {familyInvites.map(invite => {
                    const expired = new Date(invite.expiresAt).getTime() <= Date.now();
                    return (
                      <div key={invite.id} className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/50 p-3">
                        <div className="flex-1">
                          <p className="text-sm font-subheading text-foreground">{expired ? "Expired invite" : "Invite awaiting acceptance"}</p>
                          <p className="text-xs text-muted-foreground">
                            {expired ? "Expired" : "Expires"} {format(new Date(invite.expiresAt), "MMM d, yyyy")}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeInvite(invite.id)}
                          disabled={revokeFamilyInvite.isPending}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          Revoke
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Accept invite */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <p className="text-sm font-subheading text-foreground">Accept an invite</p>
                <div className="flex gap-2">
                  <Input
                    value={acceptInput} onChange={e => setAcceptInput(e.target.value)}
                    placeholder="Paste invite code…" className="bg-card border-border font-mono text-sm"
                  />
                  <Button variant="outline" onClick={handleAcceptInvite} disabled={!acceptInput.trim() || acceptingInvite} className="shrink-0">
                    {acceptingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : "Link"}
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── FAMILY TAB ── */}
      {activeTab === "family" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border/50 bg-card/30 p-5 flex gap-4">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-serif text-base text-foreground">Shared by family</h2>
              <p className="text-xs text-muted-foreground font-subheading mt-0.5">Documents your linked family members have shared with you.</p>
            </div>
          </div>

          {(familyItems as VaultFamilyItem[]).length === 0 ? (
            <EmptyState
              icon={<Users className="w-12 h-12 text-muted-foreground/40" />}
              title="No shared documents yet"
              subtitle="When a linked family member marks a document as Family, it will appear here."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {(familyItems as VaultFamilyItem[]).map(item => (
                <FamilyItemCard key={item.id} item={item} onDownload={() => handleDownload(item)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <VaultFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} editingItem={editingItem} defaultCategory={defaultCategory} />
      <ContactDialog open={isContactOpen} onOpenChange={setIsContactOpen} editingContact={editingContact} defaultPriority={contactPriority} />
    </div>
  );
}

// ── Components ────────────────────────────────────────────────────────────────

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="text-center py-16 border border-dashed border-border/50 rounded-2xl bg-card/20">
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="text-lg font-serif text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground font-subheading">{subtitle}</p>
    </div>
  );
}

function VisibilityBadge({ visibility }: { visibility?: string | null }) {
  const isFamily = visibility === "family";
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-subheading px-2 py-0.5 rounded-full border",
      isFamily ? "border-primary/30 bg-primary/5 text-primary" : "border-muted-foreground/20 bg-muted/20 text-muted-foreground/70"
    )}>
      {isFamily ? <Users className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
      {isFamily ? "Family" : "Private"}
    </span>
  );
}

function ItemCard({ item, onEdit, onDelete, onDownload }: { item: VaultItem; onEdit: () => void; onDelete: () => void; onDownload?: () => void }) {
  const Icon = CATEGORY_ICONS[item.category as VaultCategory] ?? FileText;
  return (
    <div className="p-5 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm group relative">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-serif text-lg text-foreground truncate">{item.name}</h4>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs font-subheading text-muted-foreground">{CATEGORY_LABELS[item.category as VaultCategory] ?? item.category}</span>
            <span className="text-muted-foreground/50">·</span>
            <span className="text-xs font-subheading text-muted-foreground">{format(new Date(item.createdAt), "MMM d, yyyy")}</span>
            <VisibilityBadge visibility={item.visibility} />
            {item.fileUrl && <Paperclip className="w-3 h-3 text-muted-foreground/60" />}
          </div>
          {item.content && <p className="text-sm text-foreground/70 mt-2 line-clamp-2">{item.content}</p>}
        </div>
        <div className="flex flex-col items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
          {onDownload && (
            <button onClick={onDownload} className="text-primary hover:text-primary/80 p-1" title="Download file">
              <Download className="w-4 h-4" />
            </button>
          )}
          <button onClick={onEdit} className="text-muted-foreground hover:text-primary p-1"><Pencil className="w-4 h-4" /></button>
          <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}

function FamilyItemCard({ item, onDownload }: { item: VaultFamilyItem; onDownload?: () => void }) {
  const Icon = CATEGORY_ICONS[item.category as VaultCategory] ?? FileText;
  const hasFile = item.sizeBytes !== null && item.sizeBytes !== undefined;
  return (
    <div className="p-5 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm group">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-serif text-lg text-foreground truncate">{item.name}</h4>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs font-subheading text-muted-foreground">{(item as any).ownerName}</span>
            <span className="text-muted-foreground/50">·</span>
            <span className="text-xs font-subheading text-muted-foreground">{CATEGORY_LABELS[item.category as VaultCategory] ?? item.category}</span>
            <Users className="w-3 h-3 text-primary" />
            {hasFile && <Paperclip className="w-3 h-3 text-muted-foreground/60" />}
          </div>
        </div>
        {onDownload && hasFile && (
          <button onClick={onDownload} className="text-primary hover:text-primary/80 p-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity" title="Download file">
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function ContactSlot({ priority, contact, contactsLoading, onAdd, onEdit }: {
  priority: 1 | 2; contact?: VaultContact; contactsLoading: boolean; onAdd: () => void; onEdit: () => void;
}) {
  const deleteContact = useDeleteVaultContact();
  const queryClient = useQueryClient();
  const handleDelete = () => {
    if (!contact) return;
    deleteContact.mutate({ id: contact.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetVaultContactsQueryKey() }) });
  };
  const label = priority === 1 ? "First Contact" : "Second Contact";
  const sublabel = priority === 1 ? "Primary — receives your vault first" : "Backup — if first is unreachable";
  if (contactsLoading) return <Skeleton className="h-28 rounded-xl bg-muted/30" />;
  if (!contact) {
    return (
      <button onClick={onAdd} className="rounded-xl border border-dashed border-border/70 bg-card/20 hover:bg-card/40 hover:border-primary/50 transition-all p-5 text-left group">
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
          {contact.relationship && <p className="text-xs text-muted-foreground font-subheading">{contact.relationship}</p>}
          <div className="flex flex-col gap-1 mt-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Mail className="w-3 h-3" /> {contact.email}</span>
            {contact.phone && <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="w-3 h-3" /> {contact.phone}</span>}
            {contact.firmName && <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Building2 className="w-3 h-3" /> {contact.firmName}</span>}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEdit} className="text-muted-foreground hover:text-primary p-1"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={handleDelete} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

// ── Form Dialogs ──────────────────────────────────────────────────────────────

function VaultFormDialog({ open, onOpenChange, editingItem, defaultCategory }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  editingItem: VaultItem | null; defaultCategory: VaultCategory;
}) {
  const createVaultItem = useCreateVaultItem();
  const updateVaultItem = useUpdateVaultItem();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = editingItem !== null;

  const [name, setName] = useState("");
  const [category, setCategory] = useState<VaultCategory>(defaultCategory);
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<VaultVisibility>("private");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const isEstate = ESTATE_CATEGORIES.includes(category);

  useEffect(() => {
    if (open) {
      setName(editingItem?.name ?? "");
      setCategory((editingItem?.category as VaultCategory) ?? defaultCategory);
      setContent(editingItem?.content ?? "");
      setVisibility((editingItem?.visibility as VaultVisibility) ?? "private");
      setPendingFile(null);
    }
  }, [open, editingItem, defaultCategory]);

  const isPending = createVaultItem.isPending || updateVaultItem.isPending || isUploading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const data = { name: name.trim(), category, content: content.trim() || undefined, visibility };
      let saved: VaultItem;
      if (isEditing && editingItem) {
        saved = await updateVaultItem.mutateAsync({ id: editingItem.id, data });
      } else {
        saved = await createVaultItem.mutateAsync({ data });
      }
      if (pendingFile) {
        setIsUploading(true);
        try { await uploadVaultFile(saved.id, pendingFile); }
        finally { setIsUploading(false); }
      }
      queryClient.invalidateQueries({ queryKey: getGetVaultItemsQueryKey() });
      onOpenChange(false);
    } catch {
      toast({ variant: "destructive", title: isEditing ? "Couldn't update" : "Couldn't store", description: "Please try again." });
      setIsUploading(false);
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
          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Category</label>
            <Select value={category} onValueChange={(v: VaultCategory) => setCategory(v)}>
              <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1 text-xs text-muted-foreground font-subheading uppercase tracking-wide">General</div>
                {GENERAL_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>)}
                <div className="px-2 py-1 text-xs text-muted-foreground font-subheading uppercase tracking-wide mt-1 border-t border-border/50 pt-2">Estate & Final Wishes</div>
                {ESTATE_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Title</label>
            <Input value={name} onChange={e => setName(e.target.value)} className="bg-card border-border"
              placeholder={isEstate ? `e.g. ${CATEGORY_LABELS[category]}` : "Passport, will, insurance…"} required />
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Visibility</label>
            <div className="flex gap-2">
              {(["private", "family"] as VaultVisibility[]).map(v => (
                <button key={v} type="button" onClick={() => setVisibility(v)}
                  className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-subheading transition-all",
                    visibility === v ? "border-primary bg-primary/10 text-primary" : "border-border/50 bg-card/30 text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {v === "private" ? <Lock className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                  {v === "private" ? "Private" : "Family"}
                </button>
              ))}
              <p className="text-xs text-muted-foreground font-subheading self-center ml-2">
                {visibility === "private" ? "Only you can see this" : "Linked family members can view this"}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">{isEstate ? "Content" : "Notes / Content"}</label>
            {isEstate && ESTATE_PROMPTS[category] && (
              <p className="text-xs text-muted-foreground/80 font-subheading italic bg-muted/20 rounded-lg px-3 py-2">{ESTATE_PROMPTS[category]}</p>
            )}
            <Textarea value={content} onChange={e => setContent(e.target.value)}
              className="bg-card border-border resize-none" style={{ minHeight: isEstate ? "160px" : "100px" }}
              placeholder={isEstate ? "Write your thoughts here…" : "The details you want to keep safe…"}
            />
          </div>

          {/* File attachment */}
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Attach a file <span className="text-muted-foreground/60">(encrypted at rest)</span></label>
            <input ref={fileInputRef} type="file" className="hidden" onChange={e => setPendingFile(e.target.files?.[0] ?? null)} />
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className={cn("w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed text-sm font-subheading transition-all",
                pendingFile || editingItem?.fileUrl
                  ? "border-primary/40 bg-primary/5 text-primary"
                  : "border-border/60 bg-card/20 text-muted-foreground hover:border-primary/40 hover:text-primary"
              )}
            >
              <Paperclip className="w-4 h-4" />
              {pendingFile ? pendingFile.name : editingItem?.fileUrl ? "Replace file…" : "Click to attach a file…"}
              {pendingFile && (
                <button type="button" onClick={e => { e.stopPropagation(); setPendingFile(null); }}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                >×</button>
              )}
            </button>
          </div>

          <div className="flex justify-end pt-2 gap-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isUploading ? "Encrypting…" : isEditing ? "Save Changes" : "Store Securely"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ContactDialog({ open, onOpenChange, editingContact, defaultPriority }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  editingContact: VaultContact | null; defaultPriority: 1 | 2;
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
    const data = { priority: editingContact?.priority ?? defaultPriority, type, name: name.trim(), relationship: relationship.trim() || undefined, email: email.trim(), phone: phone.trim() || undefined, firmName: firmName.trim() || undefined, notes: notes.trim() || undefined };
    const onSuccess = () => { queryClient.invalidateQueries({ queryKey: getGetVaultContactsQueryKey() }); onOpenChange(false); };
    const onError = () => toast({ variant: "destructive", title: "Couldn't save contact" });
    if (isEditing && editingContact) { updateContact.mutate({ id: editingContact.id, data }, { onSuccess, onError }); }
    else { createContact.mutate({ data }, { onSuccess, onError }); }
  };

  const priority = editingContact?.priority ?? defaultPriority;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {isEditing ? "Edit Contact" : `Add ${priority === 1 ? "First" : "Second"} Contact`}
          </DialogTitle>
          <p className="text-sm text-muted-foreground font-subheading">
            {priority === 1 ? "Primary contact — receives your estate vault first." : "Backup contact — receives vault if first contact is unreachable."}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Contact Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(["person", "attorney", "executor"] as ContactType[]).map(t => {
                const TIcon = CONTACT_TYPE_ICONS[t];
                return (
                  <button key={t} type="button" onClick={() => setType(t)}
                    className={cn("p-3 rounded-xl border text-left transition-all",
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
