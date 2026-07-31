import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api/resources";
import type { Page } from "@/lib/api/types";
import { useT } from "@/i18n";
import { formatDate } from "@/lib/utils";
import { ResourceList } from "@/components/ResourceList";
import { StatusBadge } from "@/components/ui/badge";

export function PageList() {
  const { t } = useT();
  const navigate = useNavigate();

  return (
    <ResourceList<Page>
      title={t("pages.title")}
      queryKey="pages"
      fetchPage={(page, size, search) => api.pages.list(page, size, { search })}
      searchPlaceholder={t("common.search")}
      columns={[
        { key: "title", label: t("posts.postTitle"), className: "font-medium" },
        { key: "slug", label: t("common.slug"), className: "font-mono text-xs text-muted-foreground" },
        { key: "status", label: t("common.status"), render: (r) => <StatusBadge status={r.status} /> },
        { key: "sort_order", label: t("pages.sortOrder"), className: "text-muted-foreground" },
        { key: "updated_at", label: t("common.updatedAt"), render: (r) => formatDate(r.updated_at) },
      ]}
      onCreate={() => navigate("/pages/new")}
      createLabel={t("pages.new")}
      onRowClick={(row) => navigate(`/pages/${row.id}/edit`)}
      onDelete={(row) => api.pages.delete(row.id!)}
      onBatchDelete={(ids) => api.pages.batch({ action: "delete", ids })}
    />
  );
}
