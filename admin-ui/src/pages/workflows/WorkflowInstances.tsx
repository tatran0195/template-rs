import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollText, Square } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/resources";
import { ApiError } from "@/lib/api/client";
import type { WorkflowInstance } from "@/lib/api/types";
import { useT } from "@/i18n";
import { formatDate } from "@/lib/utils";
import { ResourceList } from "@/components/ResourceList";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageLoading } from "@/components/ui/misc";

export function WorkflowInstances() {
  const { t } = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [logsFor, setLogsFor] = useState<WorkflowInstance | null>(null);

  const cancel = useMutation({
    mutationFn: (id: string | number) => api.workflows.cancelInstance(id),
    onSuccess: () => {
      toast.success(t("workflows.cancelled"));
      queryClient.invalidateQueries({ queryKey: ["workflow-instances"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  return (
    <div className="space-y-4">
      <Tabs
        tabs={[
          { value: "definitions", label: t("workflows.title") },
          { value: "instances", label: t("workflows.instances") },
        ]}
        value="instances"
        onValueChange={(v) => v === "definitions" && navigate("/workflows")}
      />
      <ResourceList<WorkflowInstance>
        title={t("workflows.instances")}
        queryKey="workflow-instances"
        fetchPage={(page, size) => api.workflows.listInstances(page, size)}
        columns={[
          { key: "id", label: "ID", className: "font-mono text-xs", render: (r) => String(r.id).slice(0, 12) },
          { key: "workflow_name", label: t("workflows.title"), render: (r) => r.workflow_name ?? r.workflow_id ?? "—" },
          { key: "status", label: t("workflows.status"), render: (r) => <StatusBadge status={r.status} /> },
          { key: "current_step", label: t("workflows.currentStep"), className: "text-muted-foreground" },
          { key: "started_at", label: t("workflows.startedAt"), render: (r) => formatDate(r.started_at ?? r.created_at) },
        ]}
        rowActions={(row) => (
          <>
            <Button variant="ghost" size="icon" onClick={() => setLogsFor(row)} aria-label={t("workflows.logs")}>
              <ScrollText />
            </Button>
            {(row.status === "running" || row.status === "pending") && (
              <Button variant="ghost" size="icon" onClick={() => cancel.mutate(row.id!)} aria-label={t("workflows.cancel")}>
                <Square className="text-destructive" />
              </Button>
            )}
          </>
        )}
      />
      {logsFor && <LogsDialog instance={logsFor} onClose={() => setLogsFor(null)} />}
    </div>
  );
}

function LogsDialog({ instance, onClose }: { instance: WorkflowInstance; onClose: () => void }) {
  const { t } = useT();
  const logs = useQuery({
    queryKey: ["workflow-logs", instance.id],
    queryFn: () => api.workflows.getStepLogs(instance.id!),
    retry: false,
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent onClose={onClose} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t("workflows.logs")} · #{String(instance.id).slice(0, 12)}
          </DialogTitle>
        </DialogHeader>
        {logs.isLoading ? (
          <PageLoading />
        ) : (
          <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
            {typeof logs.data === "string" ? logs.data : JSON.stringify(logs.data ?? {}, null, 2)}
          </pre>
        )}
      </DialogContent>
    </Dialog>
  );
}
