import { useEffect, type HTMLAttributes, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-slot="dialog">
      <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      {children}
    </div>
  );
}

export function DialogContent({
  className,
  children,
  onClose,
  ...props
}: HTMLAttributes<HTMLDivElement> & { onClose?: () => void }) {
  return (
    <div
      data-slot="dialog-content"
      className={cn(
        "relative z-10 w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-lg max-h-[85vh] overflow-y-auto",
        className,
      )}
      {...props}
    >
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm text-muted-foreground opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="size-4" />
        </button>
      )}
      {children}
    </div>
  );
}

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex flex-col gap-1.5", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold leading-none", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-6 flex justify-end gap-2", className)} {...props} />;
}
