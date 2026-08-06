import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import { Moon, Sun } from "lucide-react";
import { useT } from "@/i18n";
import { NAV } from "./nav";
import { toggleTheme, getTheme } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth";

/** ⌘K command palette (cmdk) — navigation + actions, as recovered. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useT();
  const { isAdmin } = useAuthStore();
  const [, force] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  const items = NAV.flatMap((g) =>
    g.items
      .filter((i) => {
        if (i.adminOnly) return isAdmin();
        return true;
      })
      .map((i) => ({ to: i.to, label: t(i.labelKey) })),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div className="absolute inset-0 bg-black/40" />
      <Command
        className="relative z-10 w-full max-w-md overflow-hidden rounded-lg border border-border bg-popover shadow-xl"
        onClick={(e) => e.stopPropagation()}
        label={t("command.search")}
      >
        <div className="flex items-center border-b border-border px-3">
          <Command.Input
            autoFocus
            placeholder={t("command.placeholder")}
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>
        <Command.List className="max-h-72 overflow-y-auto p-1">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            {t("command.noResults")}
          </Command.Empty>
          <Command.Group
            heading={t("command.navigation")}
            className="text-xs text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
          >
            {items.map((item) => (
              <Command.Item
                key={item.to}
                value={item.label}
                onSelect={() => {
                  setOpen(false);
                  navigate(item.to);
                }}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground aria-selected:bg-accent"
              >
                {item.label}
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group
            heading={t("command.actions")}
            className="text-xs text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
          >
            <Command.Item
              value="theme"
              onSelect={() => {
                toggleTheme();
                force((v) => v + 1);
                setOpen(false);
              }}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground aria-selected:bg-accent"
            >
              {getTheme() === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
              {getTheme() === "dark"
                ? t("command.switchToLight")
                : t("command.switchToDark")}
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
