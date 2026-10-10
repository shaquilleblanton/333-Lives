import { useEffect, useState } from "react";
import { AppState } from "react-native";

/** Keep greetings and daily cache keys current after midnight or app resume. */
export function useLocalNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const interval = setInterval(refresh, 60_000);
    // Native timers are numeric; Node-based test timers should not keep Jest alive.
    (interval as unknown as { unref?: () => void }).unref?.();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);
  return now;
}
