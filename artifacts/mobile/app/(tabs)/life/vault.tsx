import { Feather } from "@expo/vector-icons";
import {
  useGetVaultItems,
  useCreateVaultItem,
  useUpdateVaultItem,
  useDeleteVaultItem,
  getGetVaultItemsQueryKey,
} from "@workspace/api-client-react";
import type { VaultItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
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
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

type VaultCategory = "document" | "photo" | "journal" | "voice_note" | "important_info";

const CATEGORY_ICONS: Record<VaultCategory, keyof typeof Feather.glyphMap> = {
  document: "file-text",
  photo: "image",
  journal: "book",
  voice_note: "mic",
  important_info: "info",
};

const CATEGORY_LABELS: Record<VaultCategory, string> = {
  document: "Document",
  photo: "Photo",
  journal: "Journal",
  voice_note: "Voice Note",
  important_info: "Important Info",
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as VaultCategory[];

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

function VaultItemCard({ item, onEdit, onDelete }: { item: VaultItem; onEdit: () => void; onDelete: () => void }) {
  const colors = useColors();
  const icon = CATEGORY_ICONS[(item.category as VaultCategory)] ?? "file";
  return (
    <Pressable
      onPress={onEdit}
      style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[styles.itemIcon, { backgroundColor: colors.primary + "1A" }]}>
        <Feather name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.itemCat, { color: colors.mutedForeground }]}>
          {CATEGORY_LABELS[(item.category as VaultCategory)] ?? item.category}
        </Text>
        {item.content ? (
          <Text style={[styles.itemContent, { color: colors.mutedForeground }]} numberOfLines={2}>{item.content}</Text>
        ) : null}
      </View>
      <Pressable onPress={onDelete} hitSlop={8} style={{ padding: 4 }}>
        <Feather name="trash-2" size={16} color={colors.mutedForeground + "80"} />
      </Pressable>
    </Pressable>
  );
}

function VaultFormModal({ visible, item, onClose, onSave, isSaving }: {
  visible: boolean;
  item: VaultItem | null;
  onClose: () => void;
  onSave: (data: { name: string; category: VaultCategory; content: string }) => void;
  isSaving: boolean;
}) {
  const colors = useColors();
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState<VaultCategory>((item?.category as VaultCategory) ?? "important_info");
  const [content, setContent] = useState(item?.content ?? "");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      setName(item?.name ?? "");
      setCategory((item?.category as VaultCategory) ?? "important_info");
      setContent(item?.content ?? "");
      setPhotoUri(null);
    }
  }, [visible, item]);

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Allow photo library access to attach a photo."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: true });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      if (!content.trim()) setContent(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Allow camera access to take a photo."); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: true });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      if (!content.trim()) setContent(result.assets[0].uri);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{item ? "Edit Item" : "Store Item"}</Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name (e.g. Passport, WiFi password…)"
            placeholderTextColor={colors.mutedForeground + "99"}
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            autoFocus
          />

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Category</Text>
          <View style={styles.pills}>
            {CATEGORIES.map(c => (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[
                  styles.pill,
                  { borderColor: category === c ? colors.primary : colors.border,
                    backgroundColor: category === c ? colors.primary + "1A" : "transparent" },
                ]}
              >
                <Text style={[styles.pillText, { color: category === c ? colors.primary : colors.mutedForeground }]}>
                  {CATEGORY_LABELS[c]}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Photo upload when category is "photo" */}
          {category === "photo" ? (
            <View style={{ gap: 8 }}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
              ) : null}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable onPress={pickPhoto}
                  style={[styles.photoBtn, { borderColor: colors.border, backgroundColor: colors.muted + "30", flex: 1 }]}>
                  <Feather name="image" size={15} color={colors.mutedForeground} />
                  <Text style={[styles.photoBtnText, { color: colors.mutedForeground }]}>Library</Text>
                </Pressable>
                <Pressable onPress={takePhoto}
                  style={[styles.photoBtn, { borderColor: colors.border, backgroundColor: colors.muted + "30", flex: 1 }]}>
                  <Feather name="camera" size={15} color={colors.mutedForeground} />
                  <Text style={[styles.photoBtnText, { color: colors.mutedForeground }]}>Camera</Text>
                </Pressable>
              </View>
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="Caption or description (optional)…"
                placeholderTextColor={colors.mutedForeground + "99"}
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              />
            </View>
          ) : (
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Notes / content…"
              placeholderTextColor={colors.mutedForeground + "99"}
              style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          )}

          <Pressable
            onPress={() => onSave({ name: name.trim(), category, content: content.trim() })}
            disabled={!name.trim() || isSaving}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: colors.primary, opacity: !name.trim() || isSaving ? 0.5 : pressed ? 0.85 : 1 },
            ]}
          >
            {isSaving ? <ActivityIndicator color="#000" size="small" /> : (
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
                {item ? "Save Changes" : "Store Securely"}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function VaultScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data: items, isLoading, refetch, isRefetching } = useGetVaultItems();
  const createItem = useCreateVaultItem();
  const updateItem = useUpdateVaultItem();
  const deleteItem = useDeleteVaultItem();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VaultItem | null>(null);

  function invalidate() { qc.invalidateQueries({ queryKey: getGetVaultItemsQueryKey() }); }

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(item: VaultItem) { setEditing(item); setModalOpen(true); }

  function confirmDelete(item: VaultItem) {
    Alert.alert("Delete item?", `"${item.name}" will be removed permanently.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try { await deleteItem.mutateAsync({ id: item.id }); invalidate(); }
          catch { Alert.alert("Couldn't delete", "Please try again."); }
        },
      },
    ]);
  }

  async function handleSave(data: { name: string; category: VaultCategory; content: string }) {
    try {
      if (editing) {
        await updateItem.mutateAsync({ id: editing.id, data });
      } else {
        await createItem.mutateAsync({ data });
      }
      invalidate();
      setModalOpen(false);
    } catch {
      Alert.alert("Couldn't save", "Please try again.");
    }
  }

  const topPad = insets.top + WEB_TOP_INSET + 12;
  const botPad = insets.bottom + WEB_BOTTOM_INSET + 24;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={items ?? []}
        keyExtractor={i => String(i.id)}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: botPad, paddingHorizontal: 20, gap: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
              <Feather name="arrow-left" size={22} color={colors.foreground} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pageTitle, { color: colors.foreground }]}>Secure Vault</Text>
              <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>Your private sanctuary.</Text>
            </View>
            <Pressable onPress={openCreate} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
              <Feather name="plus" size={20} color={colors.primaryForeground} />
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}><ActivityIndicator color={colors.primary} /></View>
          ) : (
            <View style={styles.empty}>
              <Feather name="shield" size={40} color={colors.mutedForeground + "50"} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Vault is empty</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Store your most important documents here.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <VaultItemCard item={item} onEdit={() => openEdit(item)} onDelete={() => confirmDelete(item)} />
        )}
      />
      <VaultFormModal
        visible={modalOpen}
        item={editing}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        isSaving={createItem.isPending || updateItem.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  backBtn: { padding: 4 },
  pageTitle: { fontFamily: fonts.serifBold, fontSize: 28 },
  pageSub: { fontFamily: fonts.sub, fontSize: 13, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  itemCard: { flexDirection: "row", alignItems: "flex-start", gap: 14, borderRadius: 14, borderWidth: 1, padding: 14 },
  itemIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  itemName: { fontFamily: fonts.serif, fontSize: 16 },
  itemCat: { fontFamily: fonts.sub, fontSize: 11, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  itemContent: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, marginTop: 4 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20 },
  emptySub: { fontFamily: fonts.sub, fontSize: 14, textAlign: "center" },
  overlay: { flex: 1 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 24, paddingBottom: 40, gap: 12 },
  sheetTitle: { fontFamily: fonts.serif, fontSize: 22, marginBottom: 4 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontFamily: fonts.body, fontSize: 14 },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  fieldLabel: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  pillText: { fontFamily: fonts.sub, fontSize: 12 },
  saveBtn: { borderRadius: 999, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveBtnText: { fontFamily: fonts.subSemibold, fontSize: 15 },
  photoPreview: { width: "100%", height: 160, borderRadius: 12, marginBottom: 4 },
  photoBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, borderWidth: 1, paddingVertical: 10 },
  photoBtnText: { fontFamily: fonts.sub, fontSize: 13 },
});
