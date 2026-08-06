import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { PageLoading } from "@/components/ui/misc";

/**
 * Auth guard + first-run detection:
 *  - probes /api/v1/setup/status once; if no admin exists → /setup
 *  - unauthenticated → /auth/login
 *  - reads /api/v1/info to detect multi-tenancy (tenant switcher visibility)
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isLoggedIn = useAuthStore((s) => s.accessToken !== null);

  const setup = useQuery({
    queryKey: ["setup-status"],
    queryFn: async () => {
      const r = await fetch("/api/v1/setup/status");
      const j = await r.json();
      return (j.data ?? j) as { has_admin: boolean };
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const info = useQuery({
    queryKey: ["site-info"],
    queryFn: async () => {
      const r = await fetch("/api/v1/info");
      const j = await r.json();
      return (j.data ?? j) as Record<string, any>;
    },
    enabled: isLoggedIn,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (setup.isLoading) return <PageLoading />;
  if (setup.data && setup.data.has_admin === false) {
    return <Navigate to="/setup" replace />;
  }
  if (!isLoggedIn) {
    return (
      <Navigate to="/auth/login" replace state={{ from: location.pathname }} />
    );
  }
  return <>{children}</>;
}
