import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

interface ErrorRetryViewProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * Full-screen (flex: 1) error state with an optional retry button.
 * Drop this in whenever isError is true on a React Query fetch.
 */
export function ErrorRetryView({ message = "Something went wrong.", onRetry }: ErrorRetryViewProps) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }}>
        <Feather name="wifi-off" size={28} color={colors.mutedForeground} />
      </View>
      <Text style={{ fontFamily: fonts.serif, fontSize: 20, color: colors.foreground, textAlign: "center" }}>
        Couldn't load data
      </Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.mutedForeground, textAlign: "center", lineHeight: 20 }}>
        {message}
      </Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => ({
            marginTop: 8,
            backgroundColor: colors.primary,
            paddingHorizontal: 28,
            paddingVertical: 12,
            borderRadius: 10,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ fontFamily: fonts.subSemibold, fontSize: 14, color: colors.primaryForeground }}>
            Try Again
          </Text>
        </Pressable>
      )}
    </View>
  );
}
