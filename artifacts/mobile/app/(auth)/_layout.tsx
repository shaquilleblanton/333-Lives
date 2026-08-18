import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const colors = useColors();

  // Show a spinner instead of a blank screen while Clerk initialises.
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (isSignedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
