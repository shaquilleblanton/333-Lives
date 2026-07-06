import { Link, useLocation } from "wouter";
import { 
  Home, 
  Clock, 
  Lock, 
  Sprout, 
  CalendarDays, 
  User,
  LogOut,
  Heart,
  Users,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo333 } from "@/components/logo";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/future", label: "Future", icon: Clock },
  { href: "/vault", label: "Vault", icon: Lock },
  { href: "/growth", label: "Growth", icon: Sprout },
  { href: "/gratitude", label: "Gratitude", icon: Heart },
  { href: "/people", label: "People", icon: Users },
  { href: "/community", label: "Community", icon: Calendar },
  { href: "/calendar", label: "My Calendar", icon: CalendarDays },
  { href: "/profile", label: "Profile", icon: User },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

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
        
        <div className="pt-6 border-t border-border mt-auto">
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-muted-foreground hover:text-foreground w-full text-sm font-subheading">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0 overflow-y-auto">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-card/95 backdrop-blur-md z-50 flex items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
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
      </nav>
    </div>
  );
}
