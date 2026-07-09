import { useAuth, useSignUp, useSSO } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import { type Href, Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
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

import { useWarmUpBrowser } from "./sign-in";

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  useWarmUpBrowser();
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [ssoError, setSsoError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const { error } = await signUp.password({ emailAddress, password });
    if (error) return;
    await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async () => {
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === "complete") {
      await signUp.finalize({
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
      setSsoError("Google sign-up didn't complete. Please try again.");
    }
  }, [startSSOFlow, router]);

  const busy = fetchStatus === "fetching";

  if (signUp.status === "complete" || isSignedIn) {
    return null;
  }

  const awaitingCode =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  if (awaitingCode) {
    return (
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 40 },
        ]}
      >
        <Text style={[styles.brand, { color: colors.primary }]}>333 Lives</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Check your email</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          We sent a verification code to {emailAddress}
        </Text>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Verification code</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
          ]}
          value={code}
          placeholder="Enter your code"
          placeholderTextColor={colors.mutedForeground}
          onChangeText={setCode}
          keyboardType="numeric"
        />
        {errors.fields.code && (
          <Text style={[styles.error, { color: "#E5484D" }]}>{errors.fields.code.message}</Text>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.primary },
            (busy || !code) && styles.buttonDisabled,
            pressed && styles.pressed,
          ]}
          onPress={handleVerify}
          disabled={busy || !code}
        >
          {busy ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Verify</Text>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
          onPress={() => signUp.verifications.sendEmailCode()}
        >
          <Text style={[styles.link, { color: colors.primary }]}>I need a new code</Text>
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    );
  }

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 40 },
      ]}
    >
      <Text style={[styles.brand, { color: colors.primary }]}>333 Lives</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Begin your legacy</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Create your 333 Lives account
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
      {errors.fields.emailAddress && (
        <Text style={[styles.error, { color: "#E5484D" }]}>
          {errors.fields.emailAddress.message}
        </Text>
      )}

      <Text style={[styles.label, { color: colors.mutedForeground }]}>Password</Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
        ]}
        value={password}
        placeholder="Choose a password"
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
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
            Create account
          </Text>
        )}
      </Pressable>

      <View style={styles.linkRow}>
        <Text style={[styles.linkLabel, { color: colors.mutedForeground }]}>
          Already have an account?{" "}
        </Text>
        <Link href="/(auth)/sign-in">
          <Text style={[styles.link, { color: colors.primary }]}>Sign in</Text>
        </Link>
      </View>

      {/* Required for sign-up flows — Clerk's bot protection is enabled by default */}
      <View nativeID="clerk-captcha" />
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
