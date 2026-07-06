import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { ThemeProvider } from "@/contexts/theme-context";
import NotFound from "@/pages/not-found";

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

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/future" component={Future} />
        <Route path="/vault" component={Vault} />
        <Route path="/growth" component={Growth} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/profile" component={Profile} />
        <Route path="/gratitude" component={Gratitude} />
        <Route path="/people" component={People} />
        <Route path="/community" component={Community} />
        <Route path="/legacy-letters" component={LegacyLetters} />
        <Route path="/workouts" component={Workouts} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
