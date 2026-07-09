import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  Clock, 
  Lock, 
  Sprout, 
  CalendarDays, 
  User,
  Heart,
  Users,
  Calendar,
  Mail,
  Dumbbell,
  ListChecks,
  ShoppingBag,
  MoreHorizontal,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo333 } from "@/components/logo";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/future", label: "Future", icon: Clock },
  { href: "/vault", label: "Vault", icon: Lock },
  { href: "/growth", label: "Growth", icon: Sprout },
  { href: "/gratitude", label: "Gratitude", icon: Heart },
  { href: "/people", label: "People", icon: Users },
  { href: "/legacy-letters", label: "Legacy Letters", icon: Mail },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/community", label: "Community", icon: Calendar },
  { href: "/calendar", label: "My Calendar", icon: CalendarDays },
  { href: "/profile", label: "Profile", icon: User },
];

// The few destinations that live directly in the mobile bottom bar; the rest
// are reachable through the "More" drawer to avoid a cramped, unreadable nav.
const MOBILE_PRIMARY = ["/", "/tasks", "/growth", "/people"];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryItems = MOBILE_PRIMARY
    .map((href) => NAV_ITEMS.find((i) => i.href === href))
    .filter((i): i is (typeof NAV_ITEMS)[number] => Boolean(i));
  const isPrimary = (href: string) => MOBILE_PRIMARY.includes(href);
  const moreActive = !isPrimary(location) && location !== "/";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card p-6 gap-8">
        <div className="flex items-center gap-3 px-2">
          <Logo333 size="sm" />
          <span className="font-serif text-xl tracking-wide text-foreground">333 Lives</span>
        </div>
        
        <nav className="flex-1 flex flex-col gap-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-300 font-subheading text-sm",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0 overflow-y-auto">
        {children}
      </main>

      {/* Mobile "More" drawer */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm animate-in fade-in duration-200" />
          <div
            className="relative bg-card border-t border-border rounded-t-2xl p-5 pb-24 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-serif text-lg text-foreground">All Sections</span>
              <button onClick={() => setMoreOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {NAV_ITEMS.filter((i) => !isPrimary(i.href)).map((item) => {
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 rounded-xl border p-4 transition-colors text-center",
                      isActive ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-background/40 text-muted-foreground"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-[11px] font-subheading leading-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-card/95 backdrop-blur-md z-50 flex items-center justify-around px-2">
        {primaryItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-full h-full transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-subheading">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-full h-full transition-colors",
            moreActive ? "text-primary" : "text-muted-foreground"
          )}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-subheading">More</span>
        </button>
      </nav>
    </div>
  );
}
