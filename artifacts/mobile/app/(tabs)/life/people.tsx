import { Feather } from "@expo/vector-icons";
import {
  useGetPeople,
  useCreatePerson,
  useUpdatePerson,
  useDeletePerson,
  useGetRelationshipMoments,
  useCreateRelationshipMoment,
  getGetPeopleQueryKey,
  getGetRelationshipMomentsQueryKey,
} from "@workspace/api-client-react";
import type { Person, RelationshipMoment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

const RELATIONSHIPS = ["family", "friend", "partner", "mentor", "colleague", "other"] as const;
type Relationship = typeof RELATIONSHIPS[number];

const MOMENT_TYPES = ["memory", "conversation", "promise", "milestone", "birthday", "gratitude", "other"] as const;
type MomentType = typeof MOMENT_TYPES[number];

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function RelationshipBadge({ rel }: { rel: string }) {
  const colors = useColors();
  const color = rel === "family" ? colors.primary : rel === "friend" ? colors.secondary : rel === "partner" || rel === "mentor" ? colors.accent : colors.mutedForeground;
  return (
    <View style={[styles.badge, { backgroundColor: color + "1A", borderColor: color + "40" }]}>
      <Text style={[styles.badgeText, { color }]}>{rel}</Text>
    </View>
  );
}

function PersonCard({ person, onPress }: { person: Person; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.personCard,
        { backgroundColor: colors.card, borderColor: person.lostDate ? colors.primary + "30" : colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: person.lostDate ? colors.primary + "1A" : colors.muted + "40", borderColor: person.lostDate ? colors.primary + "40" : colors.border }]}>
        <Text style={[styles.avatarText, { color: person.lostDate ? colors.primary : colors.foreground }]}>{getInitials(person.name)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.personName, { color: colors.foreground }]}>{person.name}</Text>
        {person.lostDate ? <Text style={[styles.personSub, { color: colors.primary, fontFamily: fonts.serifItalic }]}>In memory</Text> : null}
        {person.bio ? <Text style={[styles.personBio, { color: colors.mutedForeground }]} numberOfLines={2}>{person.bio}</Text> : null}
        {person.relationship ? <RelationshipBadge rel={person.relationship} /> : null}
      </View>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground + "60"} />
    </Pressable>
  );
}

function PersonDetailModal({ person, onClose, onDeleted, onEdit }: { person: Person; onClose: () => void; onDeleted: () => void; onEdit: () => void }) {
  const colors = useColors();
  const qc = useQueryClient();
  const { data: moments = [], isLoading } = useGetRelationshipMoments(person.id);
  const createMoment = useCreateRelationshipMoment();
  const deletePerson = useDeletePerson();
  const [showForm, setShowForm] = useState(false);
  const [mDate, setMDate] = useState(new Date().toISOString().split("T")[0]);
  const [mType, setMType] = useState<MomentType>("memory");
  const [mTitle, setMTitle] = useState("");
  const [mDesc, setMDesc] = useState("");

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetRelationshipMomentsQueryKey(person.id) });
  }

  function confirmDelete() {
    Alert.alert("Delete person?", `Remove ${person.name} and all their moments? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await deletePerson.mutateAsync({ id: person.id });
            qc.invalidateQueries({ queryKey: getGetPeopleQueryKey() });
            onDeleted();
          } catch { Alert.alert("Couldn't delete", "Please try again."); }
        },
      },
    ]);
  }

  async function handleAddMoment() {
    if (!mTitle.trim()) return;
    try {
      await createMoment.mutateAsync({ personId: person.id, data: { date: mDate, type: mType, title: mTitle.trim(), description: mDesc.trim() || undefined } as any });
      invalidate();
      setShowForm(false);
      setMTitle(""); setMDesc("");
    } catch {
      Alert.alert("Couldn't save", "Please try again.");
    }
  }

  const sorted = [...moments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Modal visible animationType="slide">
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={[styles.modalHeader, { backgroundColor: person.lostDate ? colors.primary + "10" : colors.background, borderBottomColor: colors.border }]}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{person.name}</Text>
            <Pressable onPress={confirmDelete} hitSlop={8} disabled={deletePerson.isPending}>
              <Feather name="trash-2" size={18} color="#f87171" />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 16 }}>
            {/* Avatar + info */}
            <View style={{ alignItems: "center", gap: 10 }}>
              <View style={[styles.bigAvatar, { backgroundColor: person.lostDate ? colors.primary + "1A" : colors.muted + "40", borderColor: person.lostDate ? colors.primary + "50" : colors.border }]}>
                <Text style={[styles.bigAvatarText, { color: person.lostDate ? colors.primary : colors.foreground }]}>{getInitials(person.name)}</Text>
              </View>
              {person.relationship ? <RelationshipBadge rel={person.relationship} /> : null}
              {person.birthday ? (
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  🎂 {new Date(person.birthday + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </Text>
              ) : null}
            </View>

            {person.bio ? (
              <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>WHO THEY ARE</Text>
                <Text style={[styles.infoText, { color: colors.foreground }]}>{person.bio}</Text>
              </View>
            ) : null}

            {/* Edit person button */}
            <Pressable
              onPress={onEdit}
              style={({ pressed }) => [styles.editPersonBtn, { borderColor: colors.border, backgroundColor: pressed ? colors.muted + "40" : colors.card }]}
            >
              <Feather name="edit-2" size={14} color={colors.mutedForeground} />
              <Text style={[styles.editPersonText, { color: colors.mutedForeground }]}>Edit Person</Text>
            </Pressable>

            {/* Timeline header */}
            <View style={styles.timelineHeader}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>RELATIONSHIP TIMELINE</Text>
              <Pressable onPress={() => setShowForm(v => !v)}>
                <Text style={[styles.addLink, { color: colors.primary }]}>+ Add moment</Text>
              </Pressable>
            </View>

            {/* Add moment form */}
            {showForm ? (
              <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.primary + "30" }]}>
                <TextInput
                  value={mTitle}
                  onChangeText={setMTitle}
                  placeholder="What happened?"
                  placeholderTextColor={colors.mutedForeground + "99"}
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  autoFocus
                />
                <TextInput
                  value={mDesc}
                  onChangeText={setMDesc}
                  placeholder="Details (optional)"
                  placeholderTextColor={colors.mutedForeground + "99"}
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                />
                <View style={styles.pills}>
                  {MOMENT_TYPES.map(t => (
                    <Pressable key={t} onPress={() => setMType(t)}
                      style={[styles.pill, { borderColor: mType === t ? colors.primary : colors.border, backgroundColor: mType === t ? colors.primary + "1A" : "transparent" }]}
                    >
                      <Text style={[styles.pillText, { color: mType === t ? colors.primary : colors.mutedForeground }]}>{t}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable onPress={() => setShowForm(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                    <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleAddMoment}
                    disabled={!mTitle.trim() || createMoment.isPending}
                    style={[styles.saveBtn, { backgroundColor: colors.primary, flex: 1, opacity: !mTitle.trim() || createMoment.isPending ? 0.5 : 1 }]}
                  >
                    <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
                      {createMoment.isPending ? "Saving…" : "Add to Timeline"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {/* Moments list */}
            {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : sorted.length === 0 ? (
              <View style={styles.emptyMoments}>
                <Feather name="clock" size={28} color={colors.mutedForeground + "50"} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No moments yet. Add conversations, promises, memories.</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {sorted.map(m => (
                  <View key={m.id} style={[styles.momentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.momentDot, { backgroundColor: colors.primary }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.momentTitle, { color: colors.foreground }]}>{m.title}</Text>
                      <Text style={[styles.momentMeta, { color: colors.mutedForeground }]}>
                        {m.type} · {new Date(m.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </Text>
                      {m.description ? <Text style={[styles.momentDesc, { color: colors.mutedForeground }]}>{m.description}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PersonFormModal({ visible, person, onClose, onSave, isSaving }: {
  visible: boolean;
  person: Person | null;
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
}) {
  const colors = useColors();
  const [name, setName] = useState(person?.name ?? "");
  const [relationship, setRelationship] = useState<Relationship>((person?.relationship as Relationship) ?? "friend");
  const [bio, setBio] = useState(person?.bio ?? "");
  const [note, setNote] = useState(person?.note ?? "");

  React.useEffect(() => {
    if (visible) {
      setName(person?.name ?? "");
      setRelationship((person?.relationship as Relationship) ?? "friend");
      setBio(person?.bio ?? "");
      setNote(person?.note ?? "");
    }
  }, [visible, person]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{person ? "Edit Person" : "Add to My Circle"}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor={colors.mutedForeground + "99"}
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            autoFocus
          />
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Relationship</Text>
          <View style={styles.pills}>
            {RELATIONSHIPS.map(r => (
              <Pressable key={r} onPress={() => setRelationship(r)}
                style={[styles.pill, { borderColor: relationship === r ? colors.primary : colors.border, backgroundColor: relationship === r ? colors.primary + "1A" : "transparent" }]}
              >
                <Text style={[styles.pillText, { color: relationship === r ? colors.primary : colors.mutedForeground }]}>{r}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Who are they? (optional)"
            placeholderTextColor={colors.mutedForeground + "99"}
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
          />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Notes & memories (optional)"
            placeholderTextColor={colors.mutedForeground + "99"}
            style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <Pressable
            onPress={() => onSave({ name: name.trim(), relationship, bio: bio.trim() || undefined, note: note.trim() || undefined })}
            disabled={!name.trim() || isSaving}
            style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: !name.trim() || isSaving ? 0.5 : pressed ? 0.85 : 1 }]}
          >
            {isSaving ? <ActivityIndicator color="#000" size="small" /> : (
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>{person ? "Save Changes" : "Add to Circle"}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function PeopleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data: people, isLoading, refetch, isRefetching } = useGetPeople();
  const createPerson = useCreatePerson();
  const updatePerson = useUpdatePerson();
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [filter, setFilter] = useState<string>("all");

  function invalidate() { qc.invalidateQueries({ queryKey: getGetPeopleQueryKey() }); }

  async function handleSave(data: any) {
    try {
      if (editing) {
        await updatePerson.mutateAsync({ id: editing.id, data });
      } else {
        await createPerson.mutateAsync({ data });
      }
      invalidate();
      setFormOpen(false);
      setEditing(null);
    } catch {
      Alert.alert("Couldn't save", "Please try again.");
    }
  }

  const filtered = (people ?? []).filter(p => filter === "all" || p.relationship === filter);
  const topPad = insets.top + WEB_TOP_INSET + 12;
  const botPad = insets.bottom + WEB_BOTTOM_INSET + 24;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={filtered}
        keyExtractor={p => String(p.id)}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: botPad, paddingHorizontal: 20, gap: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 4 }}>
            <View style={styles.pageHeader}>
              <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
                <Feather name="arrow-left" size={22} color={colors.foreground} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pageTitle, { color: colors.foreground }]}>My Circle</Text>
                <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>{(people ?? []).length} people in your life</Text>
              </View>
              <Pressable onPress={() => { setEditing(null); setFormOpen(true); }} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                <Feather name="plus" size={20} color={colors.primaryForeground} />
              </Pressable>
            </View>
            {/* Filter pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {["all", ...RELATIONSHIPS].map(f => (
                <Pressable key={f} onPress={() => setFilter(f)}
                  style={[styles.pill, { borderColor: filter === f ? colors.primary : colors.border, backgroundColor: filter === f ? colors.primary + "1A" : "transparent" }]}
                >
                  <Text style={[styles.pillText, { color: filter === f ? colors.primary : colors.mutedForeground }]}>{f}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          isLoading ? <View style={styles.empty}><ActivityIndicator color={colors.primary} /></View> : (
            <View style={styles.empty}>
              <Feather name="users" size={40} color={colors.mutedForeground + "50"} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No one here yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Add the people who shaped your story.</Text>
            </View>
          )
        }
        renderItem={({ item }) => <PersonCard person={item} onPress={() => setSelectedPerson(item)} />}
      />

      {selectedPerson ? (
        <PersonDetailModal
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
          onDeleted={() => setSelectedPerson(null)}
          onEdit={() => {
            setEditing(selectedPerson);
            setSelectedPerson(null);
            setFormOpen(true);
          }}
        />
      ) : null}
      <PersonFormModal
        visible={formOpen}
        person={editing}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        isSaving={createPerson.isPending || updatePerson.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { padding: 4 },
  pageTitle: { fontFamily: fonts.serifBold, fontSize: 28 },
  pageSub: { fontFamily: fonts.sub, fontSize: 13, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  personCard: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, borderWidth: 1, padding: 14 },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.serif, fontSize: 18 },
  personName: { fontFamily: fonts.serif, fontSize: 17 },
  personSub: { fontSize: 12, marginTop: 2 },
  personBio: { fontFamily: fonts.sub, fontSize: 12, lineHeight: 16, marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, borderWidth: 1, alignSelf: "flex-start", marginTop: 6 },
  badgeText: { fontFamily: fonts.sub, fontSize: 11, textTransform: "capitalize" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20 },
  emptySub: { fontFamily: fonts.sub, fontSize: 14, textAlign: "center" },
  overlay: { flex: 1 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 24, paddingBottom: 40, gap: 12 },
  sheetTitle: { fontFamily: fonts.serif, fontSize: 22, marginBottom: 4 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontFamily: fonts.body, fontSize: 14 },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  fieldLabel: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  pillText: { fontFamily: fonts.sub, fontSize: 12, textTransform: "capitalize" },
  saveBtn: { borderRadius: 999, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { fontFamily: fonts.subSemibold, fontSize: 15 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, paddingTop: 60 },
  modalTitle: { fontFamily: fonts.serif, fontSize: 20 },
  bigAvatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  bigAvatarText: { fontFamily: fonts.serifBold, fontSize: 26 },
  metaText: { fontFamily: fonts.sub, fontSize: 13 },
  infoCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  infoLabel: { fontFamily: fonts.subSemibold, fontSize: 10, letterSpacing: 1.5, marginBottom: 8, textTransform: "uppercase" },
  infoText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  editPersonBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, borderWidth: 1, paddingVertical: 10 },
  editPersonText: { fontFamily: fonts.sub, fontSize: 13 },
  timelineHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionLabel: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  addLink: { fontFamily: fonts.subSemibold, fontSize: 13 },
  formCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  emptyMoments: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyText: { fontFamily: fonts.sub, fontSize: 13, textAlign: "center" },
  momentCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 12, borderWidth: 1, padding: 12 },
  momentDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  momentTitle: { fontFamily: fonts.bodyMedium, fontSize: 14 },
  momentMeta: { fontFamily: fonts.sub, fontSize: 11, marginTop: 2, textTransform: "capitalize" },
  momentDesc: { fontFamily: fonts.body, fontSize: 12, marginTop: 4, lineHeight: 18 },
  cancelBtn: { borderRadius: 999, paddingVertical: 12, paddingHorizontal: 20, borderWidth: 1, alignItems: "center" },
  cancelBtnText: { fontFamily: fonts.sub, fontSize: 14 },
});
