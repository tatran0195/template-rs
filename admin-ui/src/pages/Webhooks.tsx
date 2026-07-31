import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/resources";
import { ApiError } from "@/lib/api/client";
import type { Webhook } from "@/lib/api/types";
import { useT } from "@/i18n";
import { ResourceList } from "@/components/ResourceList";
import { FormDialog } from "@/components/FormDialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/misc";

export function Webhooks() {
  const { t } = useT();
  const [editing, setEditing] = useState<Webhook | "new" | null>(null);
  const [form, setForm] = useState({ name: "", url: "", events: "", secret: "", active: true });

  const openNew = () => {
    setForm({ name: "", url: "", events: "", secret: "", active: true });
    setEditing("new");
  };
  const openEdit = (row: Webhook) => {
    setForm({
      name: row.name ?? "",
      url: row.url,
      events: (row.events ?? []).join(", "),
      secret: row.secret ?? "",
      active: row.active ?? true,
    });
    setEditing(row);
  };

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name,
        url: form.url,
        events: form.events.split(",").map((s) => s.trim()).filter(Boolean),
        secret: form.secret || undefined,
        active: form.active,
      };
      return editing === "new" ? api.webhooks.create(body) : api.webhooks.update((editing as Webhook).id!, body);
    },
    onSuccess: () => {
      toast.success(t("common.saved"));
      setEditing(null);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  return (
    <>
      <ResourceList<Webhook>
        title={t("webhooks.title")}
        queryKey="webhooks"
        fetchPage={(page, size, search) => api.webhooks.list(page, size, { search })}
        searchPlaceholder={t("common.search")}
        columns={[
          { key: "name", label: t("common.name"), render: (r) => r.name ?? "—" },
          { key: "url", label: t("webhooks.url"), className: "max-w-xs truncate font-mono text-xs text-muted-foreground" },
          {
            key: "events",
            label: t("webhooks.events"),
            render: (r) => (
              <div className="flex max-w-xs flex-wrap gap-1">
                {(r.events ?? []).slice(0, 3).map((e) => (
                  <Badge key={e} variant="secondary">
                    {e}
                  </Badge>
                ))}
                {(r.events ?? []).length > 3 && <Badge variant="outline">+{(r.events ?? []).length - 3}</Badge>}
              </div>
            ),
          },
          {
            key: "active",
            label: t("webhooks.active"),
            render: (r) => <Switch checked={!!r.active} onCheckedChange={(v) => api.webhooks.update(r.id!, { active: v }).then(() => window.location.reload())} />,
          },
        ]}
        onCreate={openNew}
        createLabel={t("webhooks.new")}
        rowActions={(row) => (
          <Button variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label={t("common.edit")}>
            <Pencil />
          </Button>
        )}
        onDelete={(row) => api.webhooks.delete(row.id!)}
        onBatchDelete={(ids) => api.webhooks.batch({ action: "delete", ids })}
      />
      <FormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        title={editing === "new" ? t("webhooks.new") : t("common.edit")}
        description={editing === "new" ? t("webhooks.createWebhook") : undefined}
        loading={save.isPending}
        onSubmit={() => save.mutate()}
      >
        <Field label={t("common.name")}>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label={t("webhooks.url")} required>
          <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required placeholder="https://example.com/hook" />
        </Field>
        <Field label={t("webhooks.events")}>
          <Input value={form.events} onChange={(e) => setForm({ ...form, events: e.target.value })} placeholder="post.created, comment.created" />
        </Field>
        <Field label={t("webhooks.secret")}>
          <Input value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} />
        </Field>
        <Field label={t("webhooks.active")}>
          <div>
            <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
          </div>
        </Field>
      </FormDialog>
    </>
  );
}
