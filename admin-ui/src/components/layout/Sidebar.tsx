import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";
import { useAuthStore } from "@/stores/auth";
import { NAV } from "./nav";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useT();
  const { isAdmin } = useAuthStore();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          R
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">{t("layout.brand")}</div>
          <div className="text-[11px] text-muted-foreground">
            {t("layout.adminPanel")}
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {NAV.map((group, gi) => {
          const items = group.items.filter((item) => {
            if (item.adminOnly) return isAdmin() || isAuthorSafe();
            return true;
          });
          if (items.length === 0) return null;
          return (
            <div key={gi}>
              {group.labelKey && (
                <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  {t(group.labelKey)}
                </div>
              )}
              <div className="space-y-0.5">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                        isActive
                          ? "bg-accent font-medium text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                      )
                    }
                  >
                    <item.icon className="size-4 shrink-0" />
                    {t(item.labelKey)}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}

function isAuthorSafe() {
  try {
    return useAuthStore.getState().isAuthor();
  } catch {
    return false;
  }
}
