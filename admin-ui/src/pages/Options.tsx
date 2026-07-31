import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/resources";
import { ApiError } from "@/lib/api/client";
import type { OptionEntry } from "@/lib/api/types";
import { useT } from "@/i18n";
import { truncate } from "@/lib/utils";
import { ResourceList } from "@/components/ResourceList";
import { FormDialog } from "@/components/FormDialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/** Key-value site options (recovered: /admin/options, set by key). */
export function Options() {
  const { t } = useT();
  const [editing, setEditing] = useState<OptionEntry | "new" | null>(null);
  const [form, setForm] = useState({ key: "", value: "" });
  const [refreshKey, setRefreshKey] = useState(0);

  const openNew = () => {
    setForm({ key: "", value: "" });
    setEditing("new");
  };
  const openEdit = (row: OptionEntry) => {
    setForm({ key: row.key, value: typeof row.value === "string" ? row.value : JSON.stringify(row.value ?? "", null, 2) });
    setEditing(row);
  };

  const save = useMutation({
    mutationFn: () => {
      let value: unknown = form.value;
      try {
        value = JSON.parse(form.value);
      } catch {
        /* plain string */
      }
      return api.options.set(form.key, value);
    },
    onSuccess: () => {
      toast.success(t("common.saved"));
      setEditing(null);
      setRefreshKey((v) => v + 1);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  return (
    <div key={refreshKey}>
      <ResourceList<OptionEntry>
        title={t("options.title")}
        queryKey="options"
        fetchPage={(page, size, search) => api.options.list(page, size, { search })}
        searchPlaceholder={t("common.search")}
        columns={[
          { key: "key", label: t("options.key"), className: "font-mono text-xs" },
          {
            key: "value",
            label: t("options.value"),
            render: (r) => (
              <code className="text-xs text-muted-foreground">
                {truncate(typeof r.value === "string" ? r.value : JSON.stringify(r.value), 80)}
              </code>
            ),
          },
          { key: "group", label: t("options.group"), render: (r) => (r.group ? <Badge variant="secondary">{r.group}</Badge> : "—") },
        ]}
        onCreate={openNew}
        createLabel={t("options.set")}
        rowActions={(row) => (
          <Button variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label={t("common.edit")}>
            <Pencil />
          </Button>
        )}
        onDelete={(row) => api.options.delete(row.key)}
      />
      <FormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        title={t("options.set")}
        loading={save.isPending}
        onSubmit={() => save.mutate()}
      >
        <Field label={t("options.key")} required>
          <Input
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
            required
            disabled={editing !== "new"}
            className="font-mono"
          />
        </Field>
        <Field label={t("options.value")} hint="JSON or plain string">
          <Textarea value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="min-h-28 font-mono text-xs" />
        </Field>
      </FormDialog>
    </div>
  );
}
