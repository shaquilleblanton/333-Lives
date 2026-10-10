import { useAuth, useSignUp, useSSO } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import { type Href, Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
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
import { WEB_URLS } from "@/constants/links";
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
  const [ssoLoading, setSsoLoading] = useState(false);
  const [ageAffirmed, setAgeAffirmed] = useState(false);
  const [underMinimumAge, setUnderMinimumAge] = useState(false);

  const handleSubmit = async () => {
    if (!ageAffirmed || underMinimumAge) return;
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
    if (!ageAffirmed || underMinimumAge || ssoLoading) return;
    setSsoLoading(true);
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
    } finally {
      setSsoLoading(false);
    }
  }, [startSSOFlow, router, ssoLoading, ageAffirmed, underMinimumAge]);

  const busy = fetchStatus === "fetching";

  // After sign-up completes, show a spinner while Expo Router fires the redirect.
  // Returning null here caused a blank screen if navigation was delayed.
  if (signUp.status === "complete" || isSignedIn) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const awaitingCode =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  if (awaitingCode) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 40 },
        ]}
      >
        <Image
          source={require("@/assets/logo-mark.png")}
          style={styles.logoImg}
          resizeMode="contain"
        />
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
          <Text style={[styles.error, { color: colors.destructive }]}>{errors.fields.code.message}</Text>
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
      </KeyboardAvoidingView>
    );
  }

  const canCreateAccount = ageAffirmed && !underMinimumAge;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 40 },
      ]}
    >
      <Image
        source={require("@/assets/logo-mark.png")}
        style={styles.logoImg}
        resizeMode="contain"
      />
      <Text style={[styles.title, { color: colors.foreground }]}>Begin your legacy</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Create your 333 Lives account
      </Text>

      <View style={[styles.ageGate, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable
          testID="age-affirmation"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: ageAffirmed }}
          style={styles.ageCheckboxRow}
          disabled={underMinimumAge}
          onPress={() => {
            setAgeAffirmed((affirmed) => !affirmed);
          }}
        >
          <View
            style={[
              styles.checkbox,
              { borderColor: ageAffirmed ? colors.primary : colors.mutedForeground },
              ageAffirmed && { backgroundColor: colors.primary },
            ]}
          >
            {ageAffirmed && <Text style={[styles.checkmark, { color: colors.primaryForeground }]}>✓</Text>}
          </View>
          <Text style={[styles.ageText, { color: colors.foreground }]}>
            I confirm I am at least 13 years old, or at least 16 if I live in the European Economic Area (EEA).
          </Text>
        </Pressable>
        <Pressable
          testID="under-minimum-age"
          accessibilityRole="button"
          style={({ pressed }) => [styles.underageButton, pressed && styles.pressed]}
          onPress={() => {
            setAgeAffirmed(false);
            setUnderMinimumAge(true);
          }}
        >
          <Text style={[styles.link, { color: colors.primary }]}>I am under the minimum age</Text>
        </Pressable>
        <Text testID="terms-agreement" style={[styles.ageText, { color: colors.mutedForeground, marginTop: 8 }]}>
          By creating an account, you agree to our{" "}
          <Text
            style={{ color: colors.primary, textDecorationLine: "underline" }}
            onPress={() => void WebBrowser.openBrowserAsync(WEB_URLS.terms)}
          >
            Terms of Service
          </Text>{" "}
          and{" "}
          <Text
            style={{ color: colors.primary, textDecorationLine: "underline" }}
            onPress={() => void WebBrowser.openBrowserAsync(WEB_URLS.privacy)}
          >
            Privacy Policy
          </Text>
          . 333 Lives has zero tolerance for abusive or objectionable content or users.
        </Text>
        {underMinimumAge && (
          <View>
            <Text testID="underage-message" style={[styles.error, { color: colors.destructive }]}>
              You can’t create an account because you don’t meet the minimum age requirement. If you already have an account, you can sign in.
            </Text>
            <Link href="/(auth)/sign-in" testID="underage-sign-in-link">
              <Text style={[styles.link, { color: colors.primary }]}>Go to sign in</Text>
            </Link>
          </View>
        )}
      </View>

      <Pressable
        testID="signup-google"
        style={({ pressed }) => [
          styles.ssoButton,
          { backgroundColor: colors.card, borderColor: colors.border },
          (ssoLoading || !canCreateAccount) && styles.buttonDisabled,
          pressed && styles.pressed,
        ]}
        onPress={handleGoogle}
        disabled={ssoLoading || busy || !canCreateAccount}
      >
        {ssoLoading ? (
          <ActivityIndicator color={colors.foreground} size="small" />
        ) : (
          <Text style={[styles.ssoButtonText, { color: colors.foreground }]}>
            Continue with Google
          </Text>
        )}
      </Pressable>
      {ssoError && <Text style={[styles.error, { color: colors.destructive }]}>{ssoError}</Text>}

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
        <Text style={[styles.error, { color: colors.destructive }]}>
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
        <Text style={[styles.error, { color: colors.destructive }]}>
          {errors.fields.password.message}
        </Text>
      )}
      {errors.global && errors.global.length > 0 && (
        <Text style={[styles.error, { color: colors.destructive }]}>{errors.global[0].message}</Text>
      )}

      <Pressable
        testID="signup-email-submit"
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.primary },
          (!emailAddress || !password || busy || !canCreateAccount) && styles.buttonDisabled,
          pressed && styles.pressed,
        ]}
        onPress={handleSubmit}
        disabled={!emailAddress || !password || busy || !canCreateAccount}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 28, maxWidth: 460, width: "100%", alignSelf: "center" },
  brand: { fontFamily: fonts.serifBold, fontSize: 18, letterSpacing: 1, marginBottom: 20 },
  logoImg: { width: 160, height: 160, alignSelf: "center", marginBottom: 12 },
  title: { fontFamily: fonts.serifBold, fontSize: 32, marginBottom: 6 },
  subtitle: { fontFamily: fonts.sub, fontSize: 15, marginBottom: 28 },
  ageGate: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 18 },
  ageCheckboxRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  checkbox: { width: 22, height: 22, borderWidth: 1, borderRadius: 5, alignItems: "center", justifyContent: "center" },
  checkmark: { fontFamily: fonts.subSemibold, fontSize: 15, lineHeight: 19 },
  ageText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  underageButton: { alignSelf: "flex-start", marginTop: 12 },
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
