import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

type Slide = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
};

const SLIDES: Slide[] = [
  {
    id: "welcome",
    icon: "heart-outline",
    iconColor: "#C9A439",
    title: "Welcome to 333 Lives",
    subtitle:
      "Your personal companion for living with intention — capturing the story of your life, one day at a time.",
  },
  {
    id: "habits",
    icon: "flame-outline",
    iconColor: "#C9A439",
    title: "Build Habits & Intentions",
    subtitle:
      "Set your 3 daily intentions, track habit streaks, and reflect on your progress to build a life you're proud of.",
  },
  {
    id: "memories",
    icon: "journal-outline",
    iconColor: "#8FA67A",
    title: "Capture Your Story",
    subtitle:
      "Log life events, milestones, and memories with photos in a personal timeline that's always yours to keep.",
  },
  {
    id: "family",
    icon: "people-outline",
    iconColor: "#8FA67A",
    title: "Stay Connected",
    subtitle:
      "Share moments on the family Pulse feed, grow your family tree, and keep the people who matter most close.",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const flatListRef = useRef<FlatList<Slide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  async function handleGetStarted() {
    await AsyncStorage.setItem("hasSeenOnboarding", "true");
    router.replace("/(auth)/sign-in" as any);
  }

  function handleSkip() {
    flatListRef.current?.scrollToIndex({ index: SLIDES.length - 1, animated: true });
  }

  function handleNext() {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      handleGetStarted();
    }
  }

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Skip button */}
      {!isLast && (
        <SafeAreaView edges={["top"]} style={styles.skipRow}>
          <Pressable onPress={handleSkip} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip</Text>
          </Pressable>
        </SafeAreaView>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <SlideItem item={item} colors={colors} />
        )}
        style={styles.flatList}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i === activeIndex ? colors.primary : colors.muted,
                width: i === activeIndex ? 20 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* CTA */}
      <SafeAreaView edges={["bottom"]} style={styles.ctaArea}>
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            styles.ctaBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>
            {isLast ? "Get Started" : "Next"}
          </Text>
          <Ionicons
            name={isLast ? "arrow-forward-circle" : "chevron-forward"}
            size={20}
            color={colors.primaryForeground}
            style={{ marginLeft: 6 }}
          />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function SlideItem({
  item,
  colors,
}: {
  item: Slide;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.slide, { width }]}>
      {/* Icon circle */}
      <LinearGradient
        colors={["#2A2A2A", "#1F1F23"]}
        style={styles.iconCircle}
      >
        <Ionicons name={item.icon} size={56} color={item.iconColor} />
      </LinearGradient>

      {/* Text */}
      <Text style={[styles.title, { color: colors.foreground }]}>
        {item.title}
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        {item.subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipRow: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 10,
    paddingRight: 20,
  },
  skipBtn: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  flatList: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    paddingBottom: 80,
  },
  iconCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 26,
    fontFamily: "PlayfairDisplay_700Bold",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 300,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  ctaArea: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 8,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
