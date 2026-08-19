import * as Sentry from "@sentry/node";

const sentryDsn = process.env.SENTRY_DSN;
const hasValidSentryDsn =
  typeof sentryDsn === "string" &&
  /^https?:\/\/[^@]+@[^/]+\/\d+/.test(sentryDsn);

// Crash reporting is disabled when the DSN is absent or malformed. This keeps
// the API available while configuration is being corrected.
Sentry.init({
  dsn: sentryDsn,
  enabled: hasValidSentryDsn,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV ?? "development",
});

import app from "./app";
import { logger } from "./lib/logger";
import { purgeCloudflareCache } from "./lib/cloudflareCachePurge";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Purge Cloudflare cache on every production startup so users always see
  // the latest marketing pages immediately after a deployment.
  if (process.env.NODE_ENV === "production") {
    purgeCloudflareCache()
      .then(() => {
        logger.info("Cloudflare cache purged successfully");
      })
      .catch((purgeErr: unknown) => {
        // Log but never crash the server — a cache purge failure is
        // recoverable (pages just stay cached a bit longer).
        logger.error({ err: purgeErr }, "Cloudflare cache purge failed");
      });
  }
});
