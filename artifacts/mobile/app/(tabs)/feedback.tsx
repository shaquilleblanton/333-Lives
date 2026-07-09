import { Feather } from "@expo/vector-icons";
import {
  useCreateFeedback,
  useGetMyFeedback,
  getGetMyFeedbackQueryKey,
} from "@workspace/api-client-react";
import type { FeedbackItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 100 : 0;

type FeedbackType = FeedbackItem["type"];
type FeedbackStatus = FeedbackItem["status"];

const TYPE_OPTIONS: Array<{ value: FeedbackType; label: string; icon: keyof typeof Feather.glyphMap }> = [
  { value: "feature", label: "New idea", icon: "zap" },
  { value: "improvement", label: "Improve", icon: "tool" },
  { value: "bug", label: "Bug", icon: "alert-circle" },
];

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: "New",
  planned: "Planned",
  done: "Done",
  declined: "Not planned",
};

export default function FeedbackScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: items, isLoading, refetch, isRefetching } = useGetMyFeedback();
  const createFeedback = useCreateFeedback();

  const [type, setType] = useState<FeedbackType>("feature");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");

  const canSubmit =
    title.trim().length > 0 && details.trim().length > 0 && !createFeedback.isPending;

  const submit = () => {
    createFeedback.mutate(
      { data: { type, title: title.trim(), details: details.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyFeedbackQueryKey() });
          setTitle("");
          setDetails("");
          Alert.alert("Thank you", "Your feedback is in the queue for the next monthly review.");
        },
        onError: () => Alert.alert("Couldn't submit", "Please try again."),
      },
    );
  };

  const statusColor = (status: FeedbackStatus) =>
    status === "done"
      ? "#34d399"
      : status === "planned"
        ? colors.primary
        : status === "declined"
          ? colors.mutedForeground
          : colors.secondary;

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + WEB_TOP_INSET + 12,
        paddingBottom: insets.bottom + WEB_BOTTOM_INSET + 40,
        paddingHorizontal: 20,
      }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
      }
    >
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>SHAPE WHAT COMES NEXT</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Feedback</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Ideas and bug reports go into the monthly review — updates land at the end of each month.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.typeRow}>
          {TYPE_OPTIONS.map((opt) => {
            const active = type === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setType(opt.value)}
                style={[
                  styles.typeChip,
                  {
                    borderColor: active ? colors.primary + "80" : colors.border,
                    backgroundColor: active ? colors.primary + "1A" : "transparent",
                  },
                ]}
              >
                <Feather
                  name={opt.icon}
                  size={14}
                  color={active ? colors.primary : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.typeChipText,
                    { color: active ? colors.primary : colors.mutedForeground },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          value={title}
          onChangeText={setTitle}
          maxLength={200}
          placeholder={type === "bug" ? "What went wrong?" : "What would make it better?"}
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.input,
            { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background },
          ]}
        />
        <TextInput
          value={details}
          onChangeText={setDetails}
          maxLength={5000}
          multiline
          placeholder="Add the details…"
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.input,
            styles.textarea,
            { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background },
          ]}
        />
        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          style={[
            styles.submitBtn,
            { backgroundColor: colors.primary, opacity: canSubmit ? 1 : 0.5 },
          ]}
        >
          {createFeedback.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
              Submit feedback
            </Text>
          )}
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My feedback</Text>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : !items || items.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Nothing yet. Anything you submit shows up here with its status.
        </Text>
      ) : (
        items.map((item) => (
          <View
            key={item.id}
            style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.itemHead}>
              <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={2}>
                {item.title}
              </Text>
              <View
                style={[
                  styles.statusChip,
                  { borderColor: statusColor(item.status) + "66", backgroundColor: statusColor(item.status) + "1A" },
                ]}
              >
                <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                  {STATUS_LABELS[item.status]}
                </Text>
              </View>
            </View>
            <Text style={[styles.itemDetails, { color: colors.mutedForeground }]} numberOfLines={3}>
              {item.details}
            </Text>
          </View>
        ))
      )}
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { marginBottom: 22 },
  eyebrow: { fontFamily: fonts.subSemibold, fontSize: 11, letterSpacing: 2 },
  title: { fontFamily: fonts.serifBold, fontSize: 30, marginTop: 4 },
  subtitle: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 6 },
  card: { borderRadius: 20, borderWidth: 1, padding: 18, gap: 12 },
  typeRow: { flexDirection: "row", gap: 8 },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeChipText: { fontFamily: fonts.subSemibold, fontSize: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  textarea: { minHeight: 90, textAlignVertical: "top" },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { fontFamily: fonts.subSemibold, fontSize: 14 },
  sectionTitle: { fontFamily: fonts.serif, fontSize: 22, marginTop: 28, marginBottom: 12 },
  emptyText: { fontFamily: fonts.sub, fontSize: 13, lineHeight: 20 },
  itemCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10, gap: 6 },
  itemHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  itemTitle: { fontFamily: fonts.subSemibold, fontSize: 14, flex: 1, lineHeight: 20 },
  statusChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: { fontFamily: fonts.subSemibold, fontSize: 10, letterSpacing: 0.5 },
  itemDetails: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
});
