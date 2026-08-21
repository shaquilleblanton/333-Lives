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
      // Privacy: mask all text and block all media so journals, Vault content,
      // family data, and voice recordings never appear in replay recordings.
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
        maskAllInputs: true,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.02, // 2 % of sessions in background
    replaysOnErrorSampleRate: 1.0,  // 100 % of sessions that hit an error
    environment: import.meta.env.MODE,
    // Never attach user-generated text content to error reports.
    beforeSend(event) {
      // Breadcrumbs can include route and interaction data. Replays already
      // mask visual content; omitting breadcrumbs keeps error events private.
      event.breadcrumbs = undefined;
      return event;
    },
  });
}

createRoot(document.getElementById("root")!).render(<App />);
