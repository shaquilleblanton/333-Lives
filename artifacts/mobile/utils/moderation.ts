import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

/**
 * Per-device moderation state for Pulse: people the user blocked and posts the
 * user reported (reported posts are hidden for the reporter immediately).
 * Reports themselves are filed server-side through the Feedback queue.
 */
const BLOCKED_KEY = "pulse.blockedUserIds.v1";
const HIDDEN_KEY = "pulse.hiddenPostIds.v1";

type State = { blocked: number[]; hidden: number[] };

let cache: State | null = null;
const listeners = new Set<(s: State) => void>();

async function load(): Promise<State> {
  if (cache) return cache;
  try {
    const [b, h] = await Promise.all([
      AsyncStorage.getItem(BLOCKED_KEY),
      AsyncStorage.getItem(HIDDEN_KEY),
    ]);
    cache = {
      blocked: b ? (JSON.parse(b) as number[]) : [],
      hidden: h ? (JSON.parse(h) as number[]) : [],
    };
  } catch {
    cache = { blocked: [], hidden: [] };
  }
  return cache;
}

async function save(next: State) {
  cache = next;
  listeners.forEach((l) => l(next));
  try {
    await Promise.all([
      AsyncStorage.setItem(BLOCKED_KEY, JSON.stringify(next.blocked)),
      AsyncStorage.setItem(HIDDEN_KEY, JSON.stringify(next.hidden)),
    ]);
  } catch {
    // best effort; in-memory state still applies for this session
  }
}

export function usePulseModeration() {
  const [state, setState] = useState<State>(cache ?? { blocked: [], hidden: [] });

  useEffect(() => {
    let alive = true;
    load().then((s) => alive && setState(s));
    listeners.add(setState);
    return () => {
      alive = false;
      listeners.delete(setState);
    };
  }, []);

  const blockUser = useCallback(async (userId: number) => {
    const s = await load();
    if (s.blocked.includes(userId)) return;
    await save({ ...s, blocked: [...s.blocked, userId] });
  }, []);

  const unblockAll = useCallback(async () => {
    const s = await load();
    await save({ ...s, blocked: [] });
  }, []);

  const hidePost = useCallback(async (postId: number) => {
    const s = await load();
    if (s.hidden.includes(postId)) return;
    await save({ ...s, hidden: [...s.hidden, postId] });
  }, []);

  return {
    blockedUserIds: state.blocked,
    hiddenPostIds: state.hidden,
    blockUser,
    unblockAll,
    hidePost,
  };
}
