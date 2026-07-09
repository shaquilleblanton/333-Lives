import { useSignIn, useSSO } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import { type Href, Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

// Preloads the browser on Android to reduce authentication load time.
export const useWarmUpBrowser = () => {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

// Handle any pending authentication sessions
WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  useWarmUpBrowser();
  const { signIn, errors, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [ssoError, setSsoError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const { error } = await signIn.password({ emailAddress, password });
    if (error) return;

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          const url = decorateUrl("/");
          if (url.startsWith("http")) {
            window.location.href = url;
          } else {
            router.push(url as Href);
          }
        },
      });
    }
  };

  const handleGoogle = useCallback(async () => {
    setSsoError(null);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId) {
        setActive!({
          session: createdSessionId,
          navigate: async ({ session, decorateUrl }) => {
            if (session?.currentTask) return;
            router.push(decorateUrl("/") as Href);
          },
        });
      }
    } catch {
      setSsoError("Google sign-in didn't complete. Please try again.");
    }
  }, [startSSOFlow, router]);

  const busy = fetchStatus === "fetching";

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 40 },
      ]}
    >
      <Text style={[styles.brand, { color: colors.primary }]}>333 Lives</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Welcome back</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Sign in to continue your 333 journey
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.ssoButton,
          { backgroundColor: colors.card, borderColor: colors.border },
          pressed && styles.pressed,
        ]}
        onPress={handleGoogle}
      >
        <Text style={[styles.ssoButtonText, { color: colors.foreground }]}>
          Continue with Google
        </Text>
      </Pressable>
      {ssoError && <Text style={[styles.error, { color: "#E5484D" }]}>{ssoError}</Text>}

      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      <Text style={[styles.label, { color: colors.mutedForeground }]}>Email address</Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
        ]}
        autoCapitalize="none"
        value={emailAddress}
        placeholder="you@example.com"
        placeholderTextColor={colors.mutedForeground}
        onChangeText={setEmailAddress}
        keyboardType="email-address"
      />
      {errors.fields.identifier && (
        <Text style={[styles.error, { color: "#E5484D" }]}>
          {errors.fields.identifier.message}
        </Text>
      )}

      <Text style={[styles.label, { color: colors.mutedForeground }]}>Password</Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
        ]}
        value={password}
        placeholder="Your password"
        placeholderTextColor={colors.mutedForeground}
        secureTextEntry
        onChangeText={setPassword}
      />
      {errors.fields.password && (
        <Text style={[styles.error, { color: "#E5484D" }]}>
          {errors.fields.password.message}
        </Text>
      )}
      {errors.global && errors.global.length > 0 && (
        <Text style={[styles.error, { color: "#E5484D" }]}>{errors.global[0].message}</Text>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.primary },
          (!emailAddress || !password || busy) && styles.buttonDisabled,
          pressed && styles.pressed,
        ]}
        onPress={handleSubmit}
        disabled={!emailAddress || !password || busy}
      >
        {busy ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Sign in</Text>
        )}
      </Pressable>

      <View style={styles.linkRow}>
        <Text style={[styles.linkLabel, { color: colors.mutedForeground }]}>
          New to 333 Lives?{" "}
        </Text>
        <Link href="/(auth)/sign-up">
          <Text style={[styles.link, { color: colors.primary }]}>Create an account</Text>
        </Link>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 28, maxWidth: 460, width: "100%", alignSelf: "center" },
  brand: { fontFamily: fonts.serifBold, fontSize: 18, letterSpacing: 1, marginBottom: 20 },
  title: { fontFamily: fonts.serifBold, fontSize: 32, marginBottom: 6 },
  subtitle: { fontFamily: fonts.sub, fontSize: 15, marginBottom: 28 },
  ssoButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  ssoButtonText: { fontFamily: fonts.subSemibold, fontSize: 15 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 22 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontFamily: fonts.sub, fontSize: 13 },
  label: {
    fontFamily: fonts.sub,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: fonts.body,
    fontSize: 15,
    marginBottom: 14,
  },
  error: { fontFamily: fonts.body, fontSize: 13, marginBottom: 10 },
  button: {
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontFamily: fonts.subSemibold, fontSize: 16 },
  pressed: { opacity: 0.85 },
  linkRow: { flexDirection: "row", justifyContent: "center", marginTop: 26 },
  linkLabel: { fontFamily: fonts.body, fontSize: 14 },
  link: { fontFamily: fonts.bodySemibold, fontSize: 14 },
});
