import { Feather } from "@expo/vector-icons";
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
  getUploadVaultFileUrl,
  getGetVaultFileUrl,
  getBaseUrl,
} from "@workspace/api-client-react";
import type { VaultItem, VaultContact, VaultFamilyItem, VaultFamilyMember } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { uploadAsync, downloadAsync, deleteAsync, cacheDirectory, FileSystemUploadType } from "expo-file-system/legacy";
import { useAuth } from "@clerk/expo";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform,
  Pressable, RefreshControl, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

type VaultCategory = "document" | "photo" | "journal" | "voice_note" | "important_info"
  | "final_letter" | "will" | "insurance" | "medical_directive" | "funeral_wishes" | "digital_assets";
type VaultVisibility = "private" | "family";
type ContactType = "person" | "attorney" | "executor";
type ActiveTab = "general" | "estate" | "family";

const GENERAL_CATEGORIES: VaultCategory[] = ["document", "photo", "journal", "voice_note", "important_info"];
const ESTATE_CATEGORIES: VaultCategory[] = ["final_letter", "will", "insurance", "medical_directive", "funeral_wishes", "digital_assets"];

const CATEGORY_ICONS: Record<VaultCategory, keyof typeof Feather.glyphMap> = {
  document: "file-text", photo: "image", journal: "book", voice_note: "mic",
  important_info: "info", final_letter: "edit-3", will: "clipboard",
  insurance: "shield", medical_directive: "heart", funeral_wishes: "sun", digital_assets: "cpu",
};

const CATEGORY_LABELS: Record<VaultCategory, string> = {
  document: "Document", photo: "Photo", journal: "Journal", voice_note: "Voice Note",
  important_info: "Important Info", final_letter: "Final Letter", will: "Will & Testament",
  insurance: "Insurance", medical_directive: "Medical Directive",
  funeral_wishes: "Funeral Wishes", digital_assets: "Digital Assets",
};

const ESTATE_PROMPTS: Record<string, string> = {
  final_letter: "Write from the heart — what do you want your loved ones to know?",
  will: "List your major assets, who should receive them, and any specific wishes.",
  insurance: "Policy number, provider, type, coverage amount, and claim instructions.",
  medical_directive: "DNR preference, organ donation, healthcare proxy, life-sustaining measures.",
  funeral_wishes: "Burial or cremation, location, service type, music, readings.",
  digital_assets: "Email, social media, bank logins, crypto wallets, streaming accounts.",
};

const CONTACT_TYPE_LABELS: Record<ContactType, string> = { person: "Trusted Person", attorney: "Attorney / Lawyer", executor: "Estate Executor" };
const CONTACT_ICONS: Record<ContactType, keyof typeof Feather.glyphMap> = { person: "user", attorney: "briefcase", executor: "user-check" };

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

function getExtFromMime(mimeType?: string | null): string {
  if (!mimeType) return "";
  const sub = mimeType.split("/")[1]?.split(";")[0]?.split("+")[0] ?? "";
  const map: Record<string, string> = {
    pdf: ".pdf", jpeg: ".jpg", jpg: ".jpg", png: ".png", mp4: ".mp4",
    msword: ".doc", plain: ".txt",
    "vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  };
  return map[sub] ?? (sub ? `.${sub}` : "");
}

// ── Item Form Modal ──────────────────────────────────────────────────────────
type PendingFile = { uri: string; name: string; mimeType?: string };

function VaultItemModal({
  visible, item, defaultCategory, onClose, onSave, isSaving,
}: {
  visible: boolean;
  item: VaultItem | null;
  defaultCategory: VaultCategory;
  onClose: () => void;
  onSave: (data: { name: string; category: VaultCategory; content: string; visibility: VaultVisibility }, file?: PendingFile) => void;
  isSaving: boolean;
}) {
  const colors = useColors();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<VaultCategory>(defaultCategory);
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<VaultVisibility>("private");
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);

  useEffect(() => {
    if (visible) {
      setName(item?.name ?? "");
      setCategory((item?.category as VaultCategory) ?? defaultCategory);
      setContent(item?.content ?? "");
      setVisibility((item?.visibility as VaultVisibility) ?? "private");
      setPendingFile(null);
    }
  }, [visible, item, defaultCategory]);

  const isEstate = ESTATE_CATEGORIES.includes(category);
  const allCats = [...GENERAL_CATEGORIES, ...ESTATE_CATEGORIES];

  async function pickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setPendingFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? undefined });
      }
    } catch {
      Alert.alert("Couldn't open picker", "Please try again.");
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1 }}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView
            style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}
            contentContainerStyle={{ gap: 12, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{item ? "Edit Item" : "Store Item"}</Text>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -24 }} contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}>
              {allCats.map(c => (
                <Pressable key={c} onPress={() => setCategory(c)}
                  style={[styles.pill, { borderColor: category === c ? colors.primary : colors.border, backgroundColor: category === c ? colors.primary + "1A" : "transparent" }]}
                >
                  <Text style={[styles.pillText, { color: category === c ? colors.primary : colors.mutedForeground }]}>{CATEGORY_LABELS[c]}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <TextInput
              value={name} onChangeText={setName}
              placeholder="Title…" placeholderTextColor={colors.mutedForeground + "99"}
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              autoFocus={!item}
            />

            {/* Visibility toggle */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Visibility</Text>
              <Pressable
                onPress={() => setVisibility(v => v === "private" ? "family" : "private")}
                style={[styles.visibilityBtn, { borderColor: visibility === "family" ? colors.primary + "60" : colors.border, backgroundColor: visibility === "family" ? colors.primary + "15" : "transparent" }]}
              >
                <Feather name={visibility === "private" ? "lock" : "users"} size={12} color={visibility === "family" ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.pillText, { color: visibility === "family" ? colors.primary : colors.mutedForeground }]}>
                  {visibility === "private" ? "Private" : "Family"}
                </Text>
              </Pressable>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground + "80", textTransform: "none", letterSpacing: 0, fontSize: 11 }]}>
                {visibility === "private" ? "Only you can see this" : "Linked family can see this"}
              </Text>
            </View>

            {isEstate && ESTATE_PROMPTS[category] && (
              <View style={[styles.promptBox, { backgroundColor: colors.muted + "30", borderColor: colors.border }]}>
                <Text style={[styles.promptText, { color: colors.mutedForeground }]}>{ESTATE_PROMPTS[category]}</Text>
              </View>
            )}

            <TextInput
              value={content} onChangeText={setContent}
              placeholder={isEstate ? "Write your thoughts here…" : "Notes / content…"}
              placeholderTextColor={colors.mutedForeground + "99"}
              style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              multiline numberOfLines={isEstate ? 8 : 4} textAlignVertical="top"
            />

            {/* File attachment */}
            <Pressable
              onPress={pickFile}
              style={[styles.filePickerBtn, { borderColor: pendingFile ? colors.primary + "50" : colors.border, backgroundColor: pendingFile ? colors.primary + "08" : "transparent" }]}
            >
              <Feather name="paperclip" size={14} color={pendingFile ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.pillText, { color: pendingFile ? colors.primary : colors.mutedForeground }]}>
                {pendingFile ? pendingFile.name : (item?.fileUrl ? "Replace file…" : "Attach file…")}
              </Text>
              {pendingFile && (
                <Pressable onPress={() => setPendingFile(null)} hitSlop={8}>
                  <Feather name="x" size={13} color={colors.mutedForeground} />
                </Pressable>
              )}
            </Pressable>

            <Pressable
              onPress={() => onSave({ name: name.trim(), category, content: content.trim(), visibility }, pendingFile ?? undefined)}
              disabled={!name.trim() || isSaving}
              style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: !name.trim() || isSaving ? 0.5 : pressed ? 0.85 : 1 }]}
            >
              {isSaving ? <ActivityIndicator color={colors.primaryForeground} size="small" /> : (
                <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>{item ? "Save Changes" : "Store Securely"}</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Contact Form Modal ───────────────────────────────────────────────────────
function ContactModal({
  visible, contact, defaultPriority, onClose, onSave, isSaving,
}: {
  visible: boolean; contact: VaultContact | null; defaultPriority: 1 | 2;
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
}) {
  const colors = useColors();
  const [type, setType] = useState<ContactType>("person");
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firmName, setFirmName] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (visible) {
      setType((contact?.type as ContactType) ?? "person");
      setName(contact?.name ?? "");
      setRelationship(contact?.relationship ?? "");
      setEmail(contact?.email ?? "");
      setPhone(contact?.phone ?? "");
      setFirmName(contact?.firmName ?? "");
      setNotes(contact?.notes ?? "");
    }
  }, [visible, contact]);

  const priority = contact?.priority ?? defaultPriority;
  const contactTypes: ContactType[] = ["person", "attorney", "executor"];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1 }}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView
            style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}
            contentContainerStyle={{ gap: 12, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              {contact ? "Edit Contact" : `Add ${priority === 1 ? "First" : "Second"} Contact`}
            </Text>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              {priority === 1 ? "Primary contact — receives your estate vault first" : "Backup contact — receives vault if first is unreachable"}
            </Text>

            <View style={{ flexDirection: "row", gap: 8 }}>
              {contactTypes.map(t => (
                <Pressable key={t} onPress={() => setType(t)}
                  style={[styles.pill, { flex: 1, justifyContent: "center", alignItems: "center",
                    borderColor: type === t ? colors.primary : colors.border,
                    backgroundColor: type === t ? colors.primary + "1A" : "transparent" }]}
                >
                  <Feather name={CONTACT_ICONS[t]} size={13} color={type === t ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.pillText, { color: type === t ? colors.primary : colors.mutedForeground, marginTop: 2 }]}>
                    {t === "person" ? "Person" : t === "attorney" ? "Attorney" : "Executor"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {[
              { value: name, set: setName, placeholder: "Full name *", key: "phone-pad" as any },
              { value: relationship, set: setRelationship, placeholder: "Relationship (e.g. Spouse, Sister)" },
              { value: email, set: setEmail, placeholder: "Email address *", key: "email-address" as any },
              { value: phone, set: setPhone, placeholder: "Phone number", key: "phone-pad" as any },
            ].map(({ value, set, placeholder, key }) => (
              <TextInput key={placeholder} value={value} onChangeText={set} placeholder={placeholder}
                placeholderTextColor={colors.mutedForeground + "99"} keyboardType={key}
                autoCapitalize={key === "email-address" ? "none" : "words"}
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              />
            ))}
            {(type === "attorney" || type === "executor") && (
              <TextInput value={firmName} onChangeText={setFirmName} placeholder="Firm / Organization name"
                placeholderTextColor={colors.mutedForeground + "99"}
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              />
            )}
            <TextInput value={notes} onChangeText={setNotes} placeholder="Notes or instructions…"
              placeholderTextColor={colors.mutedForeground + "99"} multiline numberOfLines={3} textAlignVertical="top"
              style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            />

            <Pressable
              onPress={() => onSave({ priority, type, name: name.trim(), relationship: relationship.trim() || undefined, email: email.trim(), phone: phone.trim() || undefined, firmName: firmName.trim() || undefined, notes: notes.trim() || undefined })}
              disabled={!name.trim() || !email.trim() || isSaving}
              style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: !name.trim() || !email.trim() || isSaving ? 0.5 : pressed ? 0.85 : 1 }]}
            >
              {isSaving ? <ActivityIndicator color={colors.primaryForeground} size="small" /> : (
                <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>{contact ? "Save Changes" : "Add Contact"}</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Item Card ────────────────────────────────────────────────────────────────
function ItemCard({ item, colors, onEdit, onDelete, onOpen }: {
  item: VaultItem; colors: any; onEdit: () => void; onDelete: () => void; onOpen?: () => void;
}) {
  const icon = CATEGORY_ICONS[item.category as VaultCategory] ?? "file";
  const hasFile = !!item.fileUrl;
  const isFamily = item.visibility === "family";

  return (
    <Pressable onPress={onEdit} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.itemIcon, { backgroundColor: colors.primary + "1A" }]}>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
          <Feather name={isFamily ? "users" : "lock"} size={11} color={isFamily ? colors.primary : colors.mutedForeground + "80"} />
          {hasFile && <Feather name="paperclip" size={11} color={colors.mutedForeground + "80"} />}
        </View>
        <Text style={[styles.itemCat, { color: colors.mutedForeground }]}>{CATEGORY_LABELS[item.category as VaultCategory] ?? item.category}</Text>
        {item.content && <Text style={[styles.itemContent, { color: colors.mutedForeground }]} numberOfLines={2}>{item.content}</Text>}
      </View>
      <View style={{ gap: 8, alignItems: "center" }}>
        {hasFile && onOpen && (
          <Pressable testID={`vault-open-file-${item.id}`} accessibilityLabel={`Open file ${item.name}`} onPress={onOpen} hitSlop={8} style={[styles.openBtn, { borderColor: colors.primary + "40", backgroundColor: colors.primary + "10" }]}>
            <Feather name="download" size={12} color={colors.primary} />
          </Pressable>
        )}
        <Pressable onPress={onDelete} hitSlop={8} style={{ padding: 4 }}>
          <Feather name="trash-2" size={14} color={colors.mutedForeground + "80"} />
        </Pressable>
      </View>
    </Pressable>
  );
}

// ── Family Item Card ─────────────────────────────────────────────────────────
function FamilyItemCard({ item, colors, onOpen }: { item: VaultFamilyItem; colors: any; onOpen: () => void }) {
  const icon = CATEGORY_ICONS[item.category as VaultCategory] ?? "file";
  const hasFile = item.sizeBytes !== null && item.sizeBytes !== undefined;
  return (
    <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.itemIcon, { backgroundColor: colors.primary + "1A" }]}>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.itemCat, { color: colors.mutedForeground }]}>{(item as any).ownerName} · {CATEGORY_LABELS[item.category as VaultCategory] ?? item.category}</Text>
      </View>
      {hasFile && (
        <Pressable testID={`vault-open-file-${item.id}`} accessibilityLabel={`Open file ${item.name}`} onPress={onOpen} hitSlop={8} style={[styles.openBtn, { borderColor: colors.primary + "40", backgroundColor: colors.primary + "10" }]}>
          <Feather name="download" size={12} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function VaultScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { getToken } = useAuth();

  const { data: items, isLoading, refetch, isRefetching } = useGetVaultItems();
  const { data: contacts, isLoading: contactsLoading, refetch: refetchContacts } = useGetVaultContacts();
  const { data: familyItems = [], refetch: refetchFamilyItems } = useGetVaultFamilyItems();
  const { data: familyMembers = [], refetch: refetchFamilyMembers } = useGetVaultFamilyMembers();
  const { data: familyInvites = [] } = useGetVaultFamilyInvites();
  const createItem = useCreateVaultItem();
  const updateItem = useUpdateVaultItem();
  const deleteItem = useDeleteVaultItem();
  const createContact = useCreateVaultContact();
  const updateContact = useUpdateVaultContact();
  const deleteContact = useDeleteVaultContact();
  const createInvite = useCreateVaultFamilyInvite();
  const acceptInvite = useAcceptVaultFamilyInvite();
  const deleteFamily = useDeleteVaultFamilyMember();
  const revokeInvite = useRevokeVaultFamilyInvite();

  const [activeTab, setActiveTab] = useState<ActiveTab>("general");
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [defaultCat, setDefaultCat] = useState<VaultCategory>("document");
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<VaultContact | null>(null);
  const [contactPriority, setContactPriority] = useState<1 | 2>(1);
  const [uploadingItemId, setUploadingItemId] = useState<number | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null);
  const [acceptInput, setAcceptInput] = useState("");
  const [acceptingInvite, setAcceptingInvite] = useState(false);

  function invalidateItems() { qc.invalidateQueries({ queryKey: getGetVaultItemsQueryKey() }); }
  function invalidateContacts() { qc.invalidateQueries({ queryKey: getGetVaultContactsQueryKey() }); }
  function invalidateFamily() {
    qc.invalidateQueries({ queryKey: getGetVaultFamilyMembersQueryKey() });
    qc.invalidateQueries({ queryKey: getGetVaultFamilyItemsQueryKey() });
  }
  function invalidateFamilyInvites() {
    qc.invalidateQueries({ queryKey: getGetVaultFamilyInvitesQueryKey() });
  }

  function openCreateItem(cat: VaultCategory) { setEditingItem(null); setDefaultCat(cat); setItemModalOpen(true); }
  function openEditItem(item: VaultItem) { setEditingItem(item); setDefaultCat(item.category as VaultCategory); setItemModalOpen(true); }
  function openCreateContact(priority: 1 | 2) { setEditingContact(null); setContactPriority(priority); setContactModalOpen(true); }
  function openEditContact(contact: VaultContact) { setEditingContact(contact); setContactModalOpen(true); }

  async function uploadFileToItem(itemId: number, file: PendingFile) {
    setUploadingItemId(itemId);
    try {
      const token = await getToken();
      const uploadUrl = `${getBaseUrl()}${getUploadVaultFileUrl(itemId)}`;
      const result = await uploadAsync(uploadUrl, file.uri, {
        uploadType: FileSystemUploadType.BINARY_CONTENT,
        headers: {
          Authorization: `Bearer ${token ?? ""}`,
          "X-Filename": file.name,
          "Content-Type": file.mimeType ?? "application/octet-stream",
        },
      });
      if (result.status >= 400) throw new Error(`Upload failed: ${result.status}`);
    } finally {
      setUploadingItemId(null);
    }
  }

  async function handleOpenFile(item: { id: number; name: string; fileUrl?: string | null; mimeType?: string | null }) {
    if (!item.fileUrl) return;
    let localUri: string | null = null;
    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again to open this file.");
      if (!cacheDirectory) throw new Error("Device storage is unavailable.");
      const downloadUrl = `${getBaseUrl()}${getGetVaultFileUrl(item.id)}`;
      const ext = getExtFromMime(item.mimeType);
      const safeName = (item.name || "vault_file").replace(/[^a-zA-Z0-9._-]/g, "_");
      localUri = `${cacheDirectory}vault-${item.id}-${Date.now()}-${safeName}${ext}`;
      const downloaded = await downloadAsync(downloadUrl, localUri, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (downloaded.status < 200 || downloaded.status >= 300) {
        throw new Error(`Secure download failed (${downloaded.status}).`);
      }
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error("The native file opener is unavailable on this device.");
      }
      await Sharing.shareAsync(downloaded.uri, {
        mimeType: item.mimeType ?? "application/octet-stream",
        dialogTitle: item.name,
      });
    } catch (error) {
      Alert.alert(
        "Couldn't open file",
        error instanceof Error ? error.message : "The secure download or native file opener failed.",
      );
    } finally {
      if (localUri) {
        // Sharing opens/copies the local file before resolving. Keep cache from
        // accumulating private Vault downloads once the native sheet is done.
        await deleteAsync(localUri, { idempotent: true }).catch(() => {});
      }
    }
  }

  function confirmDeleteItem(item: VaultItem) {
    Alert.alert("Delete item?", `"${item.name}" will be removed permanently.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try { await deleteItem.mutateAsync({ id: item.id }); invalidateItems(); }
          catch { Alert.alert("Couldn't delete", "Please try again."); }
        },
      },
    ]);
  }

  function confirmDeleteContact(contact: VaultContact) {
    Alert.alert("Remove contact?", `${contact.name} will be removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive", onPress: async () => {
          try { await deleteContact.mutateAsync({ id: contact.id }); invalidateContacts(); }
          catch { Alert.alert("Couldn't remove", "Please try again."); }
        },
      },
    ]);
  }

  async function handleSaveItem(
    data: { name: string; category: VaultCategory; content: string; visibility: VaultVisibility },
    file?: PendingFile,
  ) {
    try {
      let saved: VaultItem;
      if (editingItem) {
        saved = await updateItem.mutateAsync({ id: editingItem.id, data });
      } else {
        saved = await createItem.mutateAsync({ data });
      }
      if (file) {
        await uploadFileToItem(saved.id, file);
      }
      invalidateItems();
      setItemModalOpen(false);
    } catch {
      Alert.alert("Couldn't save", "Please try again.");
    }
  }

  async function handleSaveContact(data: any) {
    try {
      if (editingContact) { await updateContact.mutateAsync({ id: editingContact.id, data }); }
      else { await createContact.mutateAsync({ data }); }
      invalidateContacts();
      setContactModalOpen(false);
    } catch { Alert.alert("Couldn't save", "Please try again."); }
  }

  async function handleCreateInvite() {
    try {
      const result = await createInvite.mutateAsync(undefined as any);
      setInviteToken(result.token);
      setInviteExpiresAt(result.expiresAt);
      invalidateFamilyInvites();
    } catch { Alert.alert("Couldn't create invite", "Please try again."); }
  }

  async function handleShareInvite() {
    if (!inviteToken) return;
    await Share.share({ message: `Join my family vault on 333 Lives! Use this invite code: ${inviteToken}` });
  }

  async function handleAcceptInvite() {
    const token = acceptInput.trim();
    if (!token) return;
    setAcceptingInvite(true);
    try {
      await acceptInvite.mutateAsync({ token });
      invalidateFamily();
      setAcceptInput("");
      Alert.alert("Linked!", "You are now connected with this family member.");
    } catch (e: any) {
      Alert.alert("Couldn't accept invite", e?.message ?? "Invalid or expired invite.");
    } finally {
      setAcceptingInvite(false);
    }
  }

  function confirmRevokeInvite(inviteId: number) {
    Alert.alert("Revoke invite?", "The invite code will no longer be usable.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Revoke",
        style: "destructive",
        onPress: async () => {
          try {
            await revokeInvite.mutateAsync({ inviteId });
            invalidateFamilyInvites();
          } catch {
            Alert.alert("Couldn't revoke invite", "Please try again.");
          }
        },
      },
    ]);
  }

  const generalItems = items?.filter(i => GENERAL_CATEGORIES.includes(i.category as VaultCategory)) ?? [];
  const estateItems = items?.filter(i => ESTATE_CATEGORIES.includes(i.category as VaultCategory)) ?? [];
  const firstContact = contacts?.find(c => c.priority === 1);
  const secondContact = contacts?.find(c => c.priority === 2);
  const topPad = insets.top + WEB_TOP_INSET + 12;
  const botPad = insets.bottom + WEB_BOTTOM_INSET + 24;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: botPad, paddingHorizontal: 20, gap: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => { refetch(); refetchContacts(); refetchFamilyItems(); refetchFamilyMembers(); }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>Secure Vault</Text>
            <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>Your private sanctuary.</Text>
          </View>
          <Pressable onPress={() => openCreateItem(activeTab === "estate" ? "final_letter" : "document")}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Feather name="plus" size={20} color={colors.primaryForeground} />
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={[styles.tabBar, { backgroundColor: colors.muted + "30" }]}>
          {(["general", "estate", "family"] as ActiveTab[]).map(tab => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)}
              style={[styles.tabBtn, activeTab === tab && { backgroundColor: colors.card }]}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? colors.foreground : colors.mutedForeground }]}>
                {tab === "general" ? "General" : tab === "estate" ? "Estate" : "Family"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── GENERAL TAB ── */}
        {activeTab === "general" && (
          <>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {GENERAL_CATEGORIES.map(cat => {
                const count = generalItems.filter(i => i.category === cat).length;
                return (
                  <Pressable key={cat} onPress={() => openCreateItem(cat)}
                    style={({ pressed }) => [styles.catCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Feather name={CATEGORY_ICONS[cat]} size={18} color={colors.primary} />
                    <Text style={[styles.catLabel, { color: colors.foreground }]}>{CATEGORY_LABELS[cat]}</Text>
                    <Text style={[styles.catCount, { color: colors.mutedForeground }]}>{count}</Text>
                  </Pressable>
                );
              })}
            </View>

            {isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : generalItems.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="shield" size={40} color={colors.mutedForeground + "50"} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>General vault is empty</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Store passports, passwords, and important docs here.</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {generalItems.map(item => (
                  <ItemCard key={item.id} item={item} colors={colors}
                    onEdit={() => openEditItem(item)}
                    onDelete={() => confirmDeleteItem(item)}
                    onOpen={item.fileUrl ? () => handleOpenFile(item) : undefined}
                  />
                ))}
              </View>
            )}
          </>
        )}

        {/* ── ESTATE TAB ── */}
        {activeTab === "estate" && (
          <>
            <View style={[styles.infoBanner, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
              <Feather name="shield" size={16} color={colors.primary} style={{ marginTop: 1 }} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>
                Write your final wishes, will, and estate documents. Designate two trusted contacts who will receive access when the time comes.
              </Text>
            </View>

            {/* Trusted Contacts */}
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Trusted Contacts</Text>
            {[1, 2].map(priority => {
              const contact = priority === 1 ? firstContact : secondContact;
              const label = `${priority === 1 ? "First" : "Second"} Contact`;
              const sublabel = priority === 1 ? "Primary — receives your vault first" : "Backup — if first is unreachable";
              if (!contact) {
                return (
                  <Pressable key={priority} onPress={() => openCreateContact(priority as 1 | 2)}
                    style={({ pressed }) => [styles.contactSlot, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                  >
                    <View style={[styles.contactIcon, { backgroundColor: colors.muted + "30" }]}>
                      <Feather name="plus" size={18} color={colors.mutedForeground} />
                    </View>
                    <View>
                      <Text style={[styles.contactLabel, { color: colors.foreground }]}>{label}</Text>
                      <Text style={[styles.contactSub, { color: colors.mutedForeground }]}>{sublabel}</Text>
                    </View>
                  </Pressable>
                );
              }
              return (
                <View key={priority} style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.contactIcon, { backgroundColor: colors.primary + "1A" }]}>
                    <Feather name={CONTACT_ICONS[contact.type as ContactType] ?? "user"} size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[{ fontFamily: fonts.sub, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: colors.primary }]}>{label}</Text>
                    <Text style={[styles.contactName, { color: colors.foreground }]}>{contact.name}</Text>
                    {contact.relationship && <Text style={[styles.contactSub, { color: colors.mutedForeground }]}>{contact.relationship}</Text>}
                    <Text style={[styles.contactSub, { color: colors.mutedForeground, marginTop: 2 }]}>{contact.email}</Text>
                  </View>
                  <View style={{ gap: 6 }}>
                    <Pressable onPress={() => openEditContact(contact)} hitSlop={8}><Feather name="edit-2" size={14} color={colors.mutedForeground} /></Pressable>
                    <Pressable onPress={() => confirmDeleteContact(contact)} hitSlop={8}><Feather name="trash-2" size={14} color={colors.mutedForeground} /></Pressable>
                  </View>
                </View>
              );
            })}

            {/* Estate Documents */}
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 4 }]}>Your Estate Documents</Text>
            {ESTATE_CATEGORIES.map(cat => {
              const catItems = estateItems.filter(i => i.category === cat);
              return (
                <View key={cat} style={[styles.estateSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.estateSectionHeader}>
                    <View style={[styles.estateIcon, { backgroundColor: colors.primary + "1A" }]}>
                      <Feather name={CATEGORY_ICONS[cat]} size={15} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.estateCatLabel, { color: colors.foreground }]}>{CATEGORY_LABELS[cat]}</Text>
                      <Text style={[styles.estateCatCount, { color: colors.mutedForeground }]}>{catItems.length} document{catItems.length !== 1 ? "s" : ""}</Text>
                    </View>
                    <Pressable onPress={() => openCreateItem(cat)} hitSlop={8}><Feather name="plus" size={18} color={colors.primary} /></Pressable>
                  </View>
                  {catItems.length > 0 ? (
                    <View style={{ gap: 8, marginTop: 8 }}>
                      {catItems.map(item => (
                        <Pressable key={item.id} onPress={() => openEditItem(item)}
                          style={({ pressed }) => [styles.estateItem, { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                              <Text style={[styles.estateItemName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                              <Feather name={item.visibility === "family" ? "users" : "lock"} size={10} color={item.visibility === "family" ? colors.primary : colors.mutedForeground + "80"} />
                              {item.fileUrl && <Feather name="paperclip" size={10} color={colors.mutedForeground + "70"} />}
                            </View>
                            {item.content && <Text style={[styles.estateItemContent, { color: colors.mutedForeground }]} numberOfLines={1}>{item.content}</Text>}
                          </View>
                          <View style={{ flexDirection: "row", gap: 8 }}>
                            {item.fileUrl && (
                              <Pressable onPress={() => handleOpenFile(item)} hitSlop={8}>
                                <Feather name="download" size={13} color={colors.primary} />
                              </Pressable>
                            )}
                            <Pressable onPress={() => confirmDeleteItem(item)} hitSlop={8}>
                              <Feather name="trash-2" size={13} color={colors.mutedForeground + "80"} />
                            </Pressable>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <Pressable onPress={() => openCreateItem(cat)} style={{ marginTop: 8 }}>
                      <Text style={[styles.estatePrompt, { color: colors.mutedForeground }]} numberOfLines={2}>{ESTATE_PROMPTS[cat]}</Text>
                      <Text style={[{ fontFamily: fonts.sub, fontSize: 12, color: colors.primary, marginTop: 4 }]}>Write now →</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}

            {/* Family Access */}
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 4 }]}>Family Access</Text>
            <View style={[styles.familyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.infoText, { color: colors.mutedForeground, marginBottom: 12 }]}>
                Link family members so they can view documents you mark as "Family" visible.
              </Text>

              {/* Linked members */}
              {(familyMembers as VaultFamilyMember[]).map(m => (
                <View key={m.linkId} style={[styles.memberRow, { borderColor: colors.border }]}>
                  <View style={[styles.memberAvatar, { backgroundColor: colors.primary + "1A" }]}>
                    <Feather name="user" size={14} color={colors.primary} />
                  </View>
                  <Text style={[{ fontFamily: fonts.sub, fontSize: 13, flex: 1, color: colors.foreground }]}>{m.name}</Text>
                  <Pressable onPress={() => { deleteFamily.mutateAsync({ linkId: m.linkId }).then(() => invalidateFamily()); }} hitSlop={8}>
                    <Feather name="user-minus" size={14} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              ))}

              {/* Invite button */}
              <Pressable onPress={handleCreateInvite} disabled={createInvite.isPending}
                style={[styles.inviteBtn, { borderColor: colors.primary + "40", backgroundColor: colors.primary + "08" }]}
              >
                {createInvite.isPending ? <ActivityIndicator size="small" color={colors.primary} /> : (
                  <>
                    <Feather name="user-plus" size={14} color={colors.primary} />
                    <Text style={[styles.pillText, { color: colors.primary }]}>Create invite link</Text>
                  </>
                )}
              </Pressable>

              {inviteToken && (
                <View style={[styles.inviteTokenBox, { backgroundColor: colors.muted + "30", borderColor: colors.border }]}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                    Share this code · expires {inviteExpiresAt ? new Date(inviteExpiresAt).toLocaleDateString() : "in 7 days"}:
                  </Text>
                  <Text style={[{ fontFamily: fonts.body, fontSize: 12, color: colors.foreground, marginTop: 4, marginBottom: 8, letterSpacing: 0.5 }]} selectable>
                    {inviteToken}
                  </Text>
                  <Pressable onPress={handleShareInvite}
                    style={[styles.inviteBtn, { borderColor: colors.primary + "40", backgroundColor: colors.primary + "10" }]}
                  >
                    <Feather name="share-2" size={13} color={colors.primary} />
                    <Text style={[styles.pillText, { color: colors.primary }]}>Share invite</Text>
                  </Pressable>
                </View>
              )}

              {familyInvites.length > 0 && (
                <View style={{ marginTop: 12, gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
                  <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Pending invites</Text>
                  {familyInvites.map(invite => {
                    const expired = new Date(invite.expiresAt).getTime() <= Date.now();
                    return (
                      <View key={invite.id} style={[styles.memberRow, { borderColor: colors.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.pillText, { color: colors.foreground }]}>
                            {expired ? "Expired invite" : "Awaiting acceptance"}
                          </Text>
                          <Text style={[styles.contactSub, { color: colors.mutedForeground }]}>
                            {expired ? "Expired" : "Expires"} {new Date(invite.expiresAt).toLocaleDateString()}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => confirmRevokeInvite(invite.id)}
                          disabled={revokeInvite.isPending}
                          testID={`revoke-family-invite-${invite.id}`}
                          accessibilityRole="button"
                          accessibilityLabel="Revoke family invite"
                          hitSlop={8}
                        >
                          <Feather name="x-circle" size={17} color={colors.destructive ?? colors.mutedForeground} />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Accept invite */}
              <View style={{ marginTop: 12, gap: 8 }}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Accept an invite</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    value={acceptInput} onChangeText={setAcceptInput}
                    placeholder="Paste invite code…" placeholderTextColor={colors.mutedForeground + "80"}
                    style={[styles.input, { flex: 1, backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, paddingVertical: 8 }]}
                    autoCapitalize="none"
                  />
                  <Pressable onPress={handleAcceptInvite} disabled={!acceptInput.trim() || acceptingInvite}
                    style={[styles.saveBtn, { paddingHorizontal: 16, paddingVertical: 10, marginTop: 0, opacity: !acceptInput.trim() || acceptingInvite ? 0.5 : 1, backgroundColor: colors.primary }]}
                  >
                    {acceptingInvite ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : (
                      <Text style={[styles.saveBtnText, { color: colors.primaryForeground, fontSize: 13 }]}>Link</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </>
        )}

        {/* ── FAMILY TAB ── */}
        {activeTab === "family" && (
          <>
            <View style={[styles.infoBanner, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
              <Feather name="users" size={16} color={colors.primary} style={{ marginTop: 1 }} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>
                Documents your linked family members have shared with you.
              </Text>
            </View>
            {(familyItems as VaultFamilyItem[]).length === 0 ? (
              <View style={styles.empty}>
                <Feather name="users" size={40} color={colors.mutedForeground + "50"} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No shared documents yet</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                  When a family member marks a document as "Family", it will appear here.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {(familyItems as VaultFamilyItem[]).map(item => (
                  <FamilyItemCard key={item.id} item={item} colors={colors} onOpen={() => handleOpenFile(item)} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {uploadingItemId !== null && (
        <View style={[styles.uploadOverlay, { backgroundColor: colors.card + "EE" }]}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.emptySub, { color: colors.foreground, marginTop: 8 }]}>Encrypting & uploading…</Text>
        </View>
      )}

      <VaultItemModal
        visible={itemModalOpen} item={editingItem} defaultCategory={defaultCat}
        onClose={() => setItemModalOpen(false)} onSave={handleSaveItem}
        isSaving={createItem.isPending || updateItem.isPending || uploadingItemId !== null}
      />
      <ContactModal
        visible={contactModalOpen} contact={editingContact} defaultPriority={contactPriority}
        onClose={() => setContactModalOpen(false)} onSave={handleSaveContact}
        isSaving={createContact.isPending || updateContact.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  backBtn: { padding: 4 },
  pageTitle: { fontFamily: fonts.serifBold, fontSize: 28 },
  pageSub: { fontFamily: fonts.sub, fontSize: 13, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  tabBar: { flexDirection: "row", gap: 4, padding: 4, borderRadius: 12 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8 },
  tabText: { fontFamily: fonts.subSemibold, fontSize: 13 },
  catCard: { width: "30%", borderRadius: 12, borderWidth: 1, padding: 12, gap: 4, alignItems: "flex-start" },
  catLabel: { fontFamily: fonts.subSemibold, fontSize: 11 },
  catCount: { fontFamily: fonts.sub, fontSize: 10 },
  sectionTitle: { fontFamily: fonts.serifBold, fontSize: 20 },
  infoBanner: { flexDirection: "row", gap: 10, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "flex-start" },
  infoText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, flex: 1 },
  contactSlot: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", padding: 14 },
  contactCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  contactIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  contactLabel: { fontFamily: fonts.subSemibold, fontSize: 14 },
  contactName: { fontFamily: fonts.serif, fontSize: 16, marginTop: 2 },
  contactSub: { fontFamily: fonts.sub, fontSize: 12, marginTop: 1 },
  estateSection: { borderRadius: 14, borderWidth: 1, padding: 14 },
  estateSectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  estateIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  estateCatLabel: { fontFamily: fonts.subSemibold, fontSize: 14 },
  estateCatCount: { fontFamily: fonts.sub, fontSize: 11, marginTop: 1 },
  estateItem: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  estateItemName: { fontFamily: fonts.subSemibold, fontSize: 13 },
  estateItemContent: { fontFamily: fonts.body, fontSize: 11, marginTop: 1 },
  estatePrompt: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, fontStyle: "italic" },
  itemCard: { flexDirection: "row", alignItems: "flex-start", gap: 14, borderRadius: 14, borderWidth: 1, padding: 14 },
  itemIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  itemName: { fontFamily: fonts.serif, fontSize: 16 },
  itemCat: { fontFamily: fonts.sub, fontSize: 11, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  itemContent: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, marginTop: 4 },
  openBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  familyCard: { borderRadius: 14, borderWidth: 1, padding: 16 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, paddingBottom: 10, marginBottom: 10 },
  memberAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  inviteBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  inviteTokenBox: { borderRadius: 10, borderWidth: 1, padding: 12, marginTop: 10 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20 },
  emptySub: { fontFamily: fonts.sub, fontSize: 14, textAlign: "center" },
  overlay: { flex: 1 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 24, maxHeight: "90%" },
  sheetTitle: { fontFamily: fonts.serif, fontSize: 22, marginBottom: 4 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontFamily: fonts.body, fontSize: 14 },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  fieldLabel: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  pillText: { fontFamily: fonts.sub, fontSize: 12 },
  visibilityBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  filePickerBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", paddingHorizontal: 14, paddingVertical: 10 },
  saveBtn: { borderRadius: 999, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveBtnText: { fontFamily: fonts.subSemibold, fontSize: 15 },
  promptBox: { borderRadius: 10, borderWidth: 1, padding: 12 },
  promptText: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, fontStyle: "italic" },
  uploadOverlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
});
