import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  value,
  onValueChange,
  className,
}: {
  tabs: Array<{ value: string; label: string }>;
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div data-slot="tabs" className={cn("inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onValueChange(tab.value)}
          data-state={value === tab.value ? "active" : "inactive"}
          className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all",
            "focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
            value === tab.value && "bg-background text-foreground shadow",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
