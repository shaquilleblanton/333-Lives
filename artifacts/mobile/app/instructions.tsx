import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
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

type Accent = "primary" | "secondary" | "accent";
type GuideItem = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  accent: Accent;
};

type GuideSection = {
  title: string;
  intro: string;
  items: GuideItem[];
};

const GUIDE_SECTIONS: GuideSection[] = [
  {
    title: "Begin here",
    intro: "Onboarding gets you oriented, and authentication keeps your private life records connected to you.",
    items: [
      {
        icon: "compass",
        title: "Onboarding",
        description: "The onboarding tour introduces the daily practice and the main spaces in the app. It exists so you can understand where to begin; you can replay it from Profile → View App Tour.",
        accent: "primary",
      },
      {
        icon: "log-in",
        title: "Sign in & create an account",
        description: "Use the sign-in or sign-up screens to access your account through Clerk. Authentication lets your data sync across signed-in devices and keeps private content associated with the right account.",
        accent: "secondary",
      },
    ],
  },
  {
    title: "Start with today",
    intro: "The 333 practice is a small daily reset: choose what matters, notice what is good, and return tomorrow.",
    items: [
      {
        icon: "sun",
        title: "Today · The 333 Method",
        description: "Set three intentions for the day, mark them complete as you go, and use Today’s overview to stay grounded. Completing all three intentions closes the day and counts toward your streak.",
        accent: "primary",
      },
      {
        icon: "calendar",
        title: "Day detail",
        description: "Open a day from Today or your history to review that day’s intentions, gratitude, journal, events, and other activity. It exists to help you see the context of one day without searching through every section.",
        accent: "secondary",
      },
      {
        icon: "heart",
        title: "Gratitude",
        description: "Write what you are grateful for today, then return to past entries when you want perspective. It is a private record of the good you noticed.",
        accent: "accent",
      },
      {
        icon: "award",
        title: "Streak",
        description: "See your current run, personal best, and day-by-day history. Streak is there to celebrate consistency, not to demand perfection—missing a day is always an invitation to begin again.",
        accent: "secondary",
      },
      {
        icon: "check-circle",
        title: "Habits",
        description: "Create a behavior you want to practice, check in each day, and record how it felt. Habits are separate from the three daily intentions, so you can build longer-term routines at your own pace.",
        accent: "primary",
      },
    ],
  },
  {
    title: "Grow with intention",
    intro: "Use Growth to turn reflection into a direction you can revisit over time.",
    items: [
      {
        icon: "trending-up",
        title: "Growth Hub",
        description: "Bring habits, goals, and journal reflections together. Use it to see what you are practicing, what you are working toward, and what you are learning along the way.",
        accent: "primary",
      },
      {
        icon: "target",
        title: "Goals",
        description: "Name a goal, choose the progress you have made, and keep it visible beside your everyday practice. Goals help connect small actions to a longer horizon.",
        accent: "accent",
      },
      {
        icon: "book-open",
        title: "Journal",
        description: "Respond to a daily prompt or write freely. Your journal is a private place to put words to the day and notice patterns in your life.",
        accent: "secondary",
      },
      {
        icon: "message-circle",
        title: "Life Coach, Affirmations & AI Chat",
        description: "Ask for a reflective prompt, generate an affirmation, or have a guided conversation. AI is a tool for reflection—not medical, mental-health, legal, or emergency advice.",
        accent: "accent",
      },
    ],
  },
  {
    title: "Capture your story",
    intro: "These spaces help you preserve the voice, images, memories, and milestones that make your life yours.",
    items: [
      {
        icon: "mic",
        title: "Memos",
        description: "Record a quick voice note, save it with a title, then replay, rename, or delete it later. Allow microphone access when prompted; your memos are private by default.",
        accent: "secondary",
      },
      {
        icon: "image",
        title: "Memories",
        description: "Create albums or collections for the moments you want to hold onto. Add photos and voice memories, choose a cover image, and connect a collection to a person when it helps tell the story.",
        accent: "primary",
      },
      {
        icon: "calendar",
        title: "Life Timeline",
        description: "Add a defining moment with a title, date or approximate date, category, story, and supporting photos or audio. The Timeline gives your life events a clear place in time.",
        accent: "accent",
      },
      {
        icon: "edit-3",
        title: "Tell Your Story",
        description: "Answer guided life-story prompts in writing or with your voice. Revisit, edit, or remove answers whenever your story grows or your perspective changes.",
        accent: "secondary",
      },
    ],
  },
  {
    title: "Organize life",
    intro: "The Life hub keeps practical commitments and meaningful relationships close to the story you are building.",
    items: [
      {
        icon: "check-square",
        title: "Tasks",
        description: "Create to-dos, set a priority and due date, and mark work complete. Tasks keep the next useful action visible without taking over your daily practice.",
        accent: "primary",
      },
      {
        icon: "users",
        title: "My Circle",
        description: "Add the people who matter, their relationship to you, birthdays, anniversaries, and connection moments. It is your private relationship map and reminder system.",
        accent: "secondary",
      },
      {
        icon: "calendar",
        title: "Schedule",
        description: "Add calendar events, availability, and dates or times so commitments have a home. Use it to make room for what you have planned.",
        accent: "accent",
      },
      {
        icon: "activity",
        title: "Workouts",
        description: "Plan a session by name and focus, then see what is scheduled, completed, or still ahead. It is a simple record of movement and follow-through.",
        accent: "secondary",
      },
    ],
  },
  {
    title: "Share, remember & leave a legacy",
    intro: "Sharing is intentional in 333 Lives. Your private reflections stay private unless you choose a sharing feature or a family-visible Vault item.",
    items: [
      {
        icon: "zap",
        title: "Pulse",
        description: "Share a text update, photo, or voice note with your Circle; react to posts from people in that Circle and delete your own posts. A post can expire after 24 hours or be kept persistent when you choose.",
        accent: "accent",
      },
      {
        icon: "globe",
        title: "Community",
        description: "Create an event or gathering with a date, category, availability, and details. Others can respond, while you can return to edit or delete events you created.",
        accent: "primary",
      },
      {
        icon: "git-branch",
        title: "Family Tree",
        description: "Build your lineage with relatives, relationships, life dates, photos, affiliations, notes, and meaningful moments. Use “In memory” to honor someone who has passed.",
        accent: "secondary",
      },
      {
        icon: "mail",
        title: "Legacy Letters",
        description: "Write a letter meant to outlive today. You can return to edit it, or seal it when you are ready for it to be kept as written.",
        accent: "accent",
      },
      {
        icon: "lock",
        title: "Future Messages",
        description: "Write a message now and choose a date when it can be opened. It stays sealed until the selected moment, giving you a way to speak across time.",
        accent: "secondary",
      },
    ],
  },
  {
    title: "Protect what matters",
    intro: "Privacy controls are built into the places where personal details and documents need extra care.",
    items: [
      {
        icon: "shield",
        title: "Secure Vault",
        description: "Store important documents, estate details, trusted contacts, and essential information in categories that make them easier to find. Vault items are private unless you specifically choose Family visibility; only accepted family links can access family-visible items.",
        accent: "primary",
      },
      {
        icon: "file-text",
        title: "Review",
        description: "Use Review to look back across your year and notice the intentions, habits, reflections, and moments that shaped it. It is a space for perspective before you set your next direction.",
        accent: "accent",
      },
      {
        icon: "message-square",
        title: "Feedback & help",
        description: "Use Profile → Feedback to report an issue or share an idea, and Profile → Help for this guide and support links. These spaces exist so you can get unstuck and tell the team what would make 333 Lives better.",
        accent: "primary",
      },
      {
        icon: "moon",
        title: "Appearance & themes",
        description: "Choose a visual theme from Profile → Appearance → Choose Theme. The preference is saved locally on that device so the app feels comfortable to use.",
        accent: "secondary",
      },
      {
        icon: "user",
        title: "Profile, Help & Privacy",
        description: "Profile is where you manage your account, revisit your streak, choose appearance, share feedback, and open Help. From there you can also review the Privacy Policy and Terms, or contact Support.",
        accent: "secondary",
      },
      {
        icon: "log-out",
        title: "Delete account or sign out",
        description: "Profile → Delete account permanently removes account records and local app data, then signs you out; media cleanup is best effort and Clerk deletion may be retried. If it fails after a retry, contact Support. Sign out ends the current session without deleting your account.",
        accent: "accent",
      },
    ],
  },
];

function GuideCard({ item }: { item: GuideItem }) {
  const colors = useColors();
  const accent = colors[item.accent];

  return (
    <View style={[styles.guideCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: accent + "1A" }]}>
        <Feather name={item.icon} size={18} color={accent} />
      </View>
      <View style={styles.guideCopy}>
        <Text style={[styles.guideTitle, { color: colors.foreground }]}>{item.title}</Text>
        <Text style={[styles.guideDescription, { color: colors.mutedForeground }]}>
          {item.description}
        </Text>
      </View>
    </View>
  );
}

export default function InstructionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const contentTop = insets.top + WEB_TOP_INSET + 12;
  const contentBottom = insets.bottom + WEB_BOTTOM_INSET + 40;

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
          testID="instructions-back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.6 : 1 }]}
          hitSlop={12}
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
          <Text style={[styles.backText, { color: colors.foreground }]}>Back</Text>
        </Pressable>

        <View style={styles.hero}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>333 LIVES GUIDE</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Every part of your life, in one place.</Text>
          <Text style={[styles.intro, { color: colors.mutedForeground }]}>
            A practical guide to the daily practice, life story tools, sharing spaces, and privacy controls that make up 333 Lives.
          </Text>
        </View>

        {GUIDE_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>{section.title.toUpperCase()}</Text>
            <Text style={[styles.sectionIntro, { color: colors.mutedForeground }]}>{section.intro}</Text>
            <View style={styles.guideList}>
              {section.items.map((item) => <GuideCard key={item.title} item={item} />)}
            </View>
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Help Center"
          testID="instructions-help"
          onPress={() => router.push("/help" as any)}
          style={({ pressed }) => [
            styles.helpCard,
            { backgroundColor: colors.primary + "12", borderColor: colors.primary + "35", opacity: pressed ? 0.78 : 1 },
          ]}
        >
          <Feather name="help-circle" size={19} color={colors.primary} />
          <View style={styles.helpCopy}>
            <Text style={[styles.helpTitle, { color: colors.foreground }]}>Need help with something specific?</Text>
            <Text style={[styles.helpText, { color: colors.mutedForeground }]}>Open Help for support, privacy, terms, and account-request details.</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.primary} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backButton: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", paddingVertical: 6 },
  backText: { fontFamily: fonts.sub, fontSize: 14 },
  hero: { marginTop: 28, marginBottom: 30 },
  eyebrow: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 1.7, marginBottom: 10 },
  title: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 37, marginBottom: 12 },
  intro: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, maxWidth: 520 },
  section: { marginBottom: 28 },
  sectionTitle: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 1.45, marginBottom: 7 },
  sectionIntro: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, marginBottom: 12 },
  guideList: { gap: 10 },
  guideCard: { flexDirection: "row", alignItems: "flex-start", gap: 13, borderRadius: 17, borderWidth: 1, padding: 15 },
  iconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  guideCopy: { flex: 1 },
  guideTitle: { fontFamily: fonts.bodySemibold, fontSize: 15, marginBottom: 5 },
  guideDescription: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20 },
  helpCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 17, borderWidth: 1, padding: 16 },
  helpCopy: { flex: 1 },
  helpTitle: { fontFamily: fonts.bodySemibold, fontSize: 14, marginBottom: 3 },
  helpText: { fontFamily: fonts.sub, fontSize: 12, lineHeight: 18 },
});