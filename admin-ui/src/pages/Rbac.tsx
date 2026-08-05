import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/resources";
import { ApiError } from "@/lib/api/client";
import type { RoleDef } from "@/lib/api/types";
import { useT } from "@/i18n";
import { ResourceList } from "@/components/ResourceList";
import { FormDialog } from "@/components/FormDialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/misc";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Resources/actions matrix. The backend accepts arbitrary permission strings
 * ("resource:action"); the matrix below mirrors the admin API surface. */
const RESOURCES = ["posts", "pages", "categories", "tags", "comments", "media", "users", "crons", "webhooks", "workflows", "options", "audit"];
const ACTIONS = ["read", "create", "update", "delete"];

export function Rbac() {
  const { t } = useT();
  const [editing, setEditing] = useState<RoleDef | "new" | null>(null);
  const [permRole, setPermRole] = useState<RoleDef | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const save = useMutation({
    mutationFn: () =>
      editing === "new" ? api.rbac.createRole(form) : api.rbac.updateRole((editing as RoleDef).id!, form),
    onSuccess: () => {
      toast.success(t("common.saved"));
      setEditing(null);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  return (
    <>
      <ResourceList<RoleDef>
        title={t("rbac.title")}
        queryKey="rbac-roles"
        fetchPage={async () => {
          const roles = await api.rbac.listRoles();
          const items = Array.isArray(roles) ? roles : ((roles as any)?.items ?? []);
          return { items, total: items.length, page: 1, page_size: items.length };
        }}
        columns={[
          { key: "name", label: t("rbac.roleName") },
          { key: "description", label: t("common.description"), className: "text-muted-foreground" },
          {
            key: "builtin",
            label: t("rbac.builtin"),
            render: (r) => (r.builtin ? <Badge variant="secondary">{t("common.yes")}</Badge> : "—"),
          },
        ]}
        onCreate={() => {
          setForm({ name: "", description: "" });
          setEditing("new");
        }}
        createLabel={t("rbac.newRole")}
        rowActions={(row) => (
          <>
            <Button variant="ghost" size="icon" onClick={() => setPermRole(row)} aria-label={t("rbac.permissions")}>
              <ShieldCheck />
            </Button>
            {!row.builtin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setForm({ name: row.name, description: row.description ?? "" });
                  setEditing(row);
                }}
                aria-label={t("common.edit")}
              >
                <Pencil />
              </Button>
            )}
          </>
        )}
        onDelete={(row) => api.rbac.deleteRole(row.id!)}
      />

      <FormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        title={editing === "new" ? t("rbac.newRole") : t("common.edit")}
        loading={save.isPending}
        onSubmit={() => save.mutate()}
      >
        <Field label={t("rbac.roleName")} required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <Field label={t("common.description")}>
          <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
      </FormDialog>

      {permRole && <PermissionMatrix role={permRole} onClose={() => setPermRole(null)} />}
    </>
  );
}

function PermissionMatrix({ role, onClose }: { role: RoleDef; onClose: () => void }) {
  const { t } = useT();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set(role.permissions ?? []));

  const perms = useQuery({
    queryKey: ["rbac-perms", role.id],
    queryFn: () => api.rbac.getPermissions(role.id!),
    retry: false,
  });

  useEffect(() => {
    if (Array.isArray(perms.data)) setSelected(new Set(perms.data));
  }, [perms.data]);

  const save = useMutation({
    mutationFn: () => api.rbac.setPermissions(role.id!, [...selected]),
    onSuccess: () => {
      toast.success(t("rbac.permissionsSaved"));
      queryClient.invalidateQueries({ queryKey: ["rbac-roles"] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  const toggle = (perm: string, v: boolean) => {
    const next = new Set(selected);
    if (v) next.add(perm);
    else next.delete(perm);
    setSelected(next);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent onClose={onClose} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t("rbac.permissions")} · {role.name}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4 font-medium">resource</th>
                {ACTIONS.map((a) => (
                  <th key={a} className="py-2 text-center font-medium">
                    {a}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RESOURCES.map((r) => (
                <tr key={r} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-xs">{r}</td>
                  {ACTIONS.map((a) => {
                    const perm = `${r}:${a}`;
                    return (
                      <td key={a} className="py-2 text-center">
                        <Checkbox checked={selected.has(perm)} onCheckedChange={(v) => toggle(perm, v)} className="mx-auto" />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
