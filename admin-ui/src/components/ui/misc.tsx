import type { HTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";
import { Button } from "./button";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="skeleton" className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

/** Exact replica of the recovered lazy-route fallback spinner. */
export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("size-6 animate-spin rounded-full border-2 border-muted border-t-transparent", className)} />
  );
}

export function PageLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner />
    </div>
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      data-slot="label"
      className={cn("text-sm font-medium leading-none text-foreground", className)}
      {...props}
    />
  );
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
}: {
  checked: boolean;
  onCheckedChange?: (v: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      data-slot="switch"
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent shadow-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input dark:bg-input/50",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-background shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function Checkbox({
  checked,
  onCheckedChange,
  className,
}: {
  checked: boolean;
  onCheckedChange?: (v: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      data-slot="checkbox"
      onClick={(e) => {
        e.stopPropagation();
        onCheckedChange?.(!checked);
      }}
      className={cn(
        "flex size-4 items-center justify-center rounded border border-input shadow-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        checked && "border-primary bg-primary text-primary-foreground",
        className,
      )}
    >
      {checked && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="size-3">
          <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
      {icon && <div className="text-muted-foreground [&_svg]:size-8">{icon}</div>}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useT();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>{t("common.total", { total })}</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          {t("common.previous")}
        </Button>
        <span className="whitespace-nowrap">{t("common.pageOf", { page, total: totalPages })}</span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          {t("common.next")}
        </Button>
      </div>
    </div>
  );
}
