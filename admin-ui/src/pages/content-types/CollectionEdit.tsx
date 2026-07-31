import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/resources";
import { ApiError } from "@/lib/api/client";
import type { ContentType, FieldDef } from "@/lib/api/types";
import { useT } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoading, Switch } from "@/components/ui/misc";

/** Auto-generated record form driven by the content type's field schema. */
export function CollectionEdit() {
  const { singular, id } = useParams();
  const isNew = !id || id === "new";
  const recordId = isNew ? null : id;
  const { t } = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const ct = useQuery({
    queryKey: ["content-types"],
    queryFn: async () => {
      const r = await api.contentTypes.list(1, 200);
      const items = (Array.isArray(r) ? r : (r.items ?? [])) as ContentType[];
      return items.find((c) => c.singular === singular) ?? null;
    },
    retry: false,
  });

  const collection = useMemo(() => api.collection(singular!), [singular]);

  const record = useQuery({
    queryKey: ["cms", singular, recordId],
    queryFn: () => collection.getOne(recordId!),
    enabled: !!recordId,
    retry: false,
  });

  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (record.data) setValues(record.data as Record<string, any>);
  }, [record.data]);

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, any> = {};
      for (const f of ct.data?.fields ?? []) body[f.name] = values[f.name];
      return recordId ? collection.update(recordId, body) : collection.create(body);
    },
    onSuccess: () => {
      toast.success(t("common.saved"));
      queryClient.invalidateQueries({ queryKey: ["cms", singular] });
      navigate(`/content-types/${singular}`);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  if (ct.isLoading || (!!recordId && record.isLoading)) return <PageLoading />;

  const set = (name: string, v: any) => setValues((s) => ({ ...s, [name]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to={`/content-types/${singular}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">
          {recordId ? t("contentTypes.editItem", { name: ct.data?.singular ?? singular ?? "" }) : t("contentTypes.newItem", { name: ct.data?.singular ?? singular ?? "" })}
        </h1>
        <div className="flex-1" />
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          <Save /> {t("common.save")}
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          {(ct.data?.fields ?? []).map((f) => (
            <FieldInput key={f.name} field={f} value={values[f.name]} onChange={(v) => set(f.name, v)} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: FieldDef; value: any; onChange: (v: any) => void }) {
  const { t } = useT();
  const label = field.label ?? field.name;
  const wide = ["textarea", "richtext", "markdown", "json"].includes(field.field_type);

  const control = (() => {
    switch (field.field_type) {
      case "boolean":
        return <Switch checked={!!value} onCheckedChange={onChange} />;
      case "textarea":
      case "richtext":
      case "markdown":
        return <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="min-h-32" />;
      case "json":
        return (
          <Textarea
            value={typeof value === "string" ? value : JSON.stringify(value ?? null, null, 2)}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                onChange(e.target.value);
              }
            }}
            className="min-h-32 font-mono text-xs"
          />
        );
      case "number":
      case "integer":
      case "float":
      case "decimal":
      case "bigint":
        return <Input type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />;
      case "date":
        return <Input type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
      case "datetime":
        return <Input type="datetime-local" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
      case "enum":
        return (
          <Select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
            <option value="">—</option>
            {(field.options ?? []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        );
      case "email":
        return <Input type="email" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
      case "url":
        return <Input type="url" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
      case "password":
        return <Input type="password" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
      case "relation":
        return <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={field.relation} className="font-mono" />;
      case "media":
      case "image":
      case "file":
        return <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="https://…" className="font-mono text-xs" />;
      default:
        return <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    }
  })();

  return (
    <Field label={label} required={field.required} className={wide ? "sm:col-span-2" : undefined} hint={field.description}>
      {control}
    </Field>
  );
}
