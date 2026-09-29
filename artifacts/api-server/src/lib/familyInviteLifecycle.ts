export const FAMILY_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const INVALID_INVITE_WINDOW_MS = 15 * 60 * 1000;
export const INVALID_INVITE_ATTEMPT_LIMIT = 10;

export function getFamilyInviteExpiry(createdAt: Date, expiresAt: Date | null | undefined): Date {
  return expiresAt ?? new Date(createdAt.getTime() + FAMILY_INVITE_TTL_MS);
}

export function isFamilyInviteExpired(
  createdAt: Date,
  expiresAt: Date | null | undefined,
  now: Date,
): boolean {
  return getFamilyInviteExpiry(createdAt, expiresAt).getTime() <= now.getTime();
}

export function isInvalidInviteAttemptThrottled(
  attemptCount: number,
  windowStartedAt?: Date,
  now?: Date,
): boolean {
  if (windowStartedAt && now && windowStartedAt.getTime() <= now.getTime() - INVALID_INVITE_WINDOW_MS) {
    return false;
  }
  return attemptCount >= INVALID_INVITE_ATTEMPT_LIMIT;
}