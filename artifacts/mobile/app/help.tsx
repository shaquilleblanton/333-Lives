import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import React from "react";
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

import { WEB_URLS } from "@/constants/links";
import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

function ResourceLink({
  icon,
  label,
  description,
  onPress,
  testID,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  description: string;
  onPress: () => void;
  testID: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.resource,
        { backgroundColor: pressed ? colors.muted + "55" : colors.card, borderColor: colors.border },
      ]}
    >
      <View style={[styles.resourceIcon, { backgroundColor: colors.primary + "1A" }]}>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.resourceCopy}>
        <Text style={[styles.resourceLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.resourceDescription, { color: colors.mutedForeground }]}>{description}</Text>
      </View>
      <Feather name="external-link" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function HelpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const contentTop = insets.top + WEB_TOP_INSET + 12;
  const contentBottom = insets.bottom + WEB_BOTTOM_INSET + 40;

  async function openResource(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Couldn’t open this page", "Please try again or visit 333lives.app in your browser.");
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: contentTop,
          paddingBottom: contentBottom,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityLabel="Go back"
          testID="help-back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.6 : 1 }]}
          hitSlop={12}
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
          <Text style={[styles.backText, { color: colors.foreground }]}>Back</Text>
        </Pressable>

        <View style={styles.hero}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>333 LIVES SUPPORT</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Help Center</Text>
          <Text style={[styles.intro, { color: colors.mutedForeground }]}>
            Find guidance for your daily practice, your life story, sharing, privacy, and everything in between.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          testID="help-instructions"
          onPress={() => router.push("/instructions" as any)}
          style={({ pressed }) => [
            styles.orientationCard,
            { backgroundColor: pressed ? colors.primary + "25" : colors.primary + "15", borderColor: colors.primary + "45" },
          ]}
        >
          <View style={[styles.orientationIcon, { backgroundColor: colors.primary + "25" }]}>
            <Feather name="compass" size={20} color={colors.primary} />
          </View>
          <View style={styles.orientationCopy}>
            <Text style={[styles.orientationLabel, { color: colors.foreground }]}>How 333 Lives Works</Text>
            <Text style={[styles.orientationDescription, { color: colors.mutedForeground }]}>
              A quick orientation to Today, Streak, Memos, Vault, Pulse, and Family.
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.primary} />
        </Pressable>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ONLINE RESOURCES</Text>
        <View style={styles.resources}>
          <ResourceLink
            icon="book-open"
            label="Browse full Help Center"
            description="Search all guides and answers on the web"
            onPress={() => void openResource(WEB_URLS.help)}
            testID="help-web-center"
          />
          <ResourceLink
            icon="shield"
            label="Privacy Policy"
            description="How your data is collected, used, and protected"
            onPress={() => void openResource(WEB_URLS.privacy)}
            testID="help-privacy"
          />
          <ResourceLink
            icon="file-text"
            label="Terms of Service"
            description="The terms for using 333 Lives"
            onPress={() => void openResource(WEB_URLS.terms)}
            testID="help-terms"
          />
          <ResourceLink
            icon="mail"
            label="Contact Support"
            description="Get help from the 333 Lives team"
            onPress={() => void openResource(WEB_URLS.support)}
            testID="help-support"
          />
        </View>

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          Still need help? The Support page includes account deletion and data export instructions.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backButton: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", paddingVertical: 6 },
  backText: { fontFamily: fonts.sub, fontSize: 14 },
  hero: { marginTop: 28, marginBottom: 24 },
  eyebrow: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 1.7, marginBottom: 10 },
  title: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 39, marginBottom: 12 },
  intro: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, maxWidth: 520 },
  orientationCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 17, borderWidth: 1, padding: 15, marginBottom: 30 },
  orientationIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  orientationCopy: { flex: 1 },
  orientationLabel: { fontFamily: fonts.bodySemibold, fontSize: 15, marginBottom: 4 },
  orientationDescription: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
  sectionTitle: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 1.5, marginLeft: 4, marginBottom: 9 },
  resources: { gap: 10 },
  resource: { flexDirection: "row", alignItems: "center", gap: 13, borderRadius: 16, borderWidth: 1, padding: 14 },
  resourceIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  resourceCopy: { flex: 1 },
  resourceLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, marginBottom: 3 },
  resourceDescription: { fontFamily: fonts.sub, fontSize: 12, lineHeight: 17 },
  footer: { fontFamily: fonts.sub, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 24, paddingHorizontal: 12 },
});