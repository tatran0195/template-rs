import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/resources";
import { ApiError } from "@/lib/api/client";
import type { User } from "@/lib/api/types";
import { useT } from "@/i18n";
import { formatDate } from "@/lib/utils";
import { ResourceList } from "@/components/ResourceList";
import { FormDialog } from "@/components/FormDialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";

export function Users() {
  const { t } = useT();
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "user" });

  const openNew = () => {
    setForm({ username: "", email: "", password: "", role: "user" });
    setEditing("new");
  };
  const openEdit = (row: User) => {
    setForm({ username: row.username ?? "", email: row.email ?? "", password: "", role: row.role ?? "user" });
    setEditing(row);
  };

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, string> = { username: form.username, email: form.email, role: form.role };
      if (form.password) body.password = form.password;
      return editing === "new" ? api.users.create(body as Partial<User>) : api.users.update((editing as User).id!, body as Partial<User>);
    },
    onSuccess: () => {
      toast.success(t("common.saved"));
      setEditing(null);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  return (
    <>
      <ResourceList<User>
        title={t("users.title")}
        queryKey="users"
        fetchPage={(page, size, search) => api.users.list(page, size, { search })}
        searchPlaceholder={t("common.search")}
        columns={[
          {
            key: "username",
            label: t("users.username"),
            render: (r) => (
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                  {(r.username ?? r.email ?? "?").slice(0, 1).toUpperCase()}
                </span>
                {r.username ?? "—"}
              </div>
            ),
          },
          { key: "email", label: t("users.email"), className: "text-muted-foreground" },
          {
            key: "role",
            label: t("users.role"),
            render: (r) => <Badge variant={r.role === "admin" ? "default" : r.role === "author" ? "info" : "secondary"}>{r.role ?? "user"}</Badge>,
          },
          { key: "created_at", label: t("common.createdAt"), render: (r) => formatDate(r.created_at) },
        ]}
        onCreate={openNew}
        createLabel={t("users.new")}
        rowActions={(row) => (
          <Button variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label={t("common.edit")}>
            <Pencil />
          </Button>
        )}
        onDelete={(row) => api.users.delete(row.id!)}
        onBatchDelete={(ids) => api.users.batch({ action: "delete", ids })}
      />
      <FormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        title={editing === "new" ? t("users.new") : t("common.edit")}
        loading={save.isPending}
        onSubmit={() => save.mutate()}
      >
        <Field label={t("users.username")} required>
          <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        </Field>
        <Field label={t("users.email")} required>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </Field>
        <Field label={t("users.password")} hint={editing === "new" ? undefined : t("profile.newPassword")}>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required={editing === "new"}
          />
        </Field>
        <Field label={t("users.role")}>
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="user">user</option>
            <option value="author">author</option>
            <option value="admin">admin</option>
          </Select>
        </Field>
      </FormDialog>
    </>
  );
}
