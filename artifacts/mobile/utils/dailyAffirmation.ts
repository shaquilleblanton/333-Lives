import AsyncStorage from "@react-native-async-storage/async-storage";

export const FALLBACK_AFFIRMATIONS = [
  "Small, steady steps are still steps. Today counts.",
  "You are allowed to grow at your own pace.",
  "The life you are building is made of days exactly like this one.",
  "You have handled hard things before. You can handle today.",
  "What you give attention to grows. Choose with care.",
  "Your story is still being written, and today is a good page.",
  "Showing up is the quiet kind of courage.",
] as const;

/** YYYY-MM-DD in the device's local timezone. */
export function localDayKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function cacheKey(userId: string, day: string): string {
  return `daily-affirmation:${userId}:${day}`;
}

/** Deterministic offline fallback for a given local day. */
export function fallbackAffirmation(day: string): string {
  let h = 0;
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0;
  return FALLBACK_AFFIRMATIONS[h % FALLBACK_AFFIRMATIONS.length];
}

export async function readCachedAffirmation(userId: string, day: string): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(cacheKey(userId, day));
    return v && v.trim().length > 0 ? v : null;
  } catch {
    return null;
  }
}

export async function writeCachedAffirmation(userId: string, day: string, text: string): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(userId, day), text);
  } catch {
    // Non-fatal: the affirmation still shows for this session.
  }
}

// Deduplicate remounts while a generation is still running.
const pending = new Map<string, Promise<string>>();

export function getDailyAffirmation(
  userId: string,
  day: string,
  generate: () => Promise<{ text?: string }>,
): Promise<string> {
  const key = cacheKey(userId, day);
  const existing = pending.get(key);
  if (existing) return existing;
  const request = (async () => {
    const cached = await readCachedAffirmation(userId, day);
    if (cached) return cached;
    let text = fallbackAffirmation(day);
    try {
      const result = await generate();
      text = result?.text?.trim() || text;
    } catch {
      // Cache the fallback too, so returning offline doesn't retry AI all day.
    }
    await writeCachedAffirmation(userId, day, text);
    return text;
  })().finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}
