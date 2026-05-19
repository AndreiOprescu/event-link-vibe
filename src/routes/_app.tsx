import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/app/AppShell";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, profile, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      nav({ to: "/login" });
      return;
    }
    if (profile && profile.profile_completed === false) {
      nav({ to: "/onboarding" });
    }
  }, [loading, user, profile, nav]);

  if (loading || !user || (profile && profile.profile_completed === false)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        <span className="h-2 w-2 mr-2 rounded-full bg-lime pulse-lime" /> loading…
      </div>
    );
  }
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
