import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
const hasValidSentryDsn =
  typeof sentryDsn === "string" &&
  /^https?:\/\/[^@]+@[^/]+\/\d+/.test(sentryDsn);

// Crash reporting is deliberately disabled when the DSN is missing or malformed.
// This keeps a configuration mistake from generating a client-side SDK error.
if (hasValidSentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      // Capture a session replay on every error so you can see exactly what
      // the user was doing when it crashed.
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.05, // 5 % of sessions in background
    replaysOnErrorSampleRate: 1.0, // 100 % of sessions that hit an error
    environment: import.meta.env.MODE,
  });
}

createRoot(document.getElementById("root")!).render(<App />);
