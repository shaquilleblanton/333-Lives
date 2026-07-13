import { Feather } from "@expo/vector-icons";
import {
  getGetCollectionItemsQueryKey,
  getGetMemoryCollectionsQueryKey,
  requestUploadUrl,
  useCreateCollectionItem,
  useCreateMemoryCollection,
  useDeleteCollectionItem,
  useDeleteMemoryCollection,
  useGetCollectionItems,
  useGetMemoryCollections,
  useUpdateCollectionItem,
  useUpdateMemoryCollection,
  type CollectionItem,
  type MemoryCollection,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

function storageUrl(objectPath: string) {
  const base = process.env.EXPO_PUBLIC_API_URL ?? "";
  return `${base}/api/storage${objectPath}`;
}

// ─── Album grid ──────────────────────────────────────────────────────────────

export default function MemoriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: collections, isLoading, refetch } = useGetMemoryCollections();
  const deleteCollection = useDeleteMemoryCollection();

  const [activeCollection, setActiveCollection] = useState<MemoryCollection | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MemoryCollection | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDelete = (id: number) => {
    Alert.alert("Delete Album", "This will delete the album and all its photos. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteCollection.mutate({ id }, {
            onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetMemoryCollectionsQueryKey() }),
          }),
      },
    ]);
  };

  if (activeCollection) {
    return (
      <AlbumView
        collection={activeCollection}
        onBack={() => setActiveCollection(null)}
      />
    );
  }

  const s = makeStyles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top + WEB_TOP_INSET }]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Memory Collections</Text>
          <Text style={s.subtitle}>Your life in albums</Text>
        </View>
        <Pressable style={s.addBtn} onPress={() => { setEditTarget(null); setCreateOpen(true); }}>
          <Feather name="plus" size={20} color={colors.primaryForeground} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={collections ?? []}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + WEB_BOTTOM_INSET + 16, gap: 12 }}
          columnWrapperStyle={{ gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="image" size={48} color={colors.mutedForeground} style={{ opacity: 0.3, marginBottom: 12 }} />
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>No albums yet</Text>
              <Text style={[s.emptyText, { color: colors.mutedForeground }]}>Tap + to create your first album</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setActiveCollection(item)}
              onLongPress={() =>
                Alert.alert(item.name, "What would you like to do?", [
                  { text: "Edit", onPress: () => { setEditTarget(item); setCreateOpen(true); } },
                  { text: "Delete", style: "destructive", onPress: () => handleDelete(item.id) },
                  { text: "Cancel", style: "cancel" },
                ])
              }
            >
              {item.coverUrl ? (
                <Image source={{ uri: storageUrl(item.coverUrl) }} style={s.cardCover} />
              ) : (
                <View style={[s.cardCoverPlaceholder, { backgroundColor: colors.muted }]}>
                  <Feather name="image" size={28} color={colors.mutedForeground} style={{ opacity: 0.4 }} />
                </View>
              )}
              {item.isInMemory && (
                <View style={[s.inMemoryBadge, { backgroundColor: colors.primary }]}>
                  <Feather name="heart" size={10} color={colors.primaryForeground} />
                  <Text style={[s.inMemoryText, { color: colors.primaryForeground }]}>In Memory</Text>
                </View>
              )}
              <View style={s.cardBody}>
                <Text style={[s.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                {item.description ? (
                  <Text style={[s.cardDesc, { color: colors.mutedForeground }]} numberOfLines={1}>{item.description}</Text>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      )}

      <CollectionFormModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        editTarget={editTarget}
      />
    </View>
  );
}

// ─── Album view ───────────────────────────────────────────────────────────────

function AlbumView({ collection, onBack }: { collection: MemoryCollection; onBack: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: items, isLoading, refetch } = useGetCollectionItems(collection.id);
  const createItem = useCreateCollectionItem();
  const deleteItem = useDeleteCollectionItem();
  const updateItem = useUpdateCollectionItem();

  const [uploading, setUploading] = useState(false);
  const [lightboxItem, setLightboxItem] = useState<CollectionItem | null>(null);
  const [captionEdit, setCaptionEdit] = useState<{ id: number; value: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const sorted = [...(items ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetCollectionItemsQueryKey(collection.id) });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleAddPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library to add photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await uploadAsset(asset.uri, "photo");
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow camera access to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    await uploadAsset(result.assets[0].uri, "photo");
  };

  const uploadAsset = async (uri: string, type: "photo" | "voice") => {
    setUploading(true);
    try {
      const name = uri.split("/").pop() ?? "photo.jpg";
      const info = await FileSystem.getInfoAsync(uri);
      const size = info.exists && "size" in info ? (info.size ?? 0) : 0;
      const ext = name.split(".").pop()?.toLowerCase();
      const contentType = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";

      const uploadResp = await requestUploadUrl({ name, size, contentType });
      await fetch(uploadResp.uploadURL, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: await (await fetch(uri)).blob(),
      });
      createItem.mutate(
        { id: collection.id, data: { mediaUrl: uploadResp.objectPath, type, sortOrder: sorted.length } },
        {
          onSuccess: invalidate,
          onError: () => Alert.alert("Error", "Couldn't save photo. Please try again."),
        }
      );
    } catch {
      Alert.alert("Upload failed", "Couldn't upload that photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteItem = (id: number) => {
    Alert.alert("Remove Photo", "Remove this photo from the album?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => deleteItem.mutate({ id: collection.id, itemId: id }, { onSuccess: invalidate }),
      },
    ]);
  };

  const handleSaveCaption = () => {
    if (!captionEdit) return;
    updateItem.mutate(
      { id: collection.id, itemId: captionEdit.id, data: { caption: captionEdit.value || null } },
      { onSuccess: () => { invalidate(); setCaptionEdit(null); } }
    );
  };

  const s = makeStyles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top + WEB_TOP_INSET }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={[s.title, { fontSize: 20 }]} numberOfLines={1}>{collection.name}</Text>
          {collection.isInMemory && (
            <Text style={{ color: colors.primary, fontSize: 12, fontFamily: fonts.subheading }}>♥ In Memory</Text>
          )}
        </View>
        <Pressable
          onPress={() => Alert.alert("Add Photo", undefined, [
            { text: "From Library", onPress: handleAddPhoto },
            { text: "Take Photo", onPress: handleTakePhoto },
            { text: "Cancel", style: "cancel" },
          ])}
          style={[s.addBtn, uploading && { opacity: 0.5 }]}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Feather name="plus" size={20} color={colors.primaryForeground} />
          )}
        </Pressable>
      </View>

      {isLoading ? (
        <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={item => String(item.id)}
          numColumns={3}
          contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + WEB_BOTTOM_INSET + 12, gap: 3 }}
          columnWrapperStyle={{ gap: 3 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="camera" size={48} color={colors.mutedForeground} style={{ opacity: 0.3, marginBottom: 12 }} />
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>No photos yet</Text>
              <Text style={[s.emptyText, { color: colors.mutedForeground }]}>Tap + to add your first memory</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[s.photoCell, { backgroundColor: colors.muted }]}
              onPress={() => setLightboxItem(item)}
              onLongPress={() =>
                Alert.alert(item.caption ?? "Photo", undefined, [
                  { text: "Edit Caption", onPress: () => setCaptionEdit({ id: item.id, value: item.caption ?? "" }) },
                  { text: "Remove", style: "destructive", onPress: () => handleDeleteItem(item.id) },
                  { text: "Cancel", style: "cancel" },
                ])
              }
            >
              {item.type === "photo" ? (
                <Image source={{ uri: storageUrl(item.mediaUrl) }} style={s.photoImg} />
              ) : (
                <View style={[s.voiceCell, { backgroundColor: colors.muted }]}>
                  <Feather name="mic" size={22} color={colors.primary} />
                </View>
              )}
              {item.caption ? (
                <View style={s.captionOverlay}>
                  <Text style={s.captionText} numberOfLines={2}>{item.caption}</Text>
                </View>
              ) : null}
            </Pressable>
          )}
        />
      )}

      {/* Lightbox */}
      <Modal visible={!!lightboxItem} transparent animationType="fade" onRequestClose={() => setLightboxItem(null)}>
        <View style={s.lightboxBg}>
          <Pressable style={s.lightboxClose} onPress={() => setLightboxItem(null)}>
            <Feather name="x" size={24} color="#fff" />
          </Pressable>
          {lightboxItem?.type === "photo" ? (
            <Image
              source={{ uri: storageUrl(lightboxItem.mediaUrl) }}
              style={s.lightboxImg}
              resizeMode="contain"
            />
          ) : (
            <View style={s.lightboxVoice}>
              <Feather name="mic" size={48} color="#fff" />
              <Text style={{ color: "#fff", marginTop: 8, fontFamily: fonts.subheading }}>Voice Note</Text>
            </View>
          )}
          {lightboxItem?.caption ? (
            <Text style={s.lightboxCaption}>{lightboxItem.caption}</Text>
          ) : null}
        </View>
      </Modal>

      {/* Caption edit modal */}
      <Modal visible={!!captionEdit} transparent animationType="slide" onRequestClose={() => setCaptionEdit(null)}>
        <View style={s.captionModalBg}>
          <View style={[s.captionModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.captionModalTitle, { color: colors.foreground }]}>Edit Caption</Text>
            <TextInput
              value={captionEdit?.value ?? ""}
              onChangeText={v => setCaptionEdit(c => c ? { ...c, value: v } : c)}
              placeholder="Add a caption…"
              placeholderTextColor={colors.mutedForeground}
              style={[s.captionInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              multiline
              autoFocus
            />
            <View style={s.captionModalBtns}>
              <Pressable style={[s.captionBtn, { borderColor: colors.border }]} onPress={() => setCaptionEdit(null)}>
                <Text style={{ color: colors.mutedForeground, fontFamily: fonts.subheading }}>Cancel</Text>
              </Pressable>
              <Pressable style={[s.captionBtn, { backgroundColor: colors.primary }]} onPress={handleSaveCaption}>
                <Text style={{ color: colors.primaryForeground, fontFamily: fonts.subheading }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Collection form modal ────────────────────────────────────────────────────

function CollectionFormModal({
  visible,
  onClose,
  editTarget,
}: {
  visible: boolean;
  onClose: () => void;
  editTarget: MemoryCollection | null;
}) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const create = useCreateMemoryCollection();
  const update = useUpdateMemoryCollection();

  const [name, setName] = useState(editTarget?.name ?? "");
  const [description, setDescription] = useState(editTarget?.description ?? "");
  const [isInMemory, setIsInMemory] = useState(editTarget?.isInMemory ?? false);

  React.useEffect(() => {
    if (visible) {
      setName(editTarget?.name ?? "");
      setDescription(editTarget?.description ?? "");
      setIsInMemory(editTarget?.isInMemory ?? false);
    }
  }, [visible, editTarget]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    const data = { name: name.trim(), description: description.trim() || undefined, isInMemory };
    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getGetMemoryCollectionsQueryKey() });
      onClose();
    };
    if (editTarget) {
      update.mutate({ id: editTarget.id, data }, { onSuccess });
    } else {
      create.mutate({ data }, { onSuccess });
    }
  };

  const isPending = create.isPending || update.isPending;
  const s = makeStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.captionModalBg}>
        <View style={[s.captionModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.captionModalTitle, { color: colors.foreground }]}>
            {editTarget ? "Edit Album" : "New Album"}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Album name…"
            placeholderTextColor={colors.mutedForeground}
            style={[s.captionInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Short description (optional)"
            placeholderTextColor={colors.mutedForeground}
            style={[s.captionInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, marginTop: 8 }]}
          />
          <Pressable
            style={[s.inMemoryRow, { borderColor: colors.border }]}
            onPress={() => setIsInMemory(v => !v)}
          >
            <Text style={{ color: colors.foreground, fontFamily: fonts.subheading, flex: 1 }}>
              ♥  Mark as "In Memory"
            </Text>
            <View style={[s.toggle, { backgroundColor: isInMemory ? colors.primary : colors.muted }]}>
              <View style={[s.toggleThumb, { transform: [{ translateX: isInMemory ? 20 : 2 }] }]} />
            </View>
          </Pressable>
          <View style={s.captionModalBtns}>
            <Pressable style={[s.captionBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={{ color: colors.mutedForeground, fontFamily: fonts.subheading }}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[s.captionBtn, { backgroundColor: colors.primary, opacity: !name.trim() || isPending ? 0.5 : 1 }]}
              onPress={handleSubmit}
              disabled={!name.trim() || isPending}
            >
              {isPending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={{ color: colors.primaryForeground, fontFamily: fonts.subheading }}>
                  {editTarget ? "Save" : "Create"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: { fontSize: 26, fontFamily: fonts.serif, color: colors.foreground },
    subtitle: { fontSize: 13, fontFamily: fonts.subheading, color: colors.mutedForeground, marginTop: 2 },
    addBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 20, fontFamily: fonts.serif, marginBottom: 6 },
    emptyText: { fontSize: 14, fontFamily: fonts.subheading, textAlign: "center" },
    card: {
      flex: 1,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
    },
    cardCover: { width: "100%", aspectRatio: 1.4, backgroundColor: colors.muted },
    cardCoverPlaceholder: {
      width: "100%",
      aspectRatio: 1.4,
      alignItems: "center",
      justifyContent: "center",
    },
    inMemoryBadge: {
      position: "absolute",
      top: 6,
      left: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 12,
    },
    inMemoryText: { fontSize: 10, fontFamily: fonts.subheading },
    cardBody: { padding: 10 },
    cardTitle: { fontSize: 15, fontFamily: fonts.serif },
    cardDesc: { fontSize: 12, fontFamily: fonts.subheading, marginTop: 2 },
    photoCell: {
      flex: 1,
      aspectRatio: 1,
      position: "relative",
      overflow: "hidden",
    },
    photoImg: { width: "100%", height: "100%" },
    voiceCell: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    captionOverlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "rgba(0,0,0,0.55)",
      padding: 4,
    },
    captionText: { color: "#fff", fontSize: 10, fontFamily: fonts.subheading },
    lightboxBg: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.95)",
      alignItems: "center",
      justifyContent: "center",
    },
    lightboxClose: { position: "absolute", top: 50, right: 20, zIndex: 10 },
    lightboxImg: { width: "100%", height: "70%" },
    lightboxVoice: { alignItems: "center" },
    lightboxCaption: {
      position: "absolute",
      bottom: 100,
      left: 20,
      right: 20,
      color: "rgba(255,255,255,0.8)",
      fontFamily: fonts.subheading,
      textAlign: "center",
      fontSize: 14,
    },
    captionModalBg: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "flex-end",
    },
    captionModal: {
      padding: 24,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
    },
    captionModalTitle: { fontSize: 20, fontFamily: fonts.serif, marginBottom: 12 },
    captionInput: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      fontFamily: fonts.subheading,
      minHeight: 44,
    },
    captionModalBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
    captionBtn: {
      flex: 1,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    inMemoryRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      borderWidth: 1,
      borderRadius: 10,
      marginTop: 8,
    },
    toggle: { width: 44, height: 24, borderRadius: 12, justifyContent: "center" },
    toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", position: "absolute" },
  });
}
