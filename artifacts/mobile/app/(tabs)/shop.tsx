import { Feather } from "@expo/vector-icons";
import {
  useGetShopProducts,
  useCreateShopCheckout,
  type ShopProduct,
} from "@workspace/api-client-react";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  RefreshControl,
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

function formatPrice(amount: string, currencyCode: string) {
  const value = Number(amount);
  if (Number.isNaN(value)) return amount;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currencyCode}`;
  }
}

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: products, isLoading, isError, refetch, isRefetching } =
    useGetShopProducts();
  const createCheckout = useCreateShopCheckout();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const contentTopPad = insets.top + WEB_TOP_INSET + 12;
  const contentBottomPad = insets.bottom + WEB_BOTTOM_INSET + 40;

  const toggleProduct = (product: ShopProduct) => {
    if (expandedId === product.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(product.id);
    const variants = product.variants ?? [];
    const firstAvailable =
      variants.find((v) => v.availableForSale) ?? variants[0];
    setVariantId(firstAvailable?.id ?? null);
    setQuantity(1);
  };

  const handleCheckout = () => {
    if (!variantId) return;
    createCheckout.mutate(
      { data: { variantId, quantity } },
      {
        onSuccess: async ({ checkoutUrl }) => {
          try {
            await WebBrowser.openBrowserAsync(checkoutUrl);
          } catch {
            Alert.alert(
              "Couldn't open checkout",
              "The checkout page couldn't be opened on this device. Please try again.",
            );
          }
        },
        onError: () => {
          Alert.alert(
            "Checkout didn't start",
            "We couldn't reach the store's checkout. Please try again.",
          );
        },
      },
    );
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.screen,
          styles.centerFill,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: contentTopPad,
        paddingBottom: contentBottomPad,
        paddingHorizontal: 20,
      }}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Shop</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Crafted pieces and curated goods.
      </Text>

      {isError && (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="shopping-bag" size={28} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            The shop couldn't be reached
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Pull down to try again.
          </Text>
        </View>
      )}

      {!isError && (products?.length ?? 0) === 0 && (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[styles.emptyIcon, { backgroundColor: colors.primary + "1A" }]}
          >
            <Feather name="shopping-bag" size={22} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            The store is opening soon
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Crafted apparel and curated pieces are on their way. Check back
            shortly — the first drop is being prepared.
          </Text>
        </View>
      )}

      {!isError &&
        products?.map((product) => {
          const isExpanded = expandedId === product.id;
          const selectedVariant = product.variants.find(
            (v) => v.id === variantId,
          );
          return (
            <View
              key={product.id}
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Pressable onPress={() => toggleProduct(product)}>
                {product.imageUrl ? (
                  <Image
                    source={{ uri: product.imageUrl }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[styles.image, styles.imageFallback]}
                  >
                    <Feather
                      name="shopping-bag"
                      size={28}
                      color={colors.mutedForeground}
                    />
                  </View>
                )}
                <View style={styles.cardBody}>
                  <Text
                    style={[styles.productTitle, { color: colors.foreground }]}
                  >
                    {product.title}
                  </Text>
                  <View style={styles.priceRow}>
                    <Text style={[styles.price, { color: colors.primary }]}>
                      {formatPrice(product.price, product.currencyCode)}
                    </Text>
                    {!product.availableForSale && (
                      <Text
                        style={[
                          styles.soldOut,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        Sold out
                      </Text>
                    )}
                  </View>
                </View>
              </Pressable>

              {isExpanded && (
                <View
                  style={[styles.expanded, { borderTopColor: colors.border }]}
                >
                  {!!product.description && (
                    <Text
                      style={[
                        styles.description,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {product.description}
                    </Text>
                  )}

                  {product.variants.length > 1 && (
                    <View style={styles.variantRow}>
                      {product.variants.map((v) => {
                        const isSelected = v.id === variantId;
                        return (
                          <Pressable
                            key={v.id}
                            disabled={!v.availableForSale}
                            onPress={() => setVariantId(v.id)}
                            style={[
                              styles.variantChip,
                              {
                                borderColor: isSelected
                                  ? colors.primary
                                  : colors.border,
                                backgroundColor: isSelected
                                  ? colors.primary + "1A"
                                  : "transparent",
                                opacity: v.availableForSale ? 1 : 0.4,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                fontFamily: fonts.sub,
                                fontSize: 13,
                                color: isSelected
                                  ? colors.primary
                                  : colors.mutedForeground,
                              }}
                            >
                              {v.title}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}

                  <View style={styles.checkoutRow}>
                    <View style={styles.qtyRow}>
                      <Pressable
                        onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                        style={[styles.qtyBtn, { borderColor: colors.border }]}
                      >
                        <Feather
                          name="minus"
                          size={16}
                          color={colors.foreground}
                        />
                      </Pressable>
                      <Text
                        style={[styles.qtyText, { color: colors.foreground }]}
                      >
                        {quantity}
                      </Text>
                      <Pressable
                        onPress={() => setQuantity((q) => Math.min(99, q + 1))}
                        style={[styles.qtyBtn, { borderColor: colors.border }]}
                      >
                        <Feather
                          name="plus"
                          size={16}
                          color={colors.foreground}
                        />
                      </Pressable>
                    </View>
                    <Text
                      style={[styles.totalPrice, { color: colors.foreground }]}
                    >
                      {selectedVariant
                        ? formatPrice(
                            (Number(selectedVariant.price) * quantity).toFixed(2),
                            product.currencyCode,
                          )
                        : formatPrice(product.price, product.currencyCode)}
                    </Text>
                  </View>

                  <Pressable
                    onPress={handleCheckout}
                    disabled={
                      !variantId ||
                      !selectedVariant?.availableForSale ||
                      createCheckout.isPending
                    }
                    style={[
                      styles.checkoutBtn,
                      {
                        backgroundColor: colors.primary,
                        opacity:
                          !variantId ||
                          !selectedVariant?.availableForSale ||
                          createCheckout.isPending
                            ? 0.5
                            : 1,
                      },
                    ]}
                  >
                    {createCheckout.isPending ? (
                      <ActivityIndicator
                        color={colors.primaryForeground}
                        size="small"
                      />
                    ) : (
                      <Text
                        style={[
                          styles.checkoutBtnText,
                          { color: colors.primaryForeground },
                        ]}
                      >
                        Checkout
                      </Text>
                    )}
                  </Pressable>
                  <Text
                    style={[
                      styles.checkoutNote,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    You'll complete your purchase on our secure store checkout.
                  </Text>
                </View>
              )}
            </View>
          );
        })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centerFill: { alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.serif, fontSize: 30, marginBottom: 4 },
  subtitle: { fontFamily: fonts.subRegular, fontSize: 14, marginBottom: 20 },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 44,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    marginTop: 10,
    marginBottom: 6,
    textAlign: "center",
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 16,
    overflow: "hidden",
  },
  image: { width: "100%", height: 220 },
  imageFallback: { alignItems: "center", justifyContent: "center" },
  cardBody: { padding: 14 },
  productTitle: { fontFamily: fonts.sub, fontSize: 16, marginBottom: 4 },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  price: { fontFamily: fonts.subSemibold, fontSize: 15 },
  soldOut: { fontFamily: fonts.body, fontSize: 12 },
  expanded: { borderTopWidth: 1, padding: 14 },
  description: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  variantRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  variantChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  checkoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    minWidth: 20,
    textAlign: "center",
  },
  totalPrice: { fontFamily: fonts.serif, fontSize: 20 },
  checkoutBtn: {
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutBtnText: { fontFamily: fonts.subSemibold, fontSize: 15 },
  checkoutNote: {
    fontFamily: fonts.body,
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
  },
});
