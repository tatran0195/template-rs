import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/resources";
import { ApiError } from "@/lib/api/client";
import { useT } from "@/i18n";
import { ResourceList } from "@/components/ResourceList";
import { FormDialog } from "@/components/FormDialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BlockRow {
  id?: number | string;
  name?: string;
  key?: string;
  type?: string;
  content?: unknown;
  [k: string]: unknown;
}

/** Reusable content blocks (used by the page builder). */
export function ReusableBlocks() {
  const { t } = useT();
  const [editing, setEditing] = useState<BlockRow | "new" | null>(null);
  const [form, setForm] = useState({ name: "", key: "", type: "richtext", content: "{}" });

  const openNew = () => {
    setForm({ name: "", key: "", type: "richtext", content: "{}" });
    setEditing("new");
  };
  const openEdit = (row: BlockRow) => {
    setForm({
      name: row.name ?? "",
      key: row.key ?? "",
      type: row.type ?? "richtext",
      content: typeof row.content === "string" ? row.content : JSON.stringify(row.content ?? {}, null, 2),
    });
    setEditing(row);
  };

  const save = useMutation({
    mutationFn: () => {
      let content: unknown = form.content;
      try {
        content = JSON.parse(form.content);
      } catch {
        /* keep string */
      }
      const body = { name: form.name, key: form.key, type: form.type, content };
      return editing === "new" ? api.reusableBlocks.create(body) : api.reusableBlocks.update((editing as BlockRow).id!, body);
    },
    onSuccess: () => {
      toast.success(t("common.saved"));
      setEditing(null);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  return (
    <>
      <ResourceList<BlockRow>
        title={t("reusableBlocks.title")}
        queryKey="reusable-blocks"
        fetchPage={(page, size, search) => api.reusableBlocks.list(page, size, { search })}
        searchPlaceholder={t("common.search")}
        columns={[
          { key: "name", label: t("common.name") },
          { key: "key", label: t("reusableBlocks.key"), className: "font-mono text-xs text-muted-foreground" },
          { key: "type", label: t("reusableBlocks.type"), render: (r) => <Badge variant="secondary">{r.type ?? "—"}</Badge> },
        ]}
        onCreate={openNew}
        rowActions={(row) => (
          <Button variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label={t("common.edit")}>
            <Pencil />
          </Button>
        )}
        onDelete={(row) => api.reusableBlocks.delete(row.id!)}
        onBatchDelete={(ids) => api.reusableBlocks.batch({ action: "delete", ids })}
      />
      <FormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        title={editing === "new" ? `${t("common.create")} · ${t("reusableBlocks.title")}` : t("common.edit")}
        loading={save.isPending}
        onSubmit={() => save.mutate()}
        wide
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("common.name")} required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label={t("reusableBlocks.key")} required>
            <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} required className="font-mono" />
          </Field>
        </div>
        <Field label={t("reusableBlocks.type")}>
          <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
        </Field>
        <Field label={t("reusableBlocks.content")}>
          <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="min-h-40 font-mono text-xs" />
        </Field>
      </FormDialog>
    </>
  );
}
