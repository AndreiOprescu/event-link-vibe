import { Link, useLocation } from "@tanstack/react-router";
import { Home, User, Calendar, LogOut } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const nav = [
    { to: "/app", label: "Events", icon: Calendar },
    { to: "/app/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link to="/app" className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
            <span className="inline-block h-2 w-2 rounded-full bg-lime pulse-lime" />
            EventLabs<span className="text-muted-foreground">*</span>
          </Link>
          <nav className="flex items-center gap-1">
            {nav.map((n) => {
              const active = loc.pathname === n.to || (n.to !== "/app" && loc.pathname.startsWith(n.to));
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    active ? "bg-lime text-primary-foreground" : "text-muted-foreground hover:bg-surface hover:text-foreground"
                  }`}
                >
                  <n.icon className="h-3.5 w-3.5" />
                  {n.label}
                </Link>
              );
            })}
            <Link
              to="/login"
              className="ml-2 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
