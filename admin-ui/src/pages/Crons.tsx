import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/resources";
import { ApiError } from "@/lib/api/client";
import type { CronJob } from "@/lib/api/types";
import { useT } from "@/i18n";
import { formatDate, truncate } from "@/lib/utils";
import { ResourceList } from "@/components/ResourceList";
import { FormDialog } from "@/components/FormDialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch, Pagination, PageLoading } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function Crons() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CronJob | "new" | null>(null);
  const [form, setForm] = useState({ name: "", schedule: "", command: "", enabled: true });

  const toggle = useMutation({
    mutationFn: (id: string | number) => api.crons.toggle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crons"] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  const openNew = () => {
    setForm({ name: "", schedule: "0 * * * *", command: "", enabled: true });
    setEditing("new");
  };
  const openEdit = (row: CronJob) => {
    setForm({ name: row.name, schedule: row.schedule, command: row.command ?? row.task ?? "", enabled: row.enabled ?? true });
    setEditing(row);
  };

  const save = useMutation({
    mutationFn: () =>
      editing === "new" ? api.crons.create(form as Partial<CronJob>) : api.crons.update((editing as CronJob).id!, form as Partial<CronJob>),
    onSuccess: () => {
      toast.success(t("common.saved"));
      setEditing(null);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  return (
    <>
      <ResourceList<CronJob>
        title={t("cron.title")}
        queryKey="crons"
        fetchPage={(page, size, search) => api.crons.list(page, size, { search })}
        searchPlaceholder={t("common.search")}
        columns={[
          { key: "name", label: t("common.name") },
          { key: "schedule", label: t("cron.schedule"), className: "font-mono text-xs" },
          {
            key: "enabled",
            label: t("common.status"),
            render: (r) => <Switch checked={!!r.enabled} onCheckedChange={() => toggle.mutate(r.id!)} />,
          },
          { key: "last_run_at", label: t("cron.lastRun"), render: (r) => formatDate(r.last_run_at) },
          { key: "next_run_at", label: t("cron.nextRun"), render: (r) => formatDate(r.next_run_at) },
        ]}
        onCreate={openNew}
        createLabel={t("cron.newJob")}
        onRowClick={(row) => (window.location.href = `/crons/${row.id}`)}
        rowActions={(row) => (
          <Button variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label={t("common.edit")}>
            <Pencil />
          </Button>
        )}
        onDelete={(row) => api.crons.delete(row.id!)}
        onBatchDelete={(ids) => api.crons.batch({ action: "delete", ids })}
      />
      <FormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        title={editing === "new" ? t("cron.newJob") : t("common.edit")}
        loading={save.isPending}
        onSubmit={() => save.mutate()}
      >
        <Field label={t("common.name")} required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <Field label={t("cron.schedule")} hint="* * * * *" required>
          <Input value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} required className="font-mono" />
        </Field>
        <Field label={t("cron.command")}>
          <Input value={form.command} onChange={(e) => setForm({ ...form, command: e.target.value })} className="font-mono" />
        </Field>
        <Field label={t("common.enabled")}>
          <div>
            <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
          </div>
        </Field>
      </FormDialog>
    </>
  );
}

/** Cron detail: job info + run logs with cleanup (recovered: /admin/crons/logs). */
export function CronDetail() {
  const { id } = useParams();
  const { t } = useT();
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const job = useQuery({ queryKey: ["crons", id], queryFn: () => api.crons.get(id!), retry: false });
  const logs = useQuery({
    queryKey: ["cron-logs", id, page],
    queryFn: () => api.crons.listLogs(page, 20, { cron_id: id }),
    retry: false,
  });

  const cleanup = useMutation({
    mutationFn: () => api.crons.cleanupLogs({ cron_id: id }),
    onSuccess: () => {
      toast.success(t("common.deleted"));
      queryClient.invalidateQueries({ queryKey: ["cron-logs"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  if (job.isLoading) return <PageLoading />;
  const j = job.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/crons">
          <Button variant="outline" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">{j?.name ?? t("cron.title")}</h1>
        <div className="flex-1" />
        <Button variant="outline" onClick={() => cleanup.mutate()} disabled={cleanup.isPending}>
          <Trash2 /> {t("cron.cleanup")}
        </Button>
      </div>

      {j && (
        <Card>
          <CardContent className="grid grid-cols-2 gap-3 p-4 text-sm md:grid-cols-4">
            <div>
              <div className="text-xs text-muted-foreground">{t("cron.schedule")}</div>
              <div className="font-mono">{j.schedule}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("common.status")}</div>
              <StatusBadge status={j.enabled ? "enabled" : "disabled"} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("cron.lastRun")}</div>
              {formatDate(j.last_run_at)}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("cron.nextRun")}</div>
              {formatDate(j.next_run_at)}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("cron.logs")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("common.detail")}</TableHead>
                <TableHead>{t("audit.time")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(logs.data?.items ?? []).map((log: Record<string, any>, i: number) => (
                <TableRow key={log.id ?? i}>
                  <TableCell>
                    <StatusBadge status={log.status ?? (log.error ? "failed" : "success")} />
                  </TableCell>
                  <TableCell className="max-w-md">
                    <span className="font-mono text-xs">{truncate(log.output ?? log.message ?? log.error ?? JSON.stringify(log), 120)}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(log.created_at ?? log.started_at)}</TableCell>
                </TableRow>
              ))}
              {(logs.data?.items ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    {t("common.noResults")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {(logs.data?.total ?? 0) > 20 && (
        <Pagination page={page} pageSize={20} total={logs.data!.total} onPageChange={setPage} />
      )}
    </div>
  );
}
