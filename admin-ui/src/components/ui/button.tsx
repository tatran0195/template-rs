import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary" | "link";
  size?: "sm" | "default" | "lg" | "icon";
}

const variants: Record<string, string> = {
  default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
  outline: "border border-border bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
  secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizes: Record<string, string> = {
  sm: "h-8 rounded-md px-3 text-xs gap-1.5",
  default: "h-9 rounded-md px-4 py-2 gap-2",
  lg: "h-10 rounded-md px-6 gap-2",
  icon: "size-9 rounded-md",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", size = "default", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      data-slot="button"
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
