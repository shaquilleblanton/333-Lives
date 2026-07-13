import { useEffect, useRef } from "react";
import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, Show, useClerk } from "@clerk/react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { ThemeProvider } from "@/contexts/theme-context";
import { RecorderProvider } from "@/contexts/recorder-context";
import {
  basePath,
  clerkAppearance,
  clerkLocalization,
  clerkProxyUrl,
  clerkPubKey,
  stripBase,
} from "@/lib/clerk";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/landing";
import { SignInPage, SignUpPage } from "@/pages/auth";
import Home from "@/pages/home";
import Future from "@/pages/future";
import Vault from "@/pages/vault";
import Growth from "@/pages/growth";
import Calendar from "@/pages/calendar";
import Profile from "@/pages/profile";
import Gratitude from "@/pages/gratitude";
import People from "@/pages/people";
import Community from "@/pages/community";
import LegacyLetters from "@/pages/legacy-letters";
import Workouts from "@/pages/workouts";
import Tasks from "@/pages/tasks";
import Shop from "@/pages/shop";
import Memos from "@/pages/memos";
import Feedback from "@/pages/feedback";
import FamilyTree from "@/pages/family-tree";
import TellYourStory from "@/pages/tell-your-story";
import Timeline from "@/pages/timeline";
import Pulse from "@/pages/pulse";
import Memories from "@/pages/memories";
import Review from "@/pages/review";

const queryClient = new QueryClient();

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const APP_ROUTES: Array<{ path: string; component: React.ComponentType }> = [
  { path: "/future", component: Future },
  { path: "/vault", component: Vault },
  { path: "/growth", component: Growth },
  { path: "/calendar", component: Calendar },
  { path: "/profile", component: Profile },
  { path: "/gratitude", component: Gratitude },
  { path: "/people", component: People },
  { path: "/community", component: Community },
  { path: "/legacy-letters", component: LegacyLetters },
  { path: "/workouts", component: Workouts },
  { path: "/tasks", component: Tasks },
  { path: "/shop", component: Shop },
  { path: "/memos", component: Memos },
  { path: "/feedback", component: Feedback },
  { path: "/family-tree", component: FamilyTree },
  { path: "/story", component: TellYourStory },
  { path: "/timeline", component: Timeline },
  { path: "/pulse", component: Pulse },
  { path: "/memories", component: Memories },
  { path: "/review", component: Review },
];

// Signed-in users land straight in the app; signed-out visitors get the
// public landing page (never an auto-redirect to sign-in).
function HomeGate() {
  return (
    <>
      <Show when="signed-in">
        <RecorderProvider>
          <Layout>
            <Home />
          </Layout>
        </RecorderProvider>
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function ProtectedPage({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <RecorderProvider>
          <Layout>
            <Component />
          </Layout>
        </RecorderProvider>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

// Clears the query cache when the signed-in user changes so no data leaks
// between accounts in the same browser tab.
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeGate} />
      {/* REQUIRED — "/sign-in/*?" and "/sign-up/*?" verbatim so Clerk's OAuth
          sub-paths (sso-callback, factor-one) match too. */}
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      {APP_ROUTES.map(({ path, component }) => (
        <Route key={path} path={path}>
          <ProtectedPage component={component} />
        </Route>
      ))}
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={clerkLocalization}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
    </ThemeProvider>
  );
}

export default App;
