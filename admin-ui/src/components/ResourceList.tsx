import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/i18n";
import { ApiError } from "@/lib/api/client";
import type { Paginated } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox, EmptyState, Pagination, Skeleton } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/ui/confirm";

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface ResourceListProps<T extends { id?: number | string }> {
  title: string;
  queryKey: string;
  /** fetch one page; receives search when searchable */
  fetchPage: (page: number, pageSize: number, search: string) => Promise<Paginated<T>>;
  columns: Column<T>[];
  searchPlaceholder?: string;
  /** render row actions (edit, delete are opt-in below) */
  rowActions?: (row: T, refresh: () => void) => ReactNode;
  onRowClick?: (row: T) => void;
  /** enable create button */
  createLabel?: string;
  onCreate?: () => void;
  /** enable single delete (with confirm) */
  onDelete?: (row: T) => Promise<unknown>;
  /** enable batch selection + batch delete */
  onBatchDelete?: (ids: (string | number)[]) => Promise<unknown>;
  headerExtra?: ReactNode;
  emptyIcon?: ReactNode;
  pageSize?: number;
}

export function ResourceList<T extends { id?: number | string }>(props: ResourceListProps<T>) {
  const { t } = useT();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [deleting, setDeleting] = useState<T | null>(null);
  const [batchConfirm, setBatchConfirm] = useState(false);
  const pageSize = props.pageSize ?? 20;

  const query = useQuery({
    queryKey: [props.queryKey, page, search],
    queryFn: () => props.fetchPage(page, pageSize, search),
    retry: false,
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const total = query.data?.total ?? items.length;

  const refresh = () => queryClient.invalidateQueries({ queryKey: [props.queryKey] });

  const deleteMutation = useMutation({
    mutationFn: async (row: T) => props.onDelete!(row),
    onSuccess: () => {
      toast.success(t("common.deleted"));
      setDeleting(null);
      refresh();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  const batchMutation = useMutation({
    mutationFn: async (ids: (string | number)[]) => props.onBatchDelete!(ids),
    onSuccess: () => {
      toast.success(t("common.deleted"));
      setSelected(new Set());
      setBatchConfirm(false);
      refresh();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  const allChecked = items.length > 0 && items.every((r) => selected.has(r.id!));
  const toggleAll = (v: boolean) => setSelected(v ? new Set(items.map((r) => r.id!)) : new Set());
  const toggleOne = (id: string | number, v: boolean) => {
    const next = new Set(selected);
    if (v) next.add(id);
    else next.delete(id);
    setSelected(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">{props.title}</h1>
        <div className="flex-1" />
        {props.searchPlaceholder !== undefined && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-56 pl-8"
              placeholder={props.searchPlaceholder || t("common.search")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        )}
        {props.headerExtra}
        <Button variant="outline" size="icon" onClick={refresh} aria-label={t("common.refresh")}>
          <RefreshCw className={query.isFetching ? "animate-spin" : ""} />
        </Button>
        {props.onCreate && (
          <Button onClick={props.onCreate}>
            <Plus /> {props.createLabel ?? t("common.create")}
          </Button>
        )}
      </div>

      {selected.size > 0 && props.onBatchDelete && (
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
          <span>{t("common.selected", { count: selected.size })}</span>
          <Button variant="destructive" size="sm" onClick={() => setBatchConfirm(true)}>
            <Trash2 /> {t("common.batchDelete")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            {t("common.cancel")}
          </Button>
        </div>
      )}

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-11" />
          ))}
        </div>
      ) : query.isError ? (
        <EmptyState
          title={t("common.failed")}
          description={query.error instanceof ApiError ? `${query.error.message} (${query.error.status})` : String(query.error)}
          action={<Button onClick={refresh}>{t("common.refresh")}</Button>}
        />
      ) : items.length === 0 ? (
        <EmptyState icon={props.emptyIcon} title={t("common.noResults")} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {props.onBatchDelete && (
                <TableHead className="w-8">
                  <Checkbox checked={allChecked} onCheckedChange={toggleAll} />
                </TableHead>
              )}
              {props.columns.map((c) => (
                <TableHead key={c.key} className={c.className}>
                  {c.label}
                </TableHead>
              ))}
              {(props.rowActions || props.onDelete) && <TableHead className="w-24 text-right">{t("common.actions")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => (
              <TableRow
                key={String(row.id)}
                data-state={selected.has(row.id!) ? "selected" : undefined}
                className={props.onRowClick ? "cursor-pointer" : undefined}
                onClick={() => props.onRowClick?.(row)}
              >
                {props.onBatchDelete && (
                  <TableCell>
                    <Checkbox checked={selected.has(row.id!)} onCheckedChange={(v) => toggleOne(row.id!, v)} />
                  </TableCell>
                )}
                {props.columns.map((c) => (
                  <TableCell key={c.key} className={c.className}>
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "—")}
                  </TableCell>
                ))}
                {(props.rowActions || props.onDelete) && (
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {props.rowActions?.(row, refresh)}
                      {props.onDelete && (
                        <Button variant="ghost" size="icon" onClick={() => setDeleting(row)} aria-label={t("common.delete")}>
                          <Trash2 className="text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {total > pageSize && <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={t("common.deleteConfirmTitle", { item: props.title })}
        description={t("common.deleteConfirmDesc")}
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
      />
      <ConfirmDialog
        open={batchConfirm}
        onOpenChange={setBatchConfirm}
        title={t("common.deleteConfirmTitle", { item: `${selected.size}` })}
        description={t("common.deleteConfirmDesc")}
        loading={batchMutation.isPending}
        onConfirm={() => batchMutation.mutate([...selected])}
      />
    </div>
  );
}
