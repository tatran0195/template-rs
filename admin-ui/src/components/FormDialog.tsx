import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";

/** Standard create/edit modal used by the simple resource pages. */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  loading,
  wide,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit: () => void;
  loading?: boolean;
  wide?: boolean;
}) {
  const { t } = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className={wide ? "max-w-2xl" : undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="flex flex-col gap-4"
        >
          {children}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
