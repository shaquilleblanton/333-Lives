import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Crash reporting — no-ops when VITE_SENTRY_DSN is absent (dev without a DSN).
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    // Capture a session replay on every error so you can see exactly what
    // the user was doing when it crashed.
    Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.05, // 5 % of sessions in background
  replaysOnErrorSampleRate: 1.0,  // 100 % of sessions that hit an error
  environment: import.meta.env.MODE,
});

createRoot(document.getElementById("root")!).render(<App />);
