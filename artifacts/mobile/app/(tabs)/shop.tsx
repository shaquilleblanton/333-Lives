/**
 * 333 Lives Wellness Shop
 * Curated organic products in partnership with Eat to Live Not to Die.
 * Each product opens the EATLIVE website with a referral code so sales
 * from this app can be tracked and attributed.
 *
 * Update EATLIVE_BASE_URL once the owner confirms the affiliate link / domain.
 */

import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  ActivityIndicator,
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

// ─── Config ────────────────────────────────────────────────────────────────
const EATLIVE_BASE_URL = "https://eattolivenottodie.com";
const REFERRAL_CODE    = "333lives";

// ─── Product catalog ───────────────────────────────────────────────────────
// Update prices / slugs once the owner shares the affiliate catalog.
type WellnessProduct = {
  id: string;
  name: string;
  tagline: string;
  price: string;
  badge?: string;
  emoji: string;
  category: string;
  slug: string; // EATLIVE product URL slug
};

const PRODUCTS: WellnessProduct[] = [
  // ── Supplements ──────────────────────────────────────────────────────────
  {
    id: "sea-moss-gel",
    name: "Organic Sea Moss Gel",
    tagline: "92 essential minerals. Raw Irish Sea Moss blended with spring water.",
    price: "$28",
    badge: "Best Seller",
    emoji: "🌿",
    category: "Supplements",
    slug: "sea-moss-gel",
  },
  {
    id: "sea-moss-capsules",
    name: "Sea Moss Capsules",
    tagline: "Same benefits as the gel — in an easy daily capsule.",
    price: "$35",
    emoji: "💊",
    category: "Supplements",
    slug: "sea-moss-capsules",
  },
  {
    id: "mushroom-coffee",
    name: "Mushroom Coffee Blend",
    tagline: "Reishi · Lion's Mane · Chaga. Focus without the jitters.",
    price: "$28",
    badge: "Most Searched",
    emoji: "☕",
    category: "Supplements",
    slug: "mushroom-coffee-blend",
  },
  {
    id: "reishi-capsules",
    name: "Reishi Mushroom Capsules",
    tagline: "The immunity mushroom. Stress support + deep sleep.",
    price: "$32",
    emoji: "🍄",
    category: "Supplements",
    slug: "reishi-capsules",
  },
  {
    id: "lions-mane",
    name: "Lion's Mane Capsules",
    tagline: "Brain-boosting functional mushroom. Clarity + focus.",
    price: "$32",
    emoji: "🧠",
    category: "Supplements",
    slug: "lions-mane-capsules",
  },
  {
    id: "detox-tea",
    name: "Organic Detox Tea",
    tagline: "Gentle full-body cleanse. 20 organic herbal blends.",
    price: "$18",
    emoji: "🫖",
    category: "Supplements",
    slug: "organic-detox-tea",
  },
  {
    id: "ashwagandha",
    name: "Organic Ashwagandha",
    tagline: "Adaptogen for stress, cortisol + energy balance.",
    price: "$24",
    emoji: "🌱",
    category: "Supplements",
    slug: "ashwagandha",
  },
  // ── Personal Care ─────────────────────────────────────────────────────────
  {
    id: "toothpaste",
    name: "Organic Toothpaste",
    tagline: "Fluoride-free. Remineralizing. No synthetic chemicals.",
    price: "$12",
    emoji: "🪥",
    category: "Personal Care",
    slug: "organic-toothpaste",
  },
  {
    id: "bamboo-toothbrush",
    name: "Bamboo Toothbrush",
    tagline: "100% biodegradable handle. Charcoal-infused bristles.",
    price: "$8",
    emoji: "🌿",
    category: "Personal Care",
    slug: "bamboo-toothbrush",
  },
  {
    id: "face-wash",
    name: "Organic Face Wash",
    tagline: "Gentle, sulfate-free. Works for all skin types.",
    price: "$24",
    emoji: "✨",
    category: "Personal Care",
    slug: "organic-face-wash",
  },
  {
    id: "deodorant",
    name: "Natural Deodorant",
    tagline: "Aluminum-free. Baking soda & shea butter. All-day protection.",
    price: "$16",
    emoji: "🌸",
    category: "Personal Care",
    slug: "natural-deodorant",
  },
  // ── Essentials ────────────────────────────────────────────────────────────
  {
    id: "organic-socks",
    name: "Organic Cotton Socks",
    tagline: "GOTS-certified. Soft, breathable, dye-free.",
    price: "$16",
    emoji: "🧦",
    category: "Essentials",
    slug: "organic-cotton-socks",
  },
];

const CATEGORIES = ["Supplements", "Personal Care", "Essentials"];

// ─── Component ─────────────────────────────────────────────────────────────
const WEB_TOP_INSET    = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

export default function ShopScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const [opening, setOpening] = useState<string | null>(null);

  const contentTopPad    = insets.top + WEB_TOP_INSET + 12;
  const contentBottomPad = insets.bottom + WEB_BOTTOM_INSET + 40;

  const openProduct = async (product: WellnessProduct) => {
    if (opening) return;
    setOpening(product.id);
    try {
      // Log referral click (fire-and-forget — don't block the user)
      fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/shop/referral-click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId:    product.id,
          productName:  product.name,
          referralCode: REFERRAL_CODE,
        }),
      }).catch(() => {/* silent — tracking is non-critical */});

      const url = `${EATLIVE_BASE_URL}/products/${product.slug}?ref=${REFERRAL_CODE}`;
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
    } catch {
      Alert.alert(
        "Couldn't open store",
        "Check your connection and try again.",
      );
    } finally {
      setOpening(null);
    }
  };

  const styles = makeStyles(colors);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop:        contentTopPad,
        paddingBottom:     contentBottomPad,
        paddingHorizontal: 20,
      }}
    >
      {/* Header */}
      <Text style={[styles.title, { color: colors.foreground }]}>Wellness Shop</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Curated organic essentials in partnership with Eat to Live Not to Die
      </Text>

      {/* Partnership banner */}
      <View style={[styles.banner, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
        <Text style={[styles.bannerEmoji]}>🤝</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerTitle, { color: colors.primary }]}>
            333 Lives × Eat to Live Not to Die
          </Text>
          <Text style={[styles.bannerText, { color: colors.mutedForeground }]}>
            Ships from Brixton, London & Miami, FL. Every purchase supports intentional living.
          </Text>
        </View>
      </View>

      {/* Products by category */}
      {CATEGORIES.map((cat) => {
        const items = PRODUCTS.filter((p) => p.category === cat);
        if (items.length === 0) return null;
        return (
          <View key={cat} style={{ marginBottom: 8 }}>
            <Text style={[styles.categoryLabel, { color: colors.mutedForeground }]}>
              {cat.toUpperCase()}
            </Text>
            {items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isLoading={opening === product.id}
                onPress={() => openProduct(product)}
                colors={colors}
                styles={styles}
              />
            ))}
          </View>
        );
      })}

      {/* Footer note */}
      <Text style={[styles.footerNote, { color: colors.mutedForeground }]}>
        All products are organic and ship directly from Eat to Live Not to Die.
        Pricing shown is approximate — confirm on their site.
      </Text>
    </ScrollView>
  );
}

// ─── Product card ──────────────────────────────────────────────────────────
function ProductCard({
  product,
  isLoading,
  onPress,
  colors,
  styles,
}: {
  product:   WellnessProduct;
  isLoading: boolean;
  onPress:   () => void;
  colors:    ReturnType<typeof useColors>;
  styles:    ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Emoji + info */}
      <View style={styles.cardTop}>
        <View style={[styles.emojiBox, { backgroundColor: colors.primary + "15" }]}>
          <Text style={styles.emoji}>{product.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={1}>
              {product.name}
            </Text>
            {!!product.badge && (
              <View style={[styles.badge, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.badgeText, { color: colors.primary }]}>
                  {product.badge}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]} numberOfLines={2}>
            {product.tagline}
          </Text>
        </View>
      </View>

      {/* Price + CTA */}
      <View style={styles.cardBottom}>
        <Text style={[styles.price, { color: colors.primary }]}>{product.price}</Text>
        <Pressable
          onPress={onPress}
          disabled={isLoading}
          style={[styles.shopBtn, { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <>
              <Text style={styles.shopBtnText}>Shop on EATLIVE</Text>
              <Feather name="external-link" size={13} color="#000" />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    title: {
      fontFamily: fonts.serif,
      fontSize:   28,
      marginBottom: 4,
    },
    subtitle: {
      fontFamily:   fonts.sub,
      fontSize:     14,
      marginBottom: 20,
      lineHeight:   20,
    },
    banner: {
      flexDirection:  "row",
      alignItems:     "flex-start",
      gap:            12,
      borderWidth:    1,
      borderRadius:   12,
      padding:        14,
      marginBottom:   24,
    },
    bannerEmoji: { fontSize: 22, marginTop: 1 },
    bannerTitle: {
      fontFamily:   fonts.serifBold,
      fontSize:     14,
      marginBottom: 3,
    },
    bannerText: {
      fontFamily: fonts.sub,
      fontSize:   12,
      lineHeight: 18,
    },
    categoryLabel: {
      fontFamily:    fonts.subSemibold,
      fontSize:      11,
      letterSpacing: 1.2,
      marginBottom:  10,
      marginTop:     4,
    },
    card: {
      borderWidth:   1,
      borderRadius:  14,
      padding:       14,
      marginBottom:  10,
    },
    cardTop: {
      flexDirection: "row",
      gap:           12,
      marginBottom:  12,
    },
    emojiBox: {
      width:         48,
      height:        48,
      borderRadius:  12,
      alignItems:    "center",
      justifyContent:"center",
    },
    emoji: { fontSize: 22 },
    nameRow: {
      flexDirection: "row",
      alignItems:    "center",
      gap:           8,
      flexWrap:      "wrap",
      marginBottom:  4,
    },
    productName: {
      fontFamily: fonts.serifBold,
      fontSize:   15,
      flexShrink: 1,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical:   2,
      borderRadius:      99,
    },
    badgeText: {
      fontFamily: fonts.subSemibold,
      fontSize:   10,
    },
    tagline: {
      fontFamily: fonts.sub,
      fontSize:   12,
      lineHeight: 18,
    },
    cardBottom: {
      flexDirection:  "row",
      alignItems:     "center",
      justifyContent: "space-between",
    },
    price: {
      fontFamily: fonts.serifBold,
      fontSize:   18,
    },
    shopBtn: {
      flexDirection:  "row",
      alignItems:     "center",
      gap:            6,
      paddingHorizontal: 14,
      paddingVertical:   9,
      borderRadius:   10,
    },
    shopBtnText: {
      fontFamily: fonts.subSemibold,
      fontSize:   13,
      color:      "#000",
    },
    footerNote: {
      fontFamily: fonts.sub,
      fontSize:   11,
      lineHeight: 17,
      textAlign:  "center",
      marginTop:  12,
      paddingHorizontal: 8,
    },
  });
}
