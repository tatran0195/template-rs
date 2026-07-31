import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DropdownItem {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  divider?: boolean;
}

/** Minimal dropdown menu (shadcn-style popover, hand-rolled). */
export function Dropdown({
  trigger,
  items,
  align = "end",
  className,
}: {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div
          data-slot="dropdown-content"
          className={cn(
            "absolute z-50 mt-1 min-w-40 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((item, i) =>
            item.divider ? (
              <div key={i} className="my-1 h-px bg-border" />
            ) : (
              <button
                key={i}
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-4",
                  item.danger && "text-destructive hover:text-destructive",
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
