import { useClerk, useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

function MenuItem({
  icon,
  label,
  sub,
  onPress,
  danger,
  rightLabel,
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
        {
          backgroundColor: pressed ? colors.muted + "40" : "transparent",
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={[styles.menuIcon, { backgroundColor: iconColor + "1A" }]}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, { color: textColor }]}>{label}</Text>
        {sub ? (
          <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>{sub}</Text>
        ) : null}
      </View>
      {rightLabel ? (
        <Text style={[styles.rightLabel, { color: colors.mutedForeground }]}>{rightLabel}</Text>
      ) : (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground + "60"} />
      )}
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

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut } = useClerk();
  const { user } = useUser();

  const topPad = insets.top + WEB_TOP_INSET + 12;
  const botPad = insets.bottom + WEB_BOTTOM_INSET + 24;

  const firstName = user?.firstName ?? "";
  const lastName = user?.lastName ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Your Profile";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const initials = [firstName[0], lastName[0]].filter(Boolean).join("").toUpperCase() || "?";

  function confirmSignOut() {
    if (Platform.OS === "web") {
      void signOut();
      return;
    }
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
        <View style={[styles.avatar, { backgroundColor: colors.primary + "26", borderColor: colors.primary + "50" }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>{fullName}</Text>
        {email ? (
          <Text style={[styles.email, { color: colors.mutedForeground }]}>{email}</Text>
        ) : null}
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
        <MenuItem
          icon="moon"
          label="Appearance"
          sub="Dark luxury — always"
          rightLabel="Dark"
        />
        <MenuItem
          icon="info"
          label="Version"
          rightLabel="333 Lives"
        />
      </Section>

      <Section title="SESSION">
        <MenuItem
          icon="log-out"
          label="Sign out"
          danger
          onPress={confirmSignOut}
        />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatarSection: {
    alignItems: "center",
    marginBottom: 32,
    paddingTop: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: {
    fontFamily: fonts.serifBold,
    fontSize: 28,
  },
  name: {
    fontFamily: fonts.serif,
    fontSize: 24,
    marginBottom: 4,
  },
  email: {
    fontFamily: fonts.sub,
    fontSize: 13,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: fonts.subSemibold,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
    borderBottomWidth: 1,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  menuSub: {
    fontFamily: fonts.sub,
    fontSize: 12,
    marginTop: 2,
  },
  rightLabel: {
    fontFamily: fonts.sub,
    fontSize: 13,
  },
});
