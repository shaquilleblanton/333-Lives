import type { NextFunction, Request, Response } from "express";

import { logger } from "../lib/logger";
import { HttpError } from "../lib/params";

/**
 * Global Express error handler — must be registered last (4-arg signature).
 *
 * Guarantees every unhandled error reaches the client as JSON regardless of
 * what the route threw. Without this, Express falls back to its built-in HTML
 * error page which the mobile JSON client cannot parse.
 */
export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (res.headersSent) return;

  const status = err instanceof HttpError ? err.status : 500;
  const message =
    err instanceof Error ? err.message : "Internal server error";

  if (status >= 500) {
    logger.error(
      { err, method: req.method, url: req.url },
      "Unhandled server error",
    );
  } else {
    logger.warn(
      { err, method: req.method, url: req.url },
      "Client error",
    );
  }

  res.status(status).json({ error: message });
}
