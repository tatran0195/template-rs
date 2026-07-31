import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api/resources";
import { ApiError } from "@/lib/api/client";
import { useT } from "@/i18n";
import { formatDate, truncate } from "@/lib/utils";
import { ResourceList } from "@/components/ResourceList";
import { StatusBadge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";

interface CommentRow {
  id?: number | string;
  content?: string;
  author_name?: string;
  author?: { username?: string };
  post_id?: number | string;
  post_title?: string;
  status?: string;
  created_at?: string;
  [k: string]: unknown;
}

/** Comment moderation queue: status transitions + batch ops (recovered: /admin/comments). */
export function Comments() {
  const { t } = useT();
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string | number; status: string }) => api.comments.updateStatus(id, status),
    onSuccess: () => {
      toast.success(t("common.updated"));
      queryClient.invalidateQueries({ queryKey: ["comments"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  return (
    <ResourceList<CommentRow>
      title={t("comments.title")}
      queryKey="comments"
      fetchPage={(page, size, search) => api.comments.list(page, size, { search })}
      searchPlaceholder={t("common.search")}
      columns={[
        { key: "content", label: t("comments.contentCol"), render: (r) => truncate(r.content ?? "", 80) },
        { key: "author", label: t("comments.author"), render: (r) => r.author_name ?? r.author?.username ?? "—" },
        { key: "post_id", label: t("comments.post"), render: (r) => r.post_title ?? r.post_id ?? "—" },
        { key: "status", label: t("common.status"), render: (r) => <StatusBadge status={r.status} /> },
        { key: "created_at", label: t("common.createdAt"), render: (r) => formatDate(r.created_at) },
      ]}
      rowActions={(row) => (
        <Select
          value={row.status ?? "pending"}
          onChange={(e) => statusMutation.mutate({ id: row.id!, status: e.target.value })}
          className="h-8 w-28"
        >
          <option value="pending">{t("comments.pending")}</option>
          <option value="approved">{t("comments.approved")}</option>
          <option value="spam">{t("comments.spam")}</option>
        </Select>
      )}
      onDelete={(row) => api.comments.delete(row.id!)}
      onBatchDelete={(ids) => api.comments.batch({ action: "delete", ids })}
    />
  );
}
