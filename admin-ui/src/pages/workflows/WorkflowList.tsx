import { useNavigate, Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Play } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/resources";
import { ApiError } from "@/lib/api/client";
import type { WorkflowDef } from "@/lib/api/types";
import { useT } from "@/i18n";
import { formatDate } from "@/lib/utils";
import { ResourceList } from "@/components/ResourceList";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";

export function WorkflowList() {
  const { t } = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const start = useMutation({
    mutationFn: (id: string | number) => api.workflows.start(id),
    onSuccess: () => {
      toast.success(t("workflows.started"));
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
        value="definitions"
        onValueChange={(v) => v === "instances" && navigate("/workflows/instances")}
      />
      <ResourceList<WorkflowDef>
        title={t("workflows.title")}
        queryKey="workflows"
        fetchPage={(page, size, search) => api.workflows.list(page, size, { search })}
        searchPlaceholder={t("common.search")}
        columns={[
          { key: "name", label: t("common.name"), className: "font-medium" },
          { key: "description", label: t("common.description"), className: "max-w-xs truncate text-muted-foreground" },
          { key: "status", label: t("common.status"), render: (r) => <StatusBadge status={r.status ?? "draft"} /> },
          { key: "updated_at", label: t("common.updatedAt"), render: (r) => formatDate(r.updated_at) },
        ]}
        onCreate={() => navigate("/workflows/editor")}
        createLabel={t("workflows.new")}
        rowActions={(row) => (
          <>
            <Button variant="ghost" size="icon" onClick={() => start.mutate(row.id!)} aria-label={t("workflows.start")}>
              <Play />
            </Button>
            <Link to={`/workflows/editor?id=${row.id}`}>
              <Button variant="ghost" size="icon" aria-label={t("common.edit")}>
                <Pencil />
              </Button>
            </Link>
          </>
        )}
        onDelete={(row) => api.workflows.delete(row.id!)}
      />
    </div>
  );
}
