import { useClerk } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import {
  useGetMe,
  useUpdateMe,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

function MenuItem({
  icon, label, sub, onPress, danger, rightLabel,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  sub?: string;
  onPress?: () => void;
  danger?: boolean;
  rightLabel?: string;
}) {
  const colors = useColors();
  const iconColor = danger ? "#f87171" : colors.mutedForeground;
  const textColor = danger ? "#f87171" : colors.foreground;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        { backgroundColor: pressed ? colors.muted + "40" : "transparent", borderBottomColor: colors.border },
      ]}
    >
      <View style={[styles.menuIcon, { backgroundColor: iconColor + "1A" }]}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, { color: textColor }]}>{label}</Text>
        {sub ? <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>{sub}</Text> : null}
      </View>
      {rightLabel ? (
        <Text style={[styles.rightLabel, { color: colors.mutedForeground }]}>{rightLabel}</Text>
      ) : onPress ? (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground + "60"} />
      ) : null}
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function EditProfileModal({ visible, name: initName, bio: initBio, onClose, onSave, isSaving }: {
  visible: boolean;
  name: string;
  bio: string;
  onClose: () => void;
  onSave: (name: string, bio: string) => void;
  isSaving: boolean;
}) {
  const colors = useColors();
  const [name, setName] = useState(initName);
  const [bio, setBio] = useState(initBio);

  React.useEffect(() => {
    if (visible) { setName(initName); setBio(initBio); }
  }, [visible, initName, initBio]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Edit Profile</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.mutedForeground + "99"}
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            autoFocus
          />
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="A short bio (optional)"
            placeholderTextColor={colors.mutedForeground + "99"}
            style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable onPress={onClose} style={[styles.cancelBtn, { borderColor: colors.border, flex: 1 }]}>
              <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onSave(name.trim(), bio.trim())}
              disabled={!name.trim() || isSaving}
              style={[styles.saveBtn, { backgroundColor: colors.primary, flex: 1, opacity: !name.trim() || isSaving ? 0.5 : 1 }]}
            >
              {isSaving ? <ActivityIndicator color="#000" size="small" /> : (
                <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const { signOut } = useClerk();
  const qc = useQueryClient();
  const { data: me, isLoading } = useGetMe();
  const updateMe = useUpdateMe();
  const [editOpen, setEditOpen] = useState(false);

  const topPad = insets.top + WEB_TOP_INSET + 12;
  const botPad = insets.bottom + WEB_BOTTOM_INSET + 24;

  const displayName = me?.name ?? "";
  const bio = me?.bio ?? "";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  async function handleSave(name: string, newBio: string) {
    try {
      await updateMe.mutateAsync({ data: { name, bio: newBio } } as any);
      qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setEditOpen(false);
    } catch { Alert.alert("Couldn't save", "Please try again."); }
  }

  function confirmSignOut() {
    if (Platform.OS === "web") { void signOut(); return; }
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topPad, paddingBottom: botPad, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar + name */}
      <View style={styles.avatarSection}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginBottom: 20 }} />
        ) : (
          <>
            <View style={[styles.avatar, { backgroundColor: colors.primary + "26", borderColor: colors.primary + "50" }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
            </View>
            <Text style={[styles.name, { color: colors.foreground }]}>{displayName || "Your Profile"}</Text>
            {bio ? <Text style={[styles.bio, { color: colors.mutedForeground }]}>{bio}</Text> : null}
            <Pressable
              onPress={() => setEditOpen(true)}
              style={({ pressed }) => [styles.editProfileBtn, { borderColor: colors.border, backgroundColor: pressed ? colors.muted + "40" : "transparent" }]}
            >
              <Feather name="edit-2" size={13} color={colors.mutedForeground} />
              <Text style={[styles.editProfileText, { color: colors.mutedForeground }]}>Edit Profile</Text>
            </Pressable>
          </>
        )}
      </View>

      <Section title="ACCOUNT">
        <MenuItem
          icon="message-square"
          label="Feedback"
          sub="Share ideas or report issues"
          onPress={() => router.push("/(tabs)/feedback" as any)}
        />
        <MenuItem
          icon="award"
          label="Streak"
          sub="Your intention-setting history"
          onPress={() => router.push("/(tabs)/streak" as any)}
        />
      </Section>

      <Section title="APP">
        <MenuItem icon="moon" label="Appearance" sub="Follows your device setting"
          rightLabel={scheme === "dark" ? "Dark" : scheme === "light" ? "Light" : "System"} />
        <MenuItem icon="info" label="Version" rightLabel="333 Lives" />
      </Section>

      <Section title="SESSION">
        <MenuItem icon="log-out" label="Sign out" danger onPress={confirmSignOut} />
      </Section>

      <EditProfileModal
        visible={editOpen}
        name={displayName}
        bio={bio}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
        isSaving={updateMe.isPending}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatarSection: { alignItems: "center", marginBottom: 32, paddingTop: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  avatarText: { fontFamily: fonts.serifBold, fontSize: 28 },
  name: { fontFamily: fonts.serif, fontSize: 24, marginBottom: 6 },
  bio: { fontFamily: fonts.sub, fontSize: 13, textAlign: "center", maxWidth: 260, lineHeight: 18, marginBottom: 12 },
  editProfileBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  editProfileText: { fontFamily: fonts.sub, fontSize: 13 },
  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
  sectionCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 14, borderBottomWidth: 1 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontFamily: fonts.bodyMedium, fontSize: 15 },
  menuSub: { fontFamily: fonts.sub, fontSize: 12, marginTop: 2 },
  rightLabel: { fontFamily: fonts.sub, fontSize: 13 },
  overlay: { flex: 1 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 24, paddingBottom: 40, gap: 12 },
  sheetTitle: { fontFamily: fonts.serif, fontSize: 22, marginBottom: 4 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontFamily: fonts.body, fontSize: 14 },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  cancelBtn: { borderRadius: 999, paddingVertical: 13, alignItems: "center", borderWidth: 1 },
  cancelBtnText: { fontFamily: fonts.sub, fontSize: 14 },
  saveBtn: { borderRadius: 999, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { fontFamily: fonts.subSemibold, fontSize: 15 },
});
