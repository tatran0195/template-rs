import { useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, History, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/resources";
import { ApiError } from "@/lib/api/client";
import type { ContentType, FieldDef } from "@/lib/api/types";
import { useT } from "@/i18n";
import { formatDate, truncate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageLoading, Pagination, Skeleton } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function useContentType(singular?: string) {
  return useQuery({
    queryKey: ["content-types"],
    queryFn: async () => {
      const r = await api.contentTypes.list(1, 200);
      const items = (Array.isArray(r) ? r : (r.items ?? [])) as ContentType[];
      return items.find((c) => c.singular === singular) ?? null;
    },
    retry: false,
  });
}

/** Generic record list for any dynamic collection (/admin/cms/{singular}). */
export function CollectionList() {
  const { singular } = useParams();
  const { t } = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<any>(null);
  const [revisionsFor, setRevisionsFor] = useState<any>(null);

  const ct = useContentType(singular);
  const collection = useMemo(() => api.collection(singular!), [singular]);

  const list = useQuery({
    queryKey: ["cms", singular, page],
    queryFn: () => collection.getList(page, 20),
    retry: false,
  });

  const del = useMutation({
    mutationFn: (id: string | number) => collection.delete(id),
    onSuccess: () => {
      toast.success(t("contentTypes.itemDeleted"));
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: ["cms", singular] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  const fields = ct.data?.fields ?? [];
  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;

  const displayFields = fields.slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/content-types">
          <Button variant="outline" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">{ct.data?.plural ?? singular}</h1>
        <div className="flex-1" />
        <Button onClick={() => navigate(`/content-types/${singular}/new`)}>
          <Plus /> {t("contentTypes.newItem", { name: ct.data?.singular ?? singular ?? "" })}
        </Button>
      </div>

      {list.isLoading || ct.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-11" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title={t("common.noResults")} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              {displayFields.map((f) => (
                <TableHead key={f.name}>{f.label ?? f.name}</TableHead>
              ))}
              <TableHead>{t("common.updatedAt")}</TableHead>
              <TableHead className="w-28 text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row: any) => (
              <TableRow key={String(row.id)} className="cursor-pointer" onClick={() => navigate(`/content-types/${singular}/${row.id}/edit`)}>
                <TableCell className="font-mono text-xs text-muted-foreground">{String(row.id).slice(0, 8)}</TableCell>
                {displayFields.map((f) => (
                  <TableCell key={f.name}>
                    {f.field_type === "boolean" ? (
                      <StatusBadge status={row[f.name] ? "enabled" : "disabled"} />
                    ) : f.field_type === "enum" && !row[f.name] ? (
                      "—"
                    ) : (
                      truncate(String(row[f.name] ?? "—"), 40)
                    )}
                  </TableCell>
                ))}
                <TableCell className="text-muted-foreground">{formatDate(row.updated_at)}</TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setRevisionsFor(row)} aria-label={t("contentTypes.revisions")}>
                      <History />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/content-types/${singular}/${row.id}/edit`)} aria-label={t("common.edit")}>
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(row)} aria-label={t("common.delete")}>
                      <span className="sr-only">del</span>✕
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {total > 20 && <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={t("common.deleteConfirmTitle", { item: `#${deleting?.id}` })}
        description={t("common.deleteConfirmDesc")}
        loading={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting.id)}
      />

      {revisionsFor && (
        <RevisionsDialog singular={singular!} record={revisionsFor} onClose={() => setRevisionsFor(null)} />
      )}
    </div>
  );
}

/** Revision history with restore (recovered: /admin/cms/{name}/{id}/revisions). */
function RevisionsDialog({ singular, record, onClose }: { singular: string; record: any; onClose: () => void }) {
  const { t } = useT();
  const queryClient = useQueryClient();
  const collection = useMemo(() => api.collection(singular), [singular]);

  const revisions = useQuery({
    queryKey: ["cms-revisions", singular, record.id],
    queryFn: () => collection.listRevisions(record.id),
    retry: false,
  });

  const restore = useMutation({
    mutationFn: (rev: string | number) => collection.restoreRevision(record.id, rev),
    onSuccess: () => {
      toast.success(t("contentTypes.restored"));
      queryClient.invalidateQueries({ queryKey: ["cms", singular] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  const [diffPair, setDiffPair] = useState<[string | number, string | number] | null>(null);
  const diff = useQuery({
    queryKey: ["cms-diff", singular, record.id, diffPair],
    queryFn: () => diffPair ? collection.diffRevisions(record.id, diffPair[0], diffPair[1]) : Promise.resolve(null),
    enabled: !!diffPair,
    retry: false,
  });

  const items = revisions.data?.items ?? (Array.isArray(revisions.data) ? revisions.data : []);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent onClose={onClose} className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {t("contentTypes.revisions")} · #{record.id}
          </DialogTitle>
        </DialogHeader>
        {revisions.isLoading ? (
          <PageLoading />
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("common.noResults")}</p>
        ) : (
          <div className="space-y-2">
            {items.map((rev: any) => (
              <div key={String(rev.id ?? rev.revision)} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <div>
                  <span className="font-mono text-xs">rev {String(rev.revision ?? rev.id)}</span>
                  <span className="ml-2 text-muted-foreground">{formatDate(rev.created_at)}</span>
                  {rev.editor && <span className="ml-2 text-muted-foreground">· {rev.editor}</span>}
                </div>
                <Button size="sm" variant="outline" onClick={() => restore.mutate(rev.revision ?? rev.id)} disabled={restore.isPending}>
                  {t("contentTypes.restore")}
                </Button>
                {items.length > 1 && (
                  <Button size="sm" variant="ghost" onClick={() => setDiffPair([items[items.length - 2].revision ?? items[items.length - 2].id, rev.revision ?? rev.id])}>
                    Diff
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {diff.isLoading ? (
          <PageLoading />
        ) : diff.data ? (
          <div className="rounded-md border border-border p-3 text-sm">
            <h3 className="mb-2 text-sm font-medium">{t("contentTypes.diffResults")}</h3>
            {diff.data.changed && diff.data.changed.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-muted-foreground mb-1">Changed:</p>
                {diff.data.changed.map((c: any, i: number) => (
                  <div key={i} className="text-xs font-mono flex gap-2">
                    <span className="text-red-500 line-through">{String(c.before ?? "—")}</span>
                    <span>→</span>
                    <span className="text-green-600">{String(c.after ?? "—")}</span>
                    <span className="text-muted-foreground">({c.field})</span>
                  </div>
                ))}
              </div>
            )}
            {diff.data.added && diff.data.added.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-muted-foreground mb-1">Added:</p>
                {diff.data.added.map((a: string, i: number) => (
                  <span key={i} className="inline-block rounded bg-green-50 px-1.5 py-0.5 text-xs text-green-700 mr-1">+{a}</span>
                ))}
              </div>
            )}
            {diff.data.removed && diff.data.removed.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Removed:</p>
                {diff.data.removed.map((r: string, i: number) => (
                  <span key={i} className="inline-block rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700 mr-1">-{r}</span>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/* Visual diff display for revisions. */
function DiffView({ data }: { data: any }) {
  const { t } = useT();
  const added = (data?.added ?? []) as string[];
  const removed = (data?.removed ?? []) as string[];
  const changed = (data?.changed ?? []) as Array<{ field: string; before: unknown; after: unknown }>;
  return null; // embedded inline in RevisionsDialog; kept for future reuse
}
