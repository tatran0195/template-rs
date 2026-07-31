import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/resources";
import type { Post } from "@/lib/api/types";
import { useT } from "@/i18n";
import { formatDate } from "@/lib/utils";
import { ResourceList } from "@/components/ResourceList";
import { StatusBadge } from "@/components/ui/badge";

export function PostList() {
  const { t } = useT();
  const navigate = useNavigate();

  const categories = useQuery({
    queryKey: ["categories", "all"],
    queryFn: () => api.categories.list(1, 200),
    retry: false,
  });
  const catName = (id?: number | string | null) =>
    categories.data?.items?.find((c: any) => String(c.id) === String(id))?.name ?? "—";

  return (
    <ResourceList<Post>
      title={t("posts.title")}
      queryKey="posts"
      fetchPage={(page, size, search) => api.posts.list(page, size, { search })}
      searchPlaceholder={t("posts.searchPlaceholder")}
      columns={[
        { key: "title", label: t("posts.postTitle"), className: "font-medium" },
        { key: "status", label: t("common.status"), render: (r) => <StatusBadge status={r.status} /> },
        { key: "category_id", label: t("posts.category"), render: (r) => catName(r.category_id) },
        { key: "updated_at", label: t("common.updatedAt"), render: (r) => formatDate(r.updated_at) },
      ]}
      onCreate={() => navigate("/posts/new")}
      createLabel={t("posts.new")}
      onRowClick={(row) => navigate(`/posts/${row.id}/edit`)}
      onDelete={(row) => api.posts.delete(row.id!)}
      onBatchDelete={(ids) => api.posts.batch({ action: "delete", ids })}
    />
  );
}
