import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog";
import { Button } from "./button";
import { useT } from "@/i18n";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  onConfirm: () => void;
  loading?: boolean;
}) {
  const { t } = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {confirmText ?? t("common.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
