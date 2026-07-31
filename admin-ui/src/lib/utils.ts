import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(input?: string | number | Date | null): string {
  if (!input) return "—";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  return d.toLocaleString();
}

export function formatBytes(n?: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** drop undefined values from a query object (the recovered SDK's `Qs` helper) */
export function qs<T extends Record<string, unknown>>(obj: T): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}

export function truncate(s: string, n = 60): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
