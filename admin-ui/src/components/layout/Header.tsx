import { useNavigate } from "react-router-dom";
import { Menu, Moon, Sun, Search, User as UserIcon, LogOut, Globe } from "lucide-react";
import { useState } from "react";
import { Breadcrumbs } from "./Breadcrumbs";
import { NotificationsBell } from "./NotificationsBell";
import { TenantSwitcher } from "./TenantSwitcher";
import { Dropdown } from "@/components/ui/dropdown";
import { Select } from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth";
import { useLocaleStore, LOCALES, type Locale } from "@/stores/locale";
import { useT } from "@/i18n";
import { toggleTheme, getTheme } from "@/lib/theme";
import { api } from "@/lib/api/resources";

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { t, locale } = useT();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const setLocale = useLocaleStore((s) => s.setLocale);
  const [, force] = useState(0);

  const doLogout = async () => {
    await api.auth.logout();
    logout();
    navigate("/auth/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur">
      <button
        className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent md:hidden"
        onClick={onMenuClick}
      >
        <Menu className="size-5" />
      </button>

      <div className="hidden md:block">
        <Breadcrumbs />
      </div>

      <div className="flex-1" />

      <button
        onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
        className="hidden h-8 items-center gap-2 rounded-md border border-border bg-muted/50 px-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent sm:flex"
      >
        <Search className="size-3.5" />
        <span className="hidden lg:inline">{t("command.search")}</span>
        <kbd className="rounded border border-border bg-background px-1 text-[10px]">⌘K</kbd>
      </button>

      <TenantSwitcher />
      <NotificationsBell />

      <div className="flex items-center gap-1 text-muted-foreground">
        <Globe className="size-4" />
        <Select
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          className="h-8 w-auto border-none bg-transparent shadow-none"
          aria-label="Language"
        >
          {LOCALES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </Select>
      </div>

      <button
        onClick={() => {
          toggleTheme();
          force((v) => v + 1);
        }}
        className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Toggle theme"
      >
        {getTheme() === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>

      <Dropdown
        trigger={
          <button className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
            {(user?.username ?? user?.email ?? "U").slice(0, 1).toUpperCase()}
          </button>
        }
        items={[
          {
            label: `${user?.username ?? ""} ${user?.role ? `(${user.role})` : ""}`.trim(),
            icon: <UserIcon />,
            onClick: () => navigate("/profile"),
          },
          { label: t("layout.profile"), icon: <UserIcon />, onClick: () => navigate("/profile") },
          { label: "", divider: true },
          { label: t("layout.logout"), icon: <LogOut />, onClick: doLogout, danger: true },
        ]}
      />
    </header>
  );
}
