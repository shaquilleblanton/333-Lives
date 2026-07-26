/**
 * HTTP-aware parameter parsing helpers.
 *
 * Throwing an HttpError from a route handler causes the globalErrorHandler
 * middleware to return a well-formed JSON error response with the correct
 * status code instead of an Express HTML error page.
 */

export class HttpError extends Error {
  readonly name = "HttpError";

  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Parse a URL path parameter as a positive integer.
 *
 * Throws HttpError(400) when the value is missing, non-numeric, non-integer,
 * or ≤ 0 — so a NaN or float param never silently reaches the database.
 *
 * @param value  The raw string from req.params
 * @param name   Parameter name used in the error message (default "id")
 */
export function parseIntParam(value: string | string[] | undefined, name = "id"): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new HttpError(400, `Invalid parameter: "${name}" must be a positive integer`);
  }
  return n;
}
