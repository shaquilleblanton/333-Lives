import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import * as Sentry from "@sentry/node";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import { globalErrorHandler } from "./middlewares/errorHandler";
// asyncHandler (lib/asyncHandler.ts) is available for wrapping async route
// handlers that need explicit error forwarding. Express 5 propagates async
// rejections natively, so the global error handler below covers all routes.

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// The Clerk proxy streams raw bytes — it must be mounted before body parsers.
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));

// Vault file uploads are raw binary (any content-type, including application/json).
// This must be mounted BEFORE express.json() so the JSON body parser never
// consumes an upload stream — once a readable stream is drained it cannot be re-read.
app.use("/api/vault/:id/upload", express.raw({ type: "*/*", limit: "50mb" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Resolve the publishable key from the incoming request host so the same
// server can serve multiple Clerk custom domains. Falls back to
// CLERK_PUBLISHABLE_KEY when the host doesn't map to a custom domain.
app.use(
  clerkMiddleware((req) => ({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  })),
);

// Development-only observability check. It is intentionally unavailable in
// production so no public route can generate artificial production incidents.
if (process.env.NODE_ENV !== "production") {
  app.post("/api/_internal/sentry-verification", async (_req, res) => {
    Sentry.captureException(
      new Error("333 Lives controlled Sentry verification (development only)"),
      {
        tags: {
          source: "api-verification-route",
          test_event: "true",
        },
      },
    );

    await Sentry.flush(2_000);
    res.status(204).end();
  });
}

app.use("/api", router);

// Must be last — catches any error thrown in a route or middleware and
// returns JSON instead of Express's default HTML error page.
app.use(globalErrorHandler);

export default app;
