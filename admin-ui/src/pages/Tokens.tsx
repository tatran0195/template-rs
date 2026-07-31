import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/resources";
import { ApiError } from "@/lib/api/client";
import type { ApiToken } from "@/lib/api/types";
import { useT } from "@/i18n";
import { formatDate } from "@/lib/utils";
import { ResourceList } from "@/components/ResourceList";
import { FormDialog } from "@/components/FormDialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function Tokens() {
  const { t } = useT();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", permissions: "", expires_at: "" });
  const [created, setCreated] = useState<ApiToken | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const create = useMutation({
    mutationFn: () =>
      api.tokens.create({
        name: form.name,
        permissions: form.permissions ? form.permissions.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        expires_at: form.expires_at || undefined,
      }),
    onSuccess: (token) => {
      setCreating(false);
      setCreated(token);
      setRefreshKey((v) => v + 1);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(t("common.copied")));
  };

  return (
    <div key={refreshKey}>
      <ResourceList<ApiToken>
        title={t("tokens.title")}
        queryKey="tokens"
        fetchPage={(page, size) => api.tokens.list(page, size)}
        columns={[
          { key: "name", label: t("tokens.name") },
          { key: "token_prefix", label: t("tokens.prefix"), render: (r) => <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.token_prefix ?? "—"}…</code> },
          { key: "last_used_at", label: t("tokens.lastUsed"), render: (r) => formatDate(r.last_used_at) },
          { key: "expires_at", label: t("tokens.expiresAt"), render: (r) => formatDate(r.expires_at) },
          { key: "created_at", label: t("common.createdAt"), render: (r) => formatDate(r.created_at) },
        ]}
        onCreate={() => setCreating(true)}
        createLabel={t("tokens.new")}
        onDelete={(row) => api.tokens.delete(row.id!)}
      />

      <FormDialog
        open={creating}
        onOpenChange={setCreating}
        title={t("tokens.new")}
        loading={create.isPending}
        onSubmit={() => create.mutate()}
      >
        <Field label={t("tokens.name")} required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <Field label={t("tokens.permissions")}>
          <Input value={form.permissions} onChange={(e) => setForm({ ...form, permissions: e.target.value })} placeholder="posts:read, posts:write" />
        </Field>
        <Field label={t("tokens.expiresAt")}>
          <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
        </Field>
      </FormDialog>

      {/* token is shown exactly once */}
      <Dialog open={!!created} onOpenChange={(v) => !v && setCreated(null)}>
        <DialogContent onClose={() => setCreated(null)}>
          <DialogHeader>
            <DialogTitle>{t("tokens.createdTitle")}</DialogTitle>
            <DialogDescription>{t("tokens.createdDesc")}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 font-mono text-xs">
              {created?.token ?? ""}
            </code>
            <Button variant="outline" size="icon" onClick={() => created?.token && copy(created.token)}>
              <Copy />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
