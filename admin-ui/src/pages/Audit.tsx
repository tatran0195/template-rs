import { useState } from "react";
import { Eye } from "lucide-react";
import { api } from "@/lib/api/resources";
import type { AuditEntry } from "@/lib/api/types";
import { useT } from "@/i18n";
import { formatDate } from "@/lib/utils";
import { ResourceList } from "@/components/ResourceList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Read-only audit trail (also doubles as the "notifications" source). */
export function Audit() {
  const { t } = useT();
  const [detail, setDetail] = useState<AuditEntry | null>(null);

  return (
    <>
      <ResourceList<AuditEntry>
        title={t("audit.title")}
        queryKey="audit"
        fetchPage={(page, size, search) => api.audit.list(page, size, { search })}
        searchPlaceholder={t("common.search")}
        columns={[
          { key: "actor", label: t("audit.actor"), render: (r) => r.actor_id ?? "system" },
          { key: "action", label: t("audit.action"), render: (r) => <Badge variant="secondary">{r.action}</Badge> },
          {
            key: "target",
            label: t("audit.target"),
            render: (r) => (
              <span className="font-mono text-xs text-muted-foreground">
                {r.subject ? `${r.subject}${r.subject_id ? `#${r.subject_id}` : ""}` : "—"}
              </span>
            ),
          },
          { key: "ip", label: t("audit.ip"), render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.ip_address ?? "—"}</span> },
          { key: "created_at", label: t("audit.time"), render: (r) => formatDate(r.created_at) },
        ]}
        rowActions={(row) => (
          <Button variant="ghost" size="icon" onClick={() => setDetail(row)} aria-label={t("common.view")}>
            <Eye />
          </Button>
        )}
      />
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent onClose={() => setDetail(null)} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("common.detail")}</DialogTitle>
          </DialogHeader>
          <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(detail, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
