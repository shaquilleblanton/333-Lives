import { Feather } from "@expo/vector-icons";
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
  requestUploadUrl,
} from "@workspace/api-client-react";
import type { FamilyMember, FamilyMemberMoment } from "@workspace/api-client-react";
import * as FileSystem from "expo-file-system/legacy";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

type Relation = "parent" | "child" | "sibling" | "grandparent" | "grandchild" | "aunt_uncle" | "cousin" | "ancestor" | "chosen_family" | "other";
type ViewMode = "list" | "tree";
type MomentType = "conversation" | "promise" | "milestone" | "memory" | "birthday" | "loss" | "gratitude" | "other";

const RELATION_LABELS: Record<Relation, string> = {
  parent: "Parent", child: "Child", sibling: "Sibling",
  grandparent: "Grandparent", grandchild: "Grandchild",
  aunt_uncle: "Aunt / Uncle", cousin: "Cousin",
  ancestor: "Ancestor", chosen_family: "Chosen Family", other: "Other",
};

const RELATIONS = Object.keys(RELATION_LABELS) as Relation[];

const GENERATION_ORDER: Relation[] = ["ancestor", "grandparent", "parent", "sibling", "child", "grandchild", "aunt_uncle", "cousin", "chosen_family", "other"];

const GENERATION_LABELS: Record<Relation, string> = {
  ancestor: "Ancestors & Heritage", grandparent: "Grandparents", parent: "Parents",
  sibling: "Siblings", child: "Children", grandchild: "Grandchildren",
  aunt_uncle: "Aunts & Uncles", cousin: "Cousins", chosen_family: "Chosen Family", other: "Other",
};

const MOMENT_TYPES: MomentType[] = ["conversation", "promise", "milestone", "memory", "birthday", "loss", "gratitude", "other"];
const MOMENT_LABELS: Record<MomentType, string> = {
  conversation: "Conversation", promise: "Promise", milestone: "Milestone", memory: "Memory",
  birthday: "Birthday", loss: "Loss", gratitude: "Gratitude", other: "Moment",
};

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function photoSrc(path: string) {
  return `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/storage${path}`;
}

function MemberCard({ member, onPress, onEdit, onDelete }: {
  member: FamilyMember;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();
  const isInMemory = !!member.deathDate;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, {
        backgroundColor: isInMemory ? colors.primary + "0D" : colors.card,
        borderColor: isInMemory ? colors.primary + "33" : colors.border,
      }]}
    >
      <View style={styles.cardRow}>
        <View style={[styles.avatar, {
          backgroundColor: isInMemory ? colors.primary + "1A" : colors.muted + "40",
          borderColor: isInMemory ? colors.primary + "50" : colors.border,
        }]}>
          {member.photoUrl
            ? <Image source={{ uri: photoSrc(member.photoUrl) }} style={styles.avatarImg} />
            : <Text style={[styles.avatarText, { color: isInMemory ? colors.primary : colors.foreground }]}>{getInitials(member.name)}</Text>
          }
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.cardNameRow}>
            <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>{member.name}</Text>
            <View style={[styles.relBadge, { borderColor: colors.border, backgroundColor: colors.muted + "30" }]}>
              <Text style={[styles.relText, { color: colors.mutedForeground }]}>{RELATION_LABELS[member.relation as Relation] ?? member.relation}</Text>
            </View>
          </View>
          {isInMemory && <Text style={[styles.inMemory, { color: colors.primary + "B0" }]}>In memory</Text>}
          {member.affiliation ? (
            <Text style={[styles.affiliation, { color: colors.primary + "99" }]} numberOfLines={1}>🪶 {member.affiliation}</Text>
          ) : null}
          {member.birthDate ? (
            <Text style={[styles.dates, { color: colors.mutedForeground }]}>
              b. {member.birthDate.slice(0, 4)}{member.deathDate ? ` — d. ${member.deathDate.slice(0, 4)}` : ""}
            </Text>
          ) : null}
        </View>
        <View style={styles.cardActions}>
          <Pressable onPress={onEdit} hitSlop={8} style={{ padding: 4 }}>
            <Feather name="edit-2" size={15} color={colors.mutedForeground + "80"} />
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={8} style={{ padding: 4, marginTop: 4 }}>
            <Feather name="trash-2" size={15} color={colors.mutedForeground + "80"} />
          </Pressable>
        </View>
      </View>
      {member.notes ? (
        <Text style={[styles.cardNotes, { color: colors.mutedForeground }]} numberOfLines={2}>{member.notes}</Text>
      ) : null}
    </Pressable>
  );
}

function MemberFormModal({ visible, member, onClose, onSave, isSaving }: {
  visible: boolean;
  member: FamilyMember | null;
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
}) {
  const colors = useColors();
  const [name, setName] = useState("");
  const [relation, setRelation] = useState<Relation>("other");
  const [birthDate, setBirthDate] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [birthplace, setBirthplace] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showRelPicker, setShowRelPicker] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setName(member?.name ?? "");
      setRelation((member?.relation as Relation) ?? "other");
      setBirthDate(member?.birthDate ?? "");
      setDeathDate(member?.deathDate ?? "");
      setBirthplace(member?.birthplace ?? "");
      setAffiliation(member?.affiliation ?? "");
      setNotes(member?.notes ?? "");
      setPhotoUri(null);
    }
  }, [visible, member]);

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Allow photo library access."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Allow camera access."); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  }

  async function submit() {
    if (!name.trim()) return;
    let resolvedPhotoUrl: string | undefined = undefined;
    if (photoUri) {
      try {
        const ext = photoUri.split(".").pop()?.toLowerCase() || "jpg";
        const contentType = ext === "png" ? "image/png" : ext === "heic" ? "image/heic" : "image/jpeg";
        const info = await FileSystem.getInfoAsync(photoUri);
        const size = info.exists && "size" in info ? (info.size as number) : 0;
        const upload = await requestUploadUrl({
          name: `family-member-${Date.now()}.${ext}`,
          size,
          contentType,
        });
        const result = await FileSystem.uploadAsync(upload.uploadURL, photoUri, {
          httpMethod: "PUT",
          headers: { "Content-Type": contentType },
        });
        if (result.status < 200 || result.status >= 300) throw new Error(`upload failed (${result.status})`);
        resolvedPhotoUrl = upload.objectPath;
      } catch {
        Alert.alert("Photo upload failed", "Couldn't upload the photo. Saving member without photo.");
      }
    }
    onSave({
      name: name.trim(),
      relation,
      birthDate: birthDate || undefined,
      deathDate: deathDate || undefined,
      birthplace: birthplace.trim() || undefined,
      affiliation: affiliation.trim() || undefined,
      notes: notes.trim() || undefined,
      photoUrl: resolvedPhotoUrl,
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <ScrollView
          style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{member ? "Edit Member" : "Add Family Member"}</Text>

          <View style={styles.photoRow}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            ) : null}
            <View style={styles.photoButtons}>
              <Pressable onPress={pickPhoto} style={[styles.photoBtn, { borderColor: colors.border, backgroundColor: colors.muted + "30" }]}>
                <Feather name="image" size={14} color={colors.mutedForeground} />
                <Text style={[styles.photoBtnText, { color: colors.mutedForeground }]}>Library</Text>
              </Pressable>
              <Pressable onPress={takePhoto} style={[styles.photoBtn, { borderColor: colors.border, backgroundColor: colors.muted + "30" }]}>
                <Feather name="camera" size={14} color={colors.mutedForeground} />
                <Text style={[styles.photoBtnText, { color: colors.mutedForeground }]}>Camera</Text>
              </Pressable>
            </View>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Full Name *</Text>
          <TextInput
            value={name} onChangeText={setName}
            placeholder="e.g. Mary Running Bear"
            placeholderTextColor={colors.mutedForeground + "99"}
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            autoFocus
          />

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Relation</Text>
          <Pressable
            onPress={() => setShowRelPicker(v => !v)}
            style={[styles.input, styles.selectBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
          >
            <Text style={[styles.selectText, { color: colors.foreground }]}>{RELATION_LABELS[relation]}</Text>
            <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
          </Pressable>
          {showRelPicker ? (
            <View style={[styles.relPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {RELATIONS.map(r => (
                <Pressable key={r} onPress={() => { setRelation(r); setShowRelPicker(false); }}
                  style={[styles.relOption, { borderBottomColor: colors.border, backgroundColor: r === relation ? colors.primary + "1A" : "transparent" }]}
                >
                  <Text style={[styles.relOptionText, { color: r === relation ? colors.primary : colors.foreground }]}>{RELATION_LABELS[r]}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Birth Date (YYYY-MM-DD)</Text>
          <TextInput
            value={birthDate} onChangeText={setBirthDate}
            placeholder="e.g. 1942-03-15"
            placeholderTextColor={colors.mutedForeground + "99"}
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
          />

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Death Date (if applicable)</Text>
          <TextInput
            value={deathDate} onChangeText={setDeathDate}
            placeholder="e.g. 2010-07-22"
            placeholderTextColor={colors.mutedForeground + "99"}
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
          />

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Birthplace</Text>
          <TextInput
            value={birthplace} onChangeText={setBirthplace}
            placeholder="e.g. Tahlequah, Oklahoma"
            placeholderTextColor={colors.mutedForeground + "99"}
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
          />

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Tribal / Cultural Affiliation</Text>
          <TextInput
            value={affiliation} onChangeText={setAffiliation}
            placeholder="e.g. Cherokee Nation, Lakota Sioux"
            placeholderTextColor={colors.mutedForeground + "99"}
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
          />

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Story & Notes</Text>
          <TextInput
            value={notes} onChangeText={setNotes}
            placeholder="Their life, their legacy, what you want to remember…"
            placeholderTextColor={colors.mutedForeground + "99"}
            style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            multiline numberOfLines={5} textAlignVertical="top"
          />

          <Pressable
            onPress={submit}
            disabled={!name.trim() || isSaving}
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: !name.trim() || isSaving ? 0.5 : 1, marginTop: 8 }]}
          >
            {isSaving ? <ActivityIndicator color="#000" size="small" /> : (
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>{member ? "Save Changes" : "Add to Tree"}</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MemberDetailModal({ member, visible, onClose, onEdit }: {
  member: FamilyMember | null;
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const colors = useColors();
  const qc = useQueryClient();
  const memberId = member?.id ?? 0;
  const { data: moments = [], isLoading } = useGetFamilyMemberMoments(memberId, {
    query: { enabled: !!member, queryKey: getGetFamilyMemberMomentsQueryKey(memberId) },
  });
  const createMoment = useCreateFamilyMemberMoment();
  const deleteMoment = useDeleteFamilyMemberMoment();
  const [showAddMoment, setShowAddMoment] = useState(false);
  const [mType, setMType] = useState<MomentType>("memory");
  const [mTitle, setMTitle] = useState("");
  const [mDate, setMDate] = useState(new Date().toISOString().split("T")[0]);
  const [mDesc, setMDesc] = useState("");

  if (!member) return null;
  const isInMemory = !!member.deathDate;

  function invalidate() { qc.invalidateQueries({ queryKey: getGetFamilyMemberMomentsQueryKey(memberId) }); }

  async function handleAddMoment() {
    if (!mTitle.trim()) return;
    try {
      await createMoment.mutateAsync({ memberId, data: { date: mDate, type: mType, title: mTitle.trim(), description: mDesc.trim() || undefined } as any });
      invalidate();
      setShowAddMoment(false); setMTitle(""); setMDate(new Date().toISOString().split("T")[0]); setMType("memory"); setMDesc("");
    } catch {
      Alert.alert("Couldn't save moment", "Please check your connection and try again.");
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1 }}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={[styles.detailSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.detailHeader}>
            <View style={[styles.detailAvatar, {
              backgroundColor: isInMemory ? colors.primary + "1A" : colors.muted + "40",
              borderColor: isInMemory ? colors.primary + "50" : colors.border,
            }]}>
              {member.photoUrl
                ? <Image source={{ uri: photoSrc(member.photoUrl) }} style={styles.detailAvatarImg} />
                : <Text style={[styles.detailAvatarText, { color: isInMemory ? colors.primary : colors.foreground }]}>{getInitials(member.name)}</Text>
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailName, { color: colors.foreground }]}>{member.name}</Text>
              <Text style={[styles.relBadgeText, { color: colors.mutedForeground }]}>{RELATION_LABELS[member.relation as Relation] ?? member.relation}</Text>
              {isInMemory && <Text style={[styles.inMemory, { color: colors.primary + "B0" }]}>In memory</Text>}
            </View>
            <View style={{ flexDirection: "row", gap: 4 }}>
              <Pressable onPress={onEdit} hitSlop={8} style={{ padding: 6 }}>
                <Feather name="edit-2" size={18} color={colors.mutedForeground} />
              </Pressable>
              <Pressable onPress={onClose} hitSlop={8} style={{ padding: 6 }}>
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={styles.metaGrid}>
              {member.birthDate ? (
                <View style={[styles.metaCell, { backgroundColor: colors.muted + "20", borderColor: colors.border }]}>
                  <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Born</Text>
                  <Text style={[styles.metaValue, { color: colors.foreground }]}>{member.birthDate}</Text>
                </View>
              ) : null}
              {member.deathDate ? (
                <View style={[styles.metaCell, { backgroundColor: colors.muted + "20", borderColor: colors.border }]}>
                  <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Passed</Text>
                  <Text style={[styles.metaValue, { color: colors.foreground }]}>{member.deathDate}</Text>
                </View>
              ) : null}
              {member.birthplace ? (
                <View style={[styles.metaCell, styles.metaCellFull, { backgroundColor: colors.muted + "20", borderColor: colors.border }]}>
                  <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Birthplace</Text>
                  <Text style={[styles.metaValue, { color: colors.foreground }]}>{member.birthplace}</Text>
                </View>
              ) : null}
              {member.affiliation ? (
                <View style={[styles.metaCell, styles.metaCellFull, { backgroundColor: colors.primary + "0D", borderColor: colors.primary + "30" }]}>
                  <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Affiliation</Text>
                  <Text style={[styles.metaValue, { color: colors.primary }]}>🪶 {member.affiliation}</Text>
                </View>
              ) : null}
            </View>

            {member.notes ? (
              <View style={[styles.notesBox, { backgroundColor: colors.muted + "20", borderColor: colors.border }]}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Story & Notes</Text>
                <Text style={[styles.notesText, { color: colors.foreground }]}>{member.notes}</Text>
              </View>
            ) : null}

            <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
              <View style={styles.momentsHeader}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Moments & Stories</Text>
                <Pressable onPress={() => setShowAddMoment(v => !v)}>
                  <Feather name="plus" size={16} color={colors.primary} />
                </Pressable>
              </View>

              {showAddMoment ? (
                <View style={[styles.addMomentBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <TextInput
                    value={mTitle} onChangeText={setMTitle}
                    placeholder="Title"
                    placeholderTextColor={colors.mutedForeground + "99"}
                    style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  />
                  <TextInput
                    value={mDate} onChangeText={setMDate}
                    placeholder="Date (YYYY-MM-DD)"
                    placeholderTextColor={colors.mutedForeground + "99"}
                    style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  />
                  <View style={styles.pills}>
                    {MOMENT_TYPES.map(t => (
                      <Pressable key={t} onPress={() => setMType(t)}
                        style={[styles.pill, { borderColor: mType === t ? colors.primary : colors.border, backgroundColor: mType === t ? colors.primary + "1A" : "transparent" }]}
                      >
                        <Text style={[styles.pillText, { color: mType === t ? colors.primary : colors.mutedForeground }]}>{MOMENT_LABELS[t]}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    value={mDesc} onChangeText={setMDesc}
                    placeholder="Details (optional)"
                    placeholderTextColor={colors.mutedForeground + "99"}
                    style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    multiline numberOfLines={3} textAlignVertical="top"
                  />
                  <Pressable
                    onPress={handleAddMoment}
                    disabled={!mTitle.trim() || createMoment.isPending}
                    style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: !mTitle.trim() || createMoment.isPending ? 0.5 : 1 }]}
                  >
                    {createMoment.isPending ? <ActivityIndicator color="#000" size="small" /> : <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Add Moment</Text>}
                  </Pressable>
                </View>
              ) : null}

              {isLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
              ) : moments.length === 0 ? (
                <View style={styles.emptyMoments}>
                  <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>No moments yet. Tap + to add one.</Text>
                </View>
              ) : (
                <View style={{ marginTop: 8, gap: 10 }}>
                  {(moments as FamilyMemberMoment[]).map(m => (
                    <View key={m.id} style={[styles.momentCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <View style={styles.momentRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.momentTitle, { color: colors.foreground }]}>{m.title}</Text>
                          <Text style={[styles.momentMeta, { color: colors.mutedForeground }]}>{MOMENT_LABELS[m.type as MomentType] ?? m.type} · {m.date}</Text>
                          {m.description ? <Text style={[styles.momentDesc, { color: colors.mutedForeground }]}>{m.description}</Text> : null}
                        </View>
                        <Pressable hitSlop={8} style={{ padding: 4 }}
                          onPress={() => deleteMoment.mutate({ memberId, id: m.id }, { onSuccess: invalidate })}
                        >
                          <Feather name="trash-2" size={14} color={colors.mutedForeground + "60"} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function FamilyTreeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data: members, isLoading, refetch, isRefetching } = useGetFamilyMembers();
  const createMember = useCreateFamilyMember();
  const updateMember = useUpdateFamilyMember();
  const deleteMember = useDeleteFamilyMember();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [detailMember, setDetailMember] = useState<FamilyMember | null>(null);
  const [search, setSearch] = useState("");
  const [filterRelation, setFilterRelation] = useState<"all" | Relation>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "living" | "deceased">("all");

  const topPad = insets.top + WEB_TOP_INSET + 16;
  const botPad = insets.bottom + WEB_BOTTOM_INSET + 16;

  function invalidate() { qc.invalidateQueries({ queryKey: getGetFamilyMembersQueryKey() }); }

  const filtered = useMemo(() => {
    if (!members) return [];
    const q = search.toLowerCase();
    return members.filter(m => {
      const matchSearch = !q || m.name.toLowerCase().includes(q) || (m.affiliation ?? "").toLowerCase().includes(q);
      const matchRel = filterRelation === "all" || m.relation === filterRelation;
      const matchStatus = filterStatus === "all" || (filterStatus === "deceased" ? !!m.deathDate : !m.deathDate);
      return matchSearch && matchRel && matchStatus;
    });
  }, [members, search, filterRelation, filterStatus]);

  const treeGroups = useMemo(() => {
    if (!filtered) return [];
    return GENERATION_ORDER.filter(g => filtered.some(m => m.relation === g)).map(g => ({
      gen: g,
      label: GENERATION_LABELS[g],
      members: filtered.filter(m => m.relation === g),
    }));
  }, [filtered]);

  async function handleSave(data: any) {
    try {
      if (editingMember) {
        await updateMember.mutateAsync({ id: editingMember.id, data });
      } else {
        await createMember.mutateAsync({ data });
      }
      invalidate();
      setFormOpen(false);
      setEditingMember(null);
    } catch { Alert.alert("Couldn't save", "Please try again."); }
  }

  function confirmDelete(member: FamilyMember) {
    Alert.alert("Remove member?", `Remove ${member.name} from your family tree?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          try { await deleteMember.mutateAsync({ id: member.id }); invalidate(); setDetailMember(null); }
          catch { Alert.alert("Couldn't remove", "Please try again."); }
        },
      },
    ]);
  }

  const isSaving = createMember.isPending || updateMember.isPending;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, paddingBottom: 12, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Family Tree</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>Your lineage & ancestors</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setViewMode(v => v === "list" ? "tree" : "list")}
            style={[styles.viewToggleBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <Feather name={viewMode === "list" ? "git-branch" : "list"} size={16} color={colors.mutedForeground} />
          </Pressable>
          <Pressable
            onPress={() => { setEditingMember(null); setFormOpen(true); }}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={18} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.searchRow, { paddingHorizontal: 20, paddingVertical: 10 }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={14} color={colors.mutedForeground} />
          <TextInput
            value={search} onChangeText={setSearch}
            placeholder="Search names, affiliations…"
            placeholderTextColor={colors.mutedForeground + "99"}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {search ? (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={{ flexShrink: 0 }}
      >
        {/* Status filter */}
        {(["all", "living", "deceased"] as const).map(s => (
          <Pressable key={s} onPress={() => setFilterStatus(s)}
            style={[styles.filterPill, {
              borderColor: filterStatus === s ? colors.primary : colors.border,
              backgroundColor: filterStatus === s ? colors.primary + "1A" : "transparent",
            }]}
          >
            <Text style={[styles.filterPillText, { color: filterStatus === s ? colors.primary : colors.mutedForeground }]}>
              {s === "all" ? "All" : s === "deceased" ? "In Memory" : "Living"}
            </Text>
          </Pressable>
        ))}
        <View style={[styles.filterDivider, { backgroundColor: colors.border }]} />
        {/* Relation filter */}
        {(["all", ...GENERATION_ORDER] as const).map(r => (
          <Pressable key={r} onPress={() => setFilterRelation(r as "all" | Relation)}
            style={[styles.filterPill, {
              borderColor: filterRelation === r ? colors.primary : colors.border,
              backgroundColor: filterRelation === r ? colors.primary + "1A" : "transparent",
            }]}
          >
            <Text style={[styles.filterPillText, { color: filterRelation === r ? colors.primary : colors.mutedForeground }]}>
              {r === "all" ? "Any relation" : RELATION_LABELS[r as Relation]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : viewMode === "list" ? (
        <FlatList
          data={filtered}
          keyExtractor={m => m.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: botPad + 20 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="git-branch" size={40} color={colors.mutedForeground + "40"} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your lineage begins here</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Tap + to add your first family member.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <MemberCard
              member={item}
              onPress={() => setDetailMember(item)}
              onEdit={() => { setEditingMember(item); setFormOpen(true); }}
              onDelete={() => confirmDelete(item)}
            />
          )}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: botPad + 20 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        >
          {treeGroups.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="git-branch" size={40} color={colors.mutedForeground + "40"} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your lineage begins here</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Tap + to add your first family member.</Text>
            </View>
          ) : treeGroups.map((group, gIdx) => (
            <View key={group.gen} style={{ marginTop: gIdx === 0 ? 12 : 0 }}>
              {gIdx > 0 && (
                <View style={[styles.connector, { backgroundColor: colors.border + "80" }]} />
              )}
              <View style={styles.genHeader}>
                <View style={[styles.genLine, { backgroundColor: colors.border + "60" }]} />
                <View style={[styles.genLabelBox, { borderColor: colors.border + "80", backgroundColor: colors.card + "CC" }]}>
                  <Text style={[styles.genLabel, { color: colors.mutedForeground }]}>{group.label}</Text>
                </View>
                <View style={[styles.genLine, { backgroundColor: colors.border + "60" }]} />
              </View>
              <View style={styles.genRow}>
                {group.members.map(member => (
                  <Pressable
                    key={member.id}
                    onPress={() => setDetailMember(member)}
                    style={[styles.treeCard, {
                      backgroundColor: member.deathDate ? colors.primary + "0D" : colors.card,
                      borderColor: member.deathDate ? colors.primary + "30" : colors.border,
                      width: group.members.length === 1 ? "60%" : group.members.length === 2 ? "47%" : "44%",
                    }]}
                  >
                    <View style={[styles.treeAvatar, {
                      backgroundColor: member.deathDate ? colors.primary + "1A" : colors.muted + "40",
                      borderColor: member.deathDate ? colors.primary + "50" : colors.border,
                    }]}>
                      {member.photoUrl
                        ? <Image source={{ uri: photoSrc(member.photoUrl) }} style={styles.treeAvatarImg} />
                        : <Text style={[styles.treeAvatarText, { color: member.deathDate ? colors.primary : colors.mutedForeground }]}>{getInitials(member.name)}</Text>
                      }
                    </View>
                    <Text style={[styles.treeName, { color: colors.foreground }]} numberOfLines={2}>{member.name}</Text>
                    {member.birthDate ? <Text style={[styles.treeDates, { color: colors.mutedForeground }]}>b. {member.birthDate.slice(0, 4)}</Text> : null}
                    {member.deathDate && <Text style={[styles.inMemory, { color: colors.primary + "99", fontSize: 9 }]}>In memory</Text>}
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <MemberFormModal
        visible={formOpen}
        member={editingMember}
        onClose={() => { setFormOpen(false); setEditingMember(null); }}
        onSave={handleSave}
        isSaving={isSaving}
      />
      <MemberDetailModal
        member={detailMember}
        visible={!!detailMember}
        onClose={() => setDetailMember(null)}
        onEdit={() => { setEditingMember(detailMember); setDetailMember(null); setFormOpen(true); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { padding: 4 },
  title: { fontFamily: fonts.serifBold, fontSize: 24 },
  sub: { fontFamily: fonts.sub, fontSize: 12, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  viewToggleBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  searchRow: { flexDirection: "row" },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20 },
  emptySub: { fontFamily: fonts.sub, fontSize: 14, textAlign: "center" },

  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  cardRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 },
  avatarImg: { width: 46, height: 46, borderRadius: 23 },
  avatarText: { fontFamily: fonts.serif, fontSize: 16 },
  cardNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  cardName: { fontFamily: fonts.serif, fontSize: 17, flexShrink: 1 },
  relBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  relText: { fontFamily: fonts.sub, fontSize: 11 },
  relBadgeText: { fontFamily: fonts.sub, fontSize: 12 },
  inMemory: { fontFamily: fonts.subSemibold, fontStyle: "italic", fontSize: 11, marginTop: 1 },
  affiliation: { fontFamily: fonts.sub, fontSize: 12, marginTop: 2 },
  dates: { fontFamily: fonts.sub, fontSize: 11, marginTop: 2 },
  cardNotes: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth },
  cardActions: { alignItems: "center", gap: 2 },

  treeCard: { borderWidth: 1, borderRadius: 14, padding: 12, alignItems: "center", marginHorizontal: 4 },
  treeAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 8 },
  treeAvatarImg: { width: 52, height: 52 },
  treeAvatarText: { fontFamily: fonts.serif, fontSize: 18 },
  treeName: { fontFamily: fonts.serif, fontSize: 13, textAlign: "center", lineHeight: 17 },
  treeDates: { fontFamily: fonts.sub, fontSize: 11, marginTop: 2 },

  genRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 12, marginBottom: 4, gap: 8 },
  genHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20 },
  genLine: { flex: 1, height: 1 },
  genLabelBox: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 4 },
  genLabel: { fontFamily: fonts.sub, fontSize: 11, letterSpacing: 0.8 },
  connector: { width: 2, height: 16, alignSelf: "center", borderRadius: 1 },

  overlay: { flex: 1 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, paddingHorizontal: 24, paddingTop: 24, maxHeight: "90%", minHeight: "60%" },
  sheetTitle: { fontFamily: fonts.serif, fontSize: 22, marginBottom: 16 },
  fieldLabel: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontFamily: fonts.body, fontSize: 14, marginBottom: 12 },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  selectBtn: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  selectText: { fontFamily: fonts.body, fontSize: 14 },
  relPicker: { borderWidth: 1, borderRadius: 12, marginBottom: 12, overflow: "hidden" },
  relOption: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  relOptionText: { fontFamily: fonts.body, fontSize: 14 },
  saveBtn: { borderRadius: 999, paddingVertical: 14, alignItems: "center", marginBottom: 12 },
  saveBtnText: { fontFamily: fonts.subSemibold, fontSize: 15 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  pillText: { fontFamily: fonts.sub, fontSize: 11 },
  photoRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  photoPreview: { width: 60, height: 60, borderRadius: 30 },
  photoButtons: { flexDirection: "row", gap: 8, flex: 1 },
  photoBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderRadius: 12, paddingVertical: 10 },
  photoBtnText: { fontFamily: fonts.sub, fontSize: 12 },

  detailSheet: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, maxHeight: "92%", minHeight: "50%" },
  detailHeader: { flexDirection: "row", alignItems: "center", gap: 14, padding: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  detailAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 },
  detailAvatarImg: { width: 56, height: 56 },
  detailAvatarText: { fontFamily: fonts.serif, fontSize: 20 },
  detailName: { fontFamily: fonts.serif, fontSize: 20 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 20, marginTop: 16 },
  metaCell: { borderWidth: 1, borderRadius: 12, padding: 12, flex: 1, minWidth: "45%" },
  metaCellFull: { minWidth: "90%" },
  metaLabel: { fontFamily: fonts.sub, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  metaValue: { fontFamily: fonts.serif, fontSize: 15 },
  notesBox: { borderWidth: 1, borderRadius: 14, padding: 14, margin: 20, gap: 8 },
  notesText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  momentsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  addMomentBox: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12, gap: 0 },
  emptyMoments: { alignItems: "center", paddingVertical: 24 },
  momentCard: { borderWidth: 1, borderRadius: 12, padding: 12 },
  momentRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  momentTitle: { fontFamily: fonts.subSemibold, fontSize: 14 },
  momentMeta: { fontFamily: fonts.sub, fontSize: 11, marginTop: 2 },
  momentDesc: { fontFamily: fonts.body, fontSize: 13, marginTop: 4, lineHeight: 18 },
  filterRow: { paddingHorizontal: 20, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  filterPillText: { fontFamily: fonts.sub, fontSize: 11 },
  filterDivider: { width: 1, height: 18, marginHorizontal: 4 },
});
