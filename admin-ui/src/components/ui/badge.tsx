import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline" | "destructive" | "success" | "warning" | "info";
}

const variants: Record<string, string> = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  outline: "border border-border text-foreground",
  destructive: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

/** Status → color mapping used across list pages (matches the recovered dashboard badges). */
export function StatusBadge({ status }: { status?: string }) {
  const s = (status ?? "").toLowerCase();
  const variant =
    s === "published" || s === "active" || s === "approved" || s === "enabled" || s === "success" || s === "completed"
      ? "success"
      : s === "draft" || s === "pending" || s === "paused"
        ? "warning"
        : s === "archived" || s === "disabled" || s === "inactive" || s === "cancelled"
          ? "secondary"
          : s === "spam" || s === "failed" || s === "error"
            ? "destructive"
            : "info";
  return <Badge variant={variant as BadgeProps["variant"]}>{status ?? "—"}</Badge>;
}
