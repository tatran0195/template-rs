import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Styled native select — keeps forms simple and dependable. */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          data-slot="select"
          className={cn(
            "h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 pr-8 text-sm shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50 dark:bg-input/30",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    );
  },
);
