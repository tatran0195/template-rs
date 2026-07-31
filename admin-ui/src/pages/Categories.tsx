import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/resources";
import { ApiError } from "@/lib/api/client";
import { useT } from "@/i18n";
import { formatDate } from "@/lib/utils";
import { ResourceList } from "@/components/ResourceList";
import { FormDialog } from "@/components/FormDialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TaxonomyItem {
  id?: number | string;
  name?: string;
  slug?: string;
  description?: string;
  created_at?: string;
  [k: string]: unknown;
}

interface TaxonomyResource {
  list: (page: number, size: number, extra?: Record<string, unknown>) => Promise<any>;
  create: (body: Record<string, unknown>) => Promise<unknown>;
  update: (id: string | number, body: Record<string, unknown>) => Promise<unknown>;
  delete: (id: string | number) => Promise<unknown>;
  batch: (body: { action: string; ids: (string | number)[] }) => Promise<unknown>;
}

/** Shared implementation for Categories & Tags (identical CRUD shape). */
function TaxonomyPage({
  titleKey,
  queryKey,
  resource,
}: {
  titleKey: string;
  queryKey: string;
  resource: TaxonomyResource;
}) {
  const { t } = useT();
  const [editing, setEditing] = useState<TaxonomyItem | "new" | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "" });

  const openNew = () => {
    setForm({ name: "", slug: "", description: "" });
    setEditing("new");
  };
  const openEdit = (row: TaxonomyItem) => {
    setForm({ name: row.name ?? "", slug: row.slug ?? "", description: row.description ?? "" });
    setEditing(row);
  };

  const save = useMutation({
    mutationFn: () =>
      editing === "new" ? resource.create(form) : resource.update((editing as TaxonomyItem).id!, form),
    onSuccess: () => {
      toast.success(t("common.saved"));
      setEditing(null);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  return (
    <>
      <ResourceList<TaxonomyItem>
        title={t(titleKey)}
        queryKey={queryKey}
        fetchPage={(page, size, search) => resource.list(page, size, { search })}
        searchPlaceholder={t("common.search")}
        columns={[
          { key: "name", label: t("common.name") },
          { key: "slug", label: t("common.slug"), className: "text-muted-foreground" },
          { key: "created_at", label: t("common.createdAt"), render: (r) => formatDate(r.created_at) },
        ]}
        onCreate={openNew}
        rowActions={(row) => (
          <Button variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label={t("common.edit")}>
            <Pencil />
          </Button>
        )}
        onDelete={(row) => resource.delete(row.id!)}
        onBatchDelete={(ids) => resource.batch({ action: "delete", ids })}
      />
      <FormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        title={editing === "new" ? `${t("common.create")} · ${t(titleKey)}` : t("common.edit")}
        loading={save.isPending}
        onSubmit={() => save.mutate()}
      >
        <Field label={t("common.name")} required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <Field label={t("common.slug")}>
          <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        </Field>
        <Field label={t("common.description")}>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
      </FormDialog>
    </>
  );
}

export function Categories() {
  return <TaxonomyPage titleKey="categories.title" queryKey="categories" resource={api.categories} />;
}

export function Tags() {
  return <TaxonomyPage titleKey="tags.title" queryKey="tags" resource={api.tags} />;
}
