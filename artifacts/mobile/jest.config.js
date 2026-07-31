/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFiles: ["./jest.setup.ts"],
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  // Extend jest-expo's preset pattern to also allow @workspace/* symlinks
  // and react-native-svg through the Babel transform.
  // We keep .pnpm and all the standard expo/rn exceptions from the preset.
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm/.*node_modules/)?(" +
      "react-native|" +
      "@react-native(-community)?|" +
      "expo(nent)?|" +
      "@expo(nent)?/|" +
      "@expo-google-fonts/|" +
      "react-navigation|" +
      "@react-navigation/|" +
      "@sentry/react-native|" +
      "native-base|" +
      "react-native-svg|" +
      "@workspace/api-client-react" +
      "))",
    "/node_modules/react-native-reanimated/plugin/",
    "/node_modules/@react-native/babel-preset/",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
};
