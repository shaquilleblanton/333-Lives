import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

export function CompletionRing({
  completed,
  total,
  size = 92,
  stroke = 8,
}: {
  completed: number;
  total: number;
  size?: number;
  stroke?: number;
}) {
  const colors = useColors();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? completed / total : 0;
  const dashoffset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.muted}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.primary}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[styles.count, { color: colors.foreground }]}>
          {completed}
          <Text style={[styles.total, { color: colors.mutedForeground }]}>
            /{total}
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  count: { fontFamily: fonts.serifBold, fontSize: 30 },
  total: { fontFamily: fonts.serifMedium, fontSize: 16 },
});
