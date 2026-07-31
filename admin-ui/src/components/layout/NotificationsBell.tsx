import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { useT } from "@/i18n";
import { formatDate } from "@/lib/utils";
import type { AuditEntry, Paginated } from "@/lib/api/types";

const LAST_SEEN_KEY = "notifications_last_seen";

/**
 * Faithful replica of the recovered notification bell: there is no notifications
 * API — it polls the audit log every 15s and diffs against a localStorage timestamp.
 */
export function NotificationsBell() {
  const { t } = useT();
  const { isAdmin } = useAuthStore();
  const [open, setOpen] = useState(false);
  const lastSeen = useRef(localStorage.getItem(LAST_SEEN_KEY));
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      try {
        const token = useAuthStore.getState().accessToken;
        const res = await fetch("/api/v1/admin/audit?page=1&page_size=20", {
          headers: { Authorization: `Bearer ${token}` },
        });
        return res.ok ? ((await res.json()).data as Paginated<AuditEntry>) : null;
      } catch {
        return null;
      }
    },
    enabled: isAdmin(),
    refetchInterval: isAdmin() ? 15000 : false,
    retry: false,
  });

  const items = data?.items ?? [];
  const unread = lastSeen.current
    ? items.filter((i) => (i.created_at ?? "") > lastSeen.current!).length
    : items.length > 0
      ? 1
      : 0;

  useEffect(() => {
    if (open && items.length > 0) {
      const newest = items[0].created_at ?? "";
      lastSeen.current = newest;
      localStorage.setItem(LAST_SEEN_KEY, newest);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!isAdmin()) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label={t("notifications.title")}
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-red-500" />
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-80 overflow-hidden rounded-md border border-border bg-popover shadow-md">
            <div className="border-b border-border px-3 py-2 text-sm font-medium">{t("notifications.title")}</div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("notifications.empty")}</p>
              ) : (
                items.slice(0, 20).map((entry) => (
                  <div key={String(entry.id)} className="border-b border-border/50 px-3 py-2 text-sm last:border-0">
                    <div className="font-medium">{entry.action}</div>
                    <div className="text-xs text-muted-foreground">
                      {entry.actor ?? entry.user_id ?? "system"} · {formatDate(entry.created_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
