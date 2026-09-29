import { describe, expect, it } from "vitest";
import {
  FAMILY_INVITE_TTL_MS,
  INVALID_INVITE_ATTEMPT_LIMIT,
  INVALID_INVITE_WINDOW_MS,
  getFamilyInviteExpiry,
  isFamilyInviteExpired,
  isInvalidInviteAttemptThrottled,
} from "./familyInviteLifecycle";

describe("family invite lifecycle", () => {
  const createdAt = new Date("2025-01-01T12:00:00.000Z");

  it("sets an invite expiry exactly seven days after creation", () => {
    const expiresAt = getFamilyInviteExpiry(createdAt, null);
    expect(expiresAt.getTime() - createdAt.getTime()).toBe(FAMILY_INVITE_TTL_MS);
    expect(expiresAt.toISOString()).toBe("2025-01-08T12:00:00.000Z");
  });

  it("honors stored expiry and expires an invite at the expiry instant", () => {
    const expiresAt = new Date("2025-01-03T00:00:00.000Z");
    expect(isFamilyInviteExpired(createdAt, expiresAt, new Date("2025-01-02T23:59:59.999Z"))).toBe(false);
    expect(isFamilyInviteExpired(createdAt, expiresAt, expiresAt)).toBe(true);
  });

  it("applies the seven-day expiry fallback to legacy invites", () => {
    const legacyExpiry = new Date(createdAt.getTime() + FAMILY_INVITE_TTL_MS);
    expect(isFamilyInviteExpired(createdAt, null, new Date(legacyExpiry.getTime() - 1))).toBe(false);
    expect(isFamilyInviteExpired(createdAt, null, legacyExpiry)).toBe(true);
  });

  it("applies the invalid-token attempt limit", () => {
    expect(isInvalidInviteAttemptThrottled(INVALID_INVITE_ATTEMPT_LIMIT - 1)).toBe(false);
    expect(isInvalidInviteAttemptThrottled(INVALID_INVITE_ATTEMPT_LIMIT)).toBe(true);
    expect(isInvalidInviteAttemptThrottled(INVALID_INVITE_ATTEMPT_LIMIT + 1)).toBe(true);
  });

  it("allows another attempt after the throttle window expires", () => {
    const windowStartedAt = new Date("2025-01-01T12:00:00.000Z");
    expect(isInvalidInviteAttemptThrottled(
      INVALID_INVITE_ATTEMPT_LIMIT,
      windowStartedAt,
      new Date(windowStartedAt.getTime() + INVALID_INVITE_WINDOW_MS - 1),
    )).toBe(true);
    expect(isInvalidInviteAttemptThrottled(
      INVALID_INVITE_ATTEMPT_LIMIT,
      windowStartedAt,
      new Date(windowStartedAt.getTime() + INVALID_INVITE_WINDOW_MS),
    )).toBe(false);
  });
});