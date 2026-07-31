import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/resources";
import { ApiError } from "@/lib/api/client";
import type { FieldDef } from "@/lib/api/types";
import { useT } from "@/i18n";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/misc";

/** Field-type palette recovered from the bundle's `builder.*` namespace. */
const FIELD_TYPES = [
  "text", "textarea", "richtext", "number", "integer", "float", "decimal", "bigint",
  "boolean", "date", "datetime", "enum", "json", "media", "image", "file",
  "relation", "email", "url", "password", "slug",
];

/** Visual schema builder → POST /admin/content-types {name, singular, plural, fields[]}. */
export function ContentTypeBuilder() {
  const { t } = useT();
  const navigate = useNavigate();
  const [meta, setMeta] = useState({ name: "", singular: "", plural: "", description: "", private: false, immutable: false, indexes: "", protocols: "", rules: "" });
  const [fields, setFields] = useState<FieldDef[]>([]);

  const save = useMutation({
    mutationFn: () =>
      api.contentTypes.create({
        name: meta.name || slugify(meta.plural),
        singular: meta.singular,
        plural: meta.plural,
        description: meta.description,
        private: meta.private || undefined,
        immutable: meta.immutable || undefined,
        indexes: meta.indexes ? meta.indexes.split(",").map((s) => s.trim()) : undefined,
        protocols: meta.protocols ? meta.protocols.split(",").map((s) => s.trim()) : undefined,
        rules: meta.rules ? (() => { try { return JSON.parse(meta.rules); } catch { return meta.rules; } })() : undefined,
        fields: fields.map((f) => ({
          ...f,
          options: f.options?.length ? f.options : undefined,
          relation: f.relation || undefined,
          default: f.default !== undefined ? f.default : undefined,
          description: f.description || undefined,
          max_length: f.max_length || undefined,
          min: f.min || undefined,
          max: f.max || undefined,
        })),
      }),
    onSuccess: () => {
      toast.success(t("common.created"));
      navigate("/content-types");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  const addField = () => setFields([...fields, { name: "", field_type: "text", required: false, unique: false }]);
  const updateField = (i: number, patch: Partial<FieldDef>) => setFields(fields.map((f, fi) => (fi === i ? { ...f, ...patch } : f)));
  const moveField = (i: number, dir: -1 | 1) => {
    const next = [...fields];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setFields(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/content-types">
          <Button variant="outline" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">{t("contentTypes.newType")}</h1>
        <div className="flex-1" />
        <Button onClick={() => save.mutate()} disabled={save.isPending || !meta.singular || fields.length === 0}>
          <Save /> {t("common.save")}
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
          <Field label={t("contentTypes.singular")} required>
            <Input
              value={meta.singular}
              onChange={(e) => {
                const singular = slugify(e.target.value);
                setMeta((m) => ({ ...m, singular, name: m.name || singular + "s" }));
              }}
              placeholder="product"
              className="font-mono"
            />
          </Field>
          <Field label={t("contentTypes.plural")} required>
            <Input value={meta.plural} onChange={(e) => setMeta({ ...meta, plural: e.target.value })} placeholder="Products" />
          </Field>
          <Field label={t("contentTypes.table")}>
            <Input value={meta.name} onChange={(e) => setMeta({ ...meta, name: slugify(e.target.value) })} placeholder="products" className="font-mono" />
          </Field>
          <Field label={t("common.description")}>
            <Input value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
          </Field>
          <label className="flex items-center gap-1.5 text-sm">
            <Checkbox checked={!!meta.private} onCheckedChange={(v) => setMeta({ ...meta, private: v })} />
            <span className="text-xs text-muted-foreground">Private (hidden from public CMS)</span>
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <Checkbox checked={!!meta.immutable} onCheckedChange={(v) => setMeta({ ...meta, immutable: v })} />
            <span className="text-xs text-muted-foreground">Immutable (fields cannot be changed after creation)</span>
          </label>
          <Field label="Indexes (comma-separated fields)">
            <Input value={meta.indexes} onChange={(e) => setMeta({ ...meta, indexes: e.target.value })} placeholder="title,status" className="font-mono text-xs" />
          </Field>
          <Field label="Protocols">
            <Input value={meta.protocols} onChange={(e) => setMeta({ ...meta, protocols: e.target.value })} placeholder="http,https" className="font-mono text-xs" />
          </Field>
          <Field label="Rules (JSON)">
            <textarea
              value={meta.rules}
              onChange={(e) => setMeta({ ...meta, rules: e.target.value })}
              placeholder='{"min_length": 3, "pattern": "[a-z]+"}'
              className="w-full min-h-16 rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 dark:bg-input/30"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">{t("contentTypes.fields")}</CardTitle>
          <Button size="sm" variant="outline" onClick={addField}>
            <Plus /> {t("contentTypes.addField")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t("contentTypes.noFields")}</p>}
          {fields.map((field, i) => (
            <div key={i} className="space-y-2 rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={field.name}
                  onChange={(e) => updateField(i, { name: slugify(e.target.value).replace(/-/g, "_") })}
                  placeholder={t("contentTypes.fieldName")}
                  className="w-40 font-mono"
                />
                <Select value={field.field_type} onChange={(e) => updateField(i, { field_type: e.target.value })} className="w-36">
                  {FIELD_TYPES.map((ft) => (
                    <option key={ft} value={ft}>
                      {ft}
                    </option>
                  ))}
                </Select>
                <Input
                  value={field.label ?? ""}
                  onChange={(e) => updateField(i, { label: e.target.value })}
                  placeholder={t("contentTypes.fieldLabel")}
                  className="w-36"
                />
                <label className="flex items-center gap-1.5 text-sm">
                  <Checkbox checked={!!field.required} onCheckedChange={(v) => updateField(i, { required: v })} />
                  {t("contentTypes.required")}
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <Checkbox checked={!!field.unique} onCheckedChange={(v) => updateField(i, { unique: v })} />
                  {t("contentTypes.unique")}
                </label>
                <div className="flex-1" />
                <Button variant="ghost" size="icon" onClick={() => moveField(i, -1)} disabled={i === 0}>
                  <ArrowUp />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => moveField(i, 1)} disabled={i === fields.length - 1}>
                  <ArrowDown />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setFields(fields.filter((_, fi) => fi !== i))}>
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
              {field.field_type === "enum" && (
                <Input
                  value={(field.options ?? []).join(", ")}
                  onChange={(e) => updateField(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  placeholder={t("contentTypes.options")}
                />
              )}
              {field.field_type === "relation" && (
                <Input
                  value={field.relation ?? ""}
                  onChange={(e) => updateField(i, { relation: e.target.value })}
                  placeholder={t("contentTypes.relation")}
                  className="font-mono"
                />
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <Input
                  value={String(field.default ?? "")}
                  onChange={(e) => updateField(i, { default: e.target.value || undefined })}
                  placeholder="default"
                  className="w-28 text-xs font-mono" />
                <Input
                  value={field.description ?? ""}
                  onChange={(e) => updateField(i, { description: e.target.value || undefined })}
                  placeholder="description"
                  className="w-32 text-xs" />
                {(field.field_type === "text" || field.field_type === "textarea" || field.field_type === "email" || field.field_type === "url" || field.field_type === "slug") && (
                  <Input
                    type="number"
                    value={field.max_length ?? ""}
                    onChange={(e) => updateField(i, { max_length: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="max_length"
                    className="w-20 text-xs" />
                )}
                {(field.field_type === "number" || field.field_type === "integer" || field.field_type === "float" || field.field_type === "decimal") && (
                  <>
                    <Input
                      type="number"
                      value={field.min ?? ""}
                      onChange={(e) => updateField(i, { min: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="min"
                      className="w-16 text-xs" />
                    <Input
                      type="number"
                      value={field.max ?? ""}
                      onChange={(e) => updateField(i, { max: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="max"
                      className="w-16 text-xs" />
                  </>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
