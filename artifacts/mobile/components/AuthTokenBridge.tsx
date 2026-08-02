import { useAuth } from "@clerk/expo";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useEffect } from "react";

/**
 * Keeps the API client's auth token getter in sync with Clerk's session for
 * the entire lifetime of the app. Mounted inside ClerkLoaded so getToken is
 * always available; never unmounts during normal navigation so there's no
 * window where the getter is null while React Query retries in the background.
 */
export function AuthTokenBridge() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      setAuthTokenGetter(getToken);
    } else {
      setAuthTokenGetter(null);
    }
  }, [isSignedIn, getToken]);

  return null;
}
